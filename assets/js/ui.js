// =====================================================================
// Petites fonctions d'affichage partagées par l'app et l'espace pro
// =====================================================================
import { CONFIG } from './config.js';
import { t, langueActuelle } from './i18n.js';

/** Échappe le texte avant de l'insérer dans le HTML (évite les injections) */
export function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export const JOURS = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];
export const JOURS_LONGS = {
  lun: 'Lundi', mar: 'Mardi', mer: 'Mercredi', jeu: 'Jeudi', ven: 'Vendredi', sam: 'Samedi', dim: 'Dimanche',
};
export const ORDRE_JOURS = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];

export const TYPES = {
  medecin: 'Médecin',
  pharmacie: 'Pharmacie',
  dentiste: 'Dentiste',
  kine: 'Kinésithérapeute',
  infirmier: 'Infirmier·e',
  sage_femme: 'Sage-femme',
  dispensaire: 'Dispensaire',
  clinique: 'Clinique',
  autre: 'Autre',
};

export const NIVEAUX = {
  peu:      { label: "Peu d'attente",      sous: 'moins de 20 min',             cls: 'peu' },
  beaucoup: { label: "Beaucoup d'attente", sous: 'plus de 30 min',              cls: 'beaucoup' },
  complet:  { label: 'Complet',            sous: "plus de patients aujourd'hui", cls: 'complet' },
  ferme:    { label: 'Fermé',              sous: 'fermé exceptionnellement',     cls: 'ferme' },
};

export const MODES = { sans_rdv: 'Sans rendez-vous', sur_rdv: 'Sur rendez-vous', mixte: 'Avec ou sans rendez-vous' };

/** Heure de Tahiti (UTC−10, pas d'heure d'été) */
export function maintenantTahiti() {
  const t = new Date(Date.now() - 10 * 3600000);
  return { jour: JOURS[t.getUTCDay()], minutes: t.getUTCHours() * 60 + t.getUTCMinutes() };
}

const enMinutes = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + (m || 0);
};
export const heure = (hhmm) => String(hhmm).replace(/^0(\d)/, '$1');

/** { ouvert, texte } d'après les horaires de la semaine */
export function etatOuverture(horaires) {
  const { jour, minutes } = maintenantTahiti();
  const plages = (horaires?.[jour] || []).filter((p) => p?.[0] && p?.[1]);
  if (!horaires || !Object.keys(horaires).length) return { ouvert: null, texte: t('horaires_inconnus') };
  for (const [deb, fin] of plages) {
    if (minutes >= enMinutes(deb) && minutes < enMinutes(fin)) {
      return { ouvert: true, texte: t('ouvert_jusqua', heure(fin)) };
    }
  }
  const prochaine = plages.find(([deb]) => enMinutes(deb) > minutes);
  if (prochaine) return { ouvert: false, texte: t('ferme_ouvre', heure(prochaine[0])) };
  return { ouvert: false, texte: t('ferme_auj') };
}

/** Texte « il y a 8 min » */
export function ilYa(iso) {
  const min = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (min < 1) return t('a_linstant');
  if (min < 60) return t('ilya_min', min);
  const h = Math.floor(min / 60);
  if (h < 24) return t('ilya_h', h);
  return t('ilya_j', Math.floor(h / 24));
}

/**
 * Ce qu'on affiche comme pastille de statut.
 * On n'affiche jamais un statut trop ancien : mieux vaut « non communiqué » qu'une fausse info.
 */
export function pastille(etab) {
  const s = etab.statut;
  const ouverture = etatOuverture(etab.horaires);
  if (s?.niveau === 'ferme' && !estPerime(s)) return { cls: 'ferme', label: t('niveau_ferme'), direct: true };
  if (ouverture.ouvert === false) return { cls: 'ferme', label: t('p_ferme'), direct: false };
  if (etab.mode_accueil === 'sur_rdv') return { cls: 'rdv', label: t('p_rdv'), direct: false };
  if (!s || estPerime(s)) return { cls: 'inconnu', label: t('p_inconnu'), direct: false };
  return { cls: NIVEAUX[s.niveau].cls, label: t(`niveau_${s.niveau}`), direct: true };
}

/** Libellés traduits (le public voit la langue choisie) */
export const libelleMode = (mode) => t(`mode_${mode}`);
export const libelleJour = (jour) => t(`jour_${jour}`);
/** En reo, on affiche le type traduit ; la spécialité saisie reste en français */
export const libelleType = (e) => (langueActuelle() === 'fr' && e.specialite ? e.specialite : t(`type_${e.type}`));

export function estPerime(statut) {
  if (!statut?.maj_le) return true;
  return Date.now() - Date.parse(statut.maj_le) > CONFIG.STATUT_PERIME_MINUTES * 60000;
}

export function pastilleHTML(p) {
  return `<span class="pastille pastille-${esc(p.cls)}"><span class="point" aria-hidden="true"></span>${esc(p.label)}</span>`;
}

/** Ligne d'adresse façon Polynésie : « PK 15,2 côté mer · Punaauia » */
export function adresseCourte(e) {
  const morceaux = [];
  if (e.pk) morceaux.push(`PK ${e.pk}${e.cote ? ` ${t(`cote_${e.cote}`)}` : ''}`);
  else if (e.adresse) morceaux.push(e.adresse);
  morceaux.push(e.commune);
  if (e.ile && e.ile !== 'Tahiti') morceaux.push(e.ile);
  return morceaux.filter(Boolean).join(' · ');
}

/** Lien tel: au format international (+689) */
export function telHref(tel) {
  const chiffres = String(tel || '').replace(/\D/g, '');
  if (!chiffres) return '#';
  return chiffres.startsWith('689') ? `tel:+${chiffres}` : `tel:+689${chiffres}`;
}

export function mapsHref(e) {
  if (e.lat != null && e.lng != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${e.lat},${e.lng}`;
  }
  const q = [e.nom, e.pk ? `PK ${e.pk}` : e.adresse, e.commune, 'Polynésie française'].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

/** Distance à vol d'oiseau, en km */
export function distanceKm(a, b) {
  if (a?.lat == null || b?.lat == null) return null;
  const R = 6371, rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
export const kmTexte = (d) => (d == null ? '' : d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1).replace('.', ',')} km`);

/** Normalise un texte pour la recherche (sans accents, sans apostrophes) */
export function normaliser(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’'ʻ]/g, '').toLowerCase();
}

export function icone(nom, taille = 20) {
  const chemins = {
    recherche: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    lieu: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    tel: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    mobile: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
    route: '<path d="M3 11l18-8-8 18-2-8z"/>',
    retour: '<path d="M15 6l-6 6 6 6"/>',
    suivant: '<path d="M9 6l6 6-6 6"/>',
    alerte: '<path d="M12 3l9 16H3z"/><path d="M12 10v4"/><path d="M12 17h.01"/>',
    horloge: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    viser: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="8"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
    coche: '<path d="M5 12l5 5 9-10"/>',
    sortie: '<path d="M15 3h6v6"/><path d="M10 14L21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>',
  };
  return `<svg width="${taille}" height="${taille}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${chemins[nom] || ''}</svg>`;
}
