-- =====================================================================
-- Taote Fenua — schéma de la base de données (Supabase / PostgreSQL)
-- À coller dans Supabase > SQL Editor, puis « Run ».
-- Le script peut être relancé sans erreur (idempotent).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. Établissements : cabinets, pharmacies, dispensaires…
-- ---------------------------------------------------------------------
create table if not exists public.etablissements (
  id            uuid primary key default gen_random_uuid(),
  nom           text not null,
  type          text not null check (type in (
                  'medecin','pharmacie','dentiste','kine','infirmier',
                  'sage_femme','dispensaire','clinique','autre')),
  specialite    text,                       -- ex. « Médecin généraliste »
  ile           text not null default 'Tahiti',
  commune       text not null,
  pk            text,                       -- point kilométrique, ex. « 18,5 »
  cote          text check (cote in ('mer','montagne')),
  repere        text,                       -- « en face de … »
  adresse       text,                       -- adresse libre (centre commercial…)
  lat           double precision,
  lng           double precision,
  tel_fixe      text,
  tel_mobile    text,
  mode_accueil  text not null default 'mixte'
                check (mode_accueil in ('sans_rdv','sur_rdv','mixte')),
  -- horaires : {"lun":[["07:00","12:00"],["14:00","18:00"]], …, "dim":[]}
  horaires      jsonb not null default '{}'::jsonb,
  infos         text,                       -- parking, accès fauteuil…
  actif         boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists etablissements_commune_idx on public.etablissements (ile, commune);
create index if not exists etablissements_type_idx    on public.etablissements (type);

-- ---------------------------------------------------------------------
-- 2. Statut en direct (une ligne par établissement)
-- ---------------------------------------------------------------------
create table if not exists public.statuts (
  etablissement_id    uuid primary key references public.etablissements(id) on delete cascade,
  niveau              text not null default 'peu'
                      check (niveau in ('peu','beaucoup','complet','ferme')),
  attente_min         integer check (attente_min between 0 and 600),
  personnes           integer check (personnes between 0 and 200),
  sans_rdv_aujourdhui boolean not null default true,
  maj_le              timestamptz not null default now(),
  maj_par             uuid
);

-- ---------------------------------------------------------------------
-- 3. Comptes : qui gère quel établissement, et qui est administrateur
--    (les comptes eux-mêmes sont dans auth.users, gérés par Supabase)
-- ---------------------------------------------------------------------
create table if not exists public.membres (
  user_id          uuid not null references auth.users(id) on delete cascade,
  etablissement_id uuid not null references public.etablissements(id) on delete cascade,
  created_at       timestamptz not null default now(),
  primary key (user_id, etablissement_id)
);

create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. Gardes (médecins et pharmacies) — saisies par l'administrateur
-- ---------------------------------------------------------------------
create table if not exists public.gardes (
  id               uuid primary key default gen_random_uuid(),
  type             text not null check (type in ('medecin','pharmacie')),
  secteur          text not null,           -- « Papeete · Faa'a · Punaauia », « Moorea »…
  ile              text not null default 'Tahiti',
  nom              text not null,           -- « Dr … » ou « Pharmacie … »
  etablissement_id uuid references public.etablissements(id) on delete set null,
  adresse          text,
  tel              text,
  lat              double precision,
  lng              double precision,
  debut            timestamptz not null,
  fin              timestamptz not null,
  horaires_texte   text,                    -- « sam. 12–22 h · dim. 6–22 h »
  source           text,                    -- « Ordre des médecins, semaine 41 »
  created_at       timestamptz not null default now(),
  check (fin > debut)
);

create index if not exists gardes_periode_idx on public.gardes (type, fin);

-- ---------------------------------------------------------------------
-- 5. Signalements anonymes des patients (« combien de personnes attendent ? »)
-- ---------------------------------------------------------------------
create table if not exists public.signalements (
  id               bigint generated always as identity primary key,
  etablissement_id uuid not null references public.etablissements(id) on delete cascade,
  tranche          text not null check (tranche in ('0-3','4-8','9+')),
  created_at       timestamptz not null default now()
);

create index if not exists signalements_recent_idx on public.signalements (etablissement_id, created_at desc);

-- =====================================================================
-- Fonctions utilitaires
-- =====================================================================

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create or replace function public.is_member(etab uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.membres
    where user_id = auth.uid() and etablissement_id = etab
  );
$$;

-- Mise à jour automatique de updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists etablissements_touch on public.etablissements;
create trigger etablissements_touch before update on public.etablissements
  for each row execute function public.touch_updated_at();

-- Un professionnel ne peut pas changer le nom, le type ni l'activation
-- de sa fiche : seul l'administrateur le peut.
create or replace function public.protege_champs_admin()
returns trigger language plpgsql as $$
begin
  if not public.is_admin() and auth.uid() is not null then
    if new.nom is distinct from old.nom
       or new.type is distinct from old.type
       or new.actif is distinct from old.actif then
      raise exception 'Seul un administrateur peut modifier le nom, le type ou l''activation.';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists etablissements_protege on public.etablissements;
create trigger etablissements_protege before update on public.etablissements
  for each row execute function public.protege_champs_admin();

-- Horodatage et auteur du statut fixés par le serveur, pas par le téléphone
create or replace function public.statut_horodatage()
returns trigger language plpgsql as $$
begin
  new.maj_le  := now();
  new.maj_par := auth.uid();
  return new;
end $$;

drop trigger if exists statuts_horodatage on public.statuts;
create trigger statuts_horodatage before insert or update on public.statuts
  for each row execute function public.statut_horodatage();

-- Limite anti-abus : 1 signalement par établissement toutes les 30 s
-- (protection simple ; à renforcer si l'app devient très utilisée)
create or replace function public.signalement_limite()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (
    select 1 from public.signalements
    where etablissement_id = new.etablissement_id
      and created_at > now() - interval '30 seconds'
  ) then
    raise exception 'Merci, un signalement vient déjà d''être reçu. Réessayez dans un instant.';
  end if;
  return new;
end $$;

drop trigger if exists signalements_limite on public.signalements;
create trigger signalements_limite before insert on public.signalements
  for each row execute function public.signalement_limite();

-- =====================================================================
-- Sécurité : Row Level Security (RLS)
-- Tout le monde peut LIRE l'annuaire ; seuls les comptes autorisés ÉCRIVENT.
-- =====================================================================

alter table public.etablissements enable row level security;
alter table public.statuts        enable row level security;
alter table public.membres        enable row level security;
alter table public.admins         enable row level security;
alter table public.gardes         enable row level security;
alter table public.signalements   enable row level security;

-- Établissements
drop policy if exists "etab_lecture"  on public.etablissements;
drop policy if exists "etab_modif"    on public.etablissements;
drop policy if exists "etab_ajout"    on public.etablissements;
drop policy if exists "etab_suppr"    on public.etablissements;
create policy "etab_lecture" on public.etablissements for select
  using (actif or public.is_admin() or public.is_member(id));
create policy "etab_modif" on public.etablissements for update to authenticated
  using (public.is_member(id) or public.is_admin())
  with check (public.is_member(id) or public.is_admin());
create policy "etab_ajout" on public.etablissements for insert to authenticated
  with check (public.is_admin());
create policy "etab_suppr" on public.etablissements for delete to authenticated
  using (public.is_admin());

-- Statuts
drop policy if exists "statut_lecture" on public.statuts;
drop policy if exists "statut_ajout"   on public.statuts;
drop policy if exists "statut_modif"   on public.statuts;
create policy "statut_lecture" on public.statuts for select using (true);
create policy "statut_ajout" on public.statuts for insert to authenticated
  with check (public.is_member(etablissement_id) or public.is_admin());
create policy "statut_modif" on public.statuts for update to authenticated
  using (public.is_member(etablissement_id) or public.is_admin())
  with check (public.is_member(etablissement_id) or public.is_admin());

-- Membres : chacun voit ses propres liens ; l'admin gère tout
drop policy if exists "membres_lecture" on public.membres;
drop policy if exists "membres_admin"   on public.membres;
create policy "membres_lecture" on public.membres for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy "membres_admin" on public.membres for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Admins : lecture de sa propre ligne seulement ; aucun ajout via l'app
drop policy if exists "admins_lecture" on public.admins;
create policy "admins_lecture" on public.admins for select to authenticated
  using (user_id = auth.uid());

-- Gardes
drop policy if exists "gardes_lecture" on public.gardes;
drop policy if exists "gardes_admin"   on public.gardes;
create policy "gardes_lecture" on public.gardes for select using (true);
create policy "gardes_admin" on public.gardes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Signalements : n'importe qui peut en envoyer ; on ne lit que les 2 dernières heures
drop policy if exists "signal_ajout"   on public.signalements;
drop policy if exists "signal_lecture" on public.signalements;
create policy "signal_ajout" on public.signalements for insert to anon, authenticated
  with check (true);
create policy "signal_lecture" on public.signalements for select
  using (created_at > now() - interval '2 hours');

-- Droits de base pour les rôles de l'API Supabase
grant usage on schema public to anon, authenticated;
grant select on public.etablissements, public.statuts, public.gardes, public.signalements to anon, authenticated;
grant insert on public.signalements to anon, authenticated;
grant update on public.etablissements to authenticated;
grant insert, update on public.statuts to authenticated;
grant insert, delete on public.etablissements to authenticated;
grant all on public.membres, public.gardes to authenticated;
grant select on public.admins to authenticated;
grant usage on all sequences in schema public to anon, authenticated;
