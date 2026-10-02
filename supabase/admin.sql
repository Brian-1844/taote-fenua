-- =====================================================================
-- Taote Fenua — aide-mémoire de l'administrateur
-- Ces requêtes se lancent dans Supabase > SQL Editor (elles ont tous les
-- droits). Remplacez les valeurs entre < > avant de cliquer sur « Run ».
-- =====================================================================


-- ---------------------------------------------------------------------
-- A. Vous déclarer administrateur (UNE seule fois, au tout début)
--    1) Authentication > Users > « Add user » > créez votre propre compte
--    2) Lancez :
-- ---------------------------------------------------------------------
insert into public.admins (user_id)
select id from auth.users where email = '<votre-email@exemple.pf>'
on conflict do nothing;


-- ---------------------------------------------------------------------
-- B. Ajouter un établissement
-- ---------------------------------------------------------------------
insert into public.etablissements
  (nom, type, specialite, ile, commune, pk, cote, repere, tel_fixe, mode_accueil, horaires)
values
  ('<Cabinet médical X>', 'medecin', 'Médecin généraliste', 'Tahiti', '<Punaauia>',
   '<15,2>', 'mer', '<en face de …>', '<40 XX XX XX>', 'mixte',
   '{"lun":[["07:00","12:00"],["14:00","18:00"]],"mar":[["07:00","12:00"],["14:00","18:00"]],
     "mer":[["07:00","12:00"],["14:00","18:00"]],"jeu":[["07:00","12:00"],["14:00","18:00"]],
     "ven":[["07:00","12:00"],["14:00","17:00"]],"sam":[["07:00","11:00"]],"dim":[]}')
returning id;   -- notez l'identifiant affiché


-- ---------------------------------------------------------------------
-- C. Donner un accès à un professionnel
--    1) Authentication > Users > « Invite user » > son adresse e-mail
--       (il reçoit un lien pour choisir son mot de passe)
--    2) Reliez son compte à son établissement :
-- ---------------------------------------------------------------------
insert into public.membres (user_id, etablissement_id)
select u.id, e.id
from auth.users u, public.etablissements e
where u.email = '<docteur@exemple.pf>'
  and e.nom   = '<Cabinet médical X>'
on conflict do nothing;


-- ---------------------------------------------------------------------
-- D. Retirer l'accès d'un professionnel (sans supprimer la fiche)
-- ---------------------------------------------------------------------
delete from public.membres
where user_id = (select id from auth.users where email = '<docteur@exemple.pf>');


-- ---------------------------------------------------------------------
-- E. Saisir les gardes du week-end (depuis le tour de garde officiel)
--    Heures de Tahiti : terminez par -10 (UTC−10).
-- ---------------------------------------------------------------------
insert into public.gardes (type, secteur, ile, nom, tel, debut, fin, horaires_texte, source)
values
  ('medecin', 'Papeete · Faa''a · Punaauia', 'Tahiti', 'Dr <Nom>', '<40 XX XX XX>',
   '<2026-10-03> 12:00-10', '<2026-10-04> 22:00-10', 'sam. 12–22 h · dim. 6–22 h',
   'Ordre des médecins de Polynésie, semaine <40>'),
  ('pharmacie', 'Tahiti Ouest', 'Tahiti', 'Pharmacie <Nom>', '<40 XX XX XX>',
   '<2026-10-03> 12:00-10', '<2026-10-04> 20:00-10', 'sam. 12–20 h · dim. 8–20 h',
   '<source officielle>');


-- ---------------------------------------------------------------------
-- F. Masquer un établissement (fermeture définitive, départ…)
-- ---------------------------------------------------------------------
update public.etablissements set actif = false where nom = '<Cabinet médical X>';


-- ---------------------------------------------------------------------
-- G. Qui gère quoi ?
-- ---------------------------------------------------------------------
select u.email, e.nom, e.commune
from public.membres m
join auth.users u on u.id = m.user_id
join public.etablissements e on e.id = m.etablissement_id
order by e.nom;
