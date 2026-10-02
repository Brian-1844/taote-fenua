// =====================================================================
// Couche de données : une seule interface, deux moteurs
//   - Supabase (vraies données) si config.js est rempli
//   - Démo (données fictives + modifications gardées dans ce navigateur)
// =====================================================================
import { CONFIG } from './config.js';

export const isDemo = !CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY;

const CACHE_KEY = 'taote-cache-v1';
const DEMO_OVERLAY = 'taote-demo-overlay-v1';
const DEMO_SESSION = 'taote-demo-session-v1';
export const DEMO_IDENTIFIANTS = { email: 'demo@taote.pf', motdepasse: 'demo1234' };

// ---------------------------------------------------------------------
// Outils
// ---------------------------------------------------------------------
function lireJSON(cle, defaut) {
  try { const v = localStorage.getItem(cle); return v ? JSON.parse(v) : defaut; }
  catch { return defaut; }
}
function ecrireJSON(cle, valeur) {
  try { localStorage.setItem(cle, JSON.stringify(valeur)); } catch { /* stockage indisponible */ }
}
const unSeul = (v) => (Array.isArray(v) ? v[0] ?? null : v ?? null);

// ---------------------------------------------------------------------
// Client Supabase (chargé seulement si besoin)
// ---------------------------------------------------------------------
let _sb = null;
export async function supabase() {
  if (isDemo) return null;
  if (!_sb) {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    _sb = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return _sb;
}

// ---------------------------------------------------------------------
// Moteur démo
// ---------------------------------------------------------------------
let _demoBase = null;
async function demoBase() {
  if (!_demoBase) {
    const r = await fetch(new URL('../../data/demo.json', import.meta.url));
    _demoBase = await r.json();
  }
  return _demoBase;
}
function demoOverlay() { return lireJSON(DEMO_OVERLAY, { etab: {}, statuts: {}, signalements: [] }); }

async function demoEtablissements() {
  const base = await demoBase();
  const ov = demoOverlay();
  const maintenant = Date.now();
  return base.etablissements.map((e) => {
    const fusion = { ...e, ...(ov.etab[e.id] || {}) };
    let statut = ov.statuts[e.id] || null;
    if (!statut && e.statut) {
      const { minutes_depuis_maj, ...reste } = e.statut;
      statut = { ...reste, maj_le: new Date(maintenant - minutes_depuis_maj * 60000).toISOString() };
    }
    return { ...fusion, statut };
  });
}

async function demoGardes() {
  const base = await demoBase();
  // En démo, les gardes couvrent toujours « maintenant » pour être visibles
  const debut = new Date(Date.now() - 3600000).toISOString();
  const fin = new Date(Date.now() + 48 * 3600000).toISOString();
  return base.gardes.map((g, i) => ({ id: `demo-garde-${i}`, debut, fin, lat: null, lng: null, ...g }));
}

// ---------------------------------------------------------------------
// LECTURE PUBLIQUE
// ---------------------------------------------------------------------

/** Tous les établissements actifs avec leur statut. Garde une copie pour le hors-ligne. */
export async function listerEtablissements() {
  try {
    let liste;
    if (isDemo) {
      liste = (await demoEtablissements()).filter((e) => e.actif);
    } else {
      const sb = await supabase();
      const { data, error } = await sb
        .from('etablissements')
        .select('*, statut:statuts(*)')
        .eq('actif', true)
        .order('nom');
      if (error) throw error;
      liste = data.map((e) => ({ ...e, statut: unSeul(e.statut) }));
    }
    const cache = lireJSON(CACHE_KEY, {});
    ecrireJSON(CACHE_KEY, { ...cache, etablissements: liste, le: new Date().toISOString() });
    return { liste, horsLigne: false };
  } catch (err) {
    const cache = lireJSON(CACHE_KEY, null);
    if (cache?.etablissements) return { liste: cache.etablissements, horsLigne: true, le: cache.le };
    throw err;
  }
}

export async function lireEtablissement(id) {
  const { liste, horsLigne, le } = await listerEtablissements();
  return { etab: liste.find((e) => e.id === id) || null, horsLigne, le };
}

/** Gardes en cours ou à venir dans les 7 jours. type = 'medecin' | 'pharmacie' */
export async function listerGardes(type) {
  const cle = `gardes_${type}`;
  try {
    let liste;
    if (isDemo) {
      liste = (await demoGardes()).filter((g) => g.type === type);
    } else {
      const sb = await supabase();
      const dans7j = new Date(Date.now() + 7 * 86400000).toISOString();
      const { data, error } = await sb
        .from('gardes')
        .select('*')
        .eq('type', type)
        .gt('fin', new Date().toISOString())
        .lt('debut', dans7j)
        .order('debut');
      if (error) throw error;
      liste = data;
    }
    const cache = lireJSON(CACHE_KEY, {});
    ecrireJSON(CACHE_KEY, { ...cache, [cle]: liste });
    return { liste, horsLigne: false };
  } catch (err) {
    const cache = lireJSON(CACHE_KEY, null);
    if (cache?.[cle]) return { liste: cache[cle], horsLigne: true };
    throw err;
  }
}

/** Signalement anonyme d'un patient : tranche = '0-3' | '4-8' | '9+' */
export async function envoyerSignalement(etablissement_id, tranche) {
  if (isDemo) {
    const ov = demoOverlay();
    ov.signalements.push({ etablissement_id, tranche, created_at: new Date().toISOString() });
    ecrireJSON(DEMO_OVERLAY, ov);
    return;
  }
  const sb = await supabase();
  const { error } = await sb.from('signalements').insert({ etablissement_id, tranche });
  if (error) throw error;
}

/** Signalements des 2 dernières heures pour un établissement */
export async function signalementsRecents(etablissement_id) {
  const limite = Date.now() - 2 * 3600000;
  if (isDemo) {
    return demoOverlay().signalements.filter(
      (s) => s.etablissement_id === etablissement_id && Date.parse(s.created_at) > limite,
    );
  }
  const sb = await supabase();
  const { data, error } = await sb
    .from('signalements')
    .select('tranche, created_at')
    .eq('etablissement_id', etablissement_id)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) return [];
  return data;
}

// ---------------------------------------------------------------------
// COMPTES DES PROFESSIONNELS
// ---------------------------------------------------------------------

export async function sessionActuelle() {
  if (isDemo) return lireJSON(DEMO_SESSION, null);
  const sb = await supabase();
  const { data } = await sb.auth.getSession();
  return data.session ? { email: data.session.user.email, id: data.session.user.id } : null;
}

export async function surChangementSession(rappel) {
  if (isDemo) return;
  const sb = await supabase();
  sb.auth.onAuthStateChange((evenement, session) => rappel(evenement, session));
}

export async function seConnecter(email, motdepasse) {
  email = (email || '').trim().toLowerCase();
  if (isDemo) {
    if (email === DEMO_IDENTIFIANTS.email && motdepasse === DEMO_IDENTIFIANTS.motdepasse) {
      const s = { email, id: 'demo-user' };
      ecrireJSON(DEMO_SESSION, s);
      return s;
    }
    throw new Error('Identifiant ou mot de passe incorrect.');
  }
  const sb = await supabase();
  const { data, error } = await sb.auth.signInWithPassword({ email, password: motdepasse });
  if (error) throw new Error(traduireErreurAuth(error));
  return { email: data.user.email, id: data.user.id };
}

export async function seDeconnecter() {
  if (isDemo) { localStorage.removeItem(DEMO_SESSION); return; }
  const sb = await supabase();
  await sb.auth.signOut();
}

/** Envoie un e-mail avec un lien pour choisir un nouveau mot de passe */
export async function motDePasseOublie(email) {
  if (isDemo) return;
  const sb = await supabase();
  const retour = new URL('pro.html', location.href).href;
  const { error } = await sb.auth.resetPasswordForEmail((email || '').trim().toLowerCase(), { redirectTo: retour });
  if (error) throw new Error(traduireErreurAuth(error));
}

export async function changerMotDePasse(nouveau) {
  if (!nouveau || nouveau.length < 8) throw new Error('Le mot de passe doit contenir au moins 8 caractères.');
  if (isDemo) return;
  const sb = await supabase();
  const { error } = await sb.auth.updateUser({ password: nouveau });
  if (error) throw new Error(traduireErreurAuth(error));
}

/** Établissements que le professionnel connecté a le droit de gérer */
export async function mesEtablissements() {
  if (isDemo) {
    const tous = await demoEtablissements();
    return tous.filter((e) => e.id === '00000000-0000-4000-8000-000000000001');
  }
  const sb = await supabase();
  const { data: s } = await sb.auth.getUser();
  if (!s.user) return [];
  const { data: liens, error } = await sb.from('membres').select('etablissement_id').eq('user_id', s.user.id);
  if (error) throw error;
  const ids = liens.map((l) => l.etablissement_id);
  if (!ids.length) return [];
  const { data, error: e2 } = await sb.from('etablissements').select('*, statut:statuts(*)').in('id', ids).order('nom');
  if (e2) throw e2;
  return data.map((e) => ({ ...e, statut: unSeul(e.statut) }));
}

/** Met à jour le statut en direct (niveau, attente, personnes, sans RDV) */
export async function publierStatut(etablissement_id, statut) {
  const propre = {
    niveau: statut.niveau,
    attente_min: statut.attente_min ?? null,
    personnes: statut.personnes ?? null,
    sans_rdv_aujourdhui: !!statut.sans_rdv_aujourdhui,
  };
  if (isDemo) {
    const ov = demoOverlay();
    ov.statuts[etablissement_id] = { ...propre, maj_le: new Date().toISOString() };
    ecrireJSON(DEMO_OVERLAY, ov);
    return ov.statuts[etablissement_id];
  }
  const sb = await supabase();
  const { data, error } = await sb
    .from('statuts')
    .upsert({ etablissement_id, ...propre }, { onConflict: 'etablissement_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Champs de la fiche qu'un professionnel peut modifier lui-même */
export const CHAMPS_MODIFIABLES = [
  'specialite', 'pk', 'cote', 'repere', 'adresse', 'tel_fixe', 'tel_mobile',
  'mode_accueil', 'horaires', 'infos', 'lat', 'lng',
];

export async function enregistrerFiche(etablissement_id, champs) {
  const propre = {};
  for (const c of CHAMPS_MODIFIABLES) if (c in champs) propre[c] = champs[c] === '' ? null : champs[c];
  if (isDemo) {
    const ov = demoOverlay();
    ov.etab[etablissement_id] = { ...(ov.etab[etablissement_id] || {}), ...propre };
    ecrireJSON(DEMO_OVERLAY, ov);
    return;
  }
  const sb = await supabase();
  const { error } = await sb.from('etablissements').update(propre).eq('id', etablissement_id);
  if (error) throw error;
}

export function reinitialiserDemo() {
  localStorage.removeItem(DEMO_OVERLAY);
  localStorage.removeItem(CACHE_KEY);
}

function traduireErreurAuth(error) {
  const m = (error?.message || '').toLowerCase();
  if (m.includes('invalid login')) return 'Identifiant ou mot de passe incorrect.';
  if (m.includes('email not confirmed')) return 'Adresse e-mail pas encore confirmée : ouvrez le lien reçu par e-mail.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Trop de tentatives. Patientez quelques minutes.';
  if (m.includes('password')) return 'Mot de passe refusé : utilisez au moins 8 caractères.';
  return 'Une erreur est survenue. Vérifiez votre connexion et réessayez.';
}
