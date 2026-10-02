// =====================================================================
// Textes de l'interface : français (fr) et reo mā'ohi (ty)
//
// IMPORTANT : la colonne « ty » est volontairement presque vide.
// Les traductions doivent être écrites et relues par un locuteur natif
// (idéalement validées avec l'Académie tahitienne), pas par une IA.
// Toute clé absente en « ty » s'affiche en français.
// =====================================================================

export const TEXTES = {
  fr: {
    salut: 'Ia ora na',
    recherche: 'Médecin, pharmacie, dentiste…',
    toutes_communes: 'Toutes les communes',
    autour_de_moi: 'Autour de moi',
    ouvert_maintenant: 'Ouvert maintenant',
    sans_rdv: 'Sans RDV',
    tous: 'Tous',
    generalistes: 'Généralistes',
    pharmacies: 'Pharmacies',
    dentistes: 'Dentistes',
    autres: 'Autres',
    gardes_titre: 'Gardes du moment',
    gardes_sous_titre: 'Médecins et pharmacies de garde',
    resultats: (n) => (n > 1 ? `${n} résultats` : n === 1 ? '1 résultat' : 'Aucun résultat'),
    aucun_resultat: 'Aucun établissement ne correspond. Essayez une autre commune ou retirez un filtre.',
    hors_ligne: (le) => `Hors connexion : données du ${le}.`,
    retour: 'Retour',
    appeler: 'Appeler',
    itineraire: 'Itinéraire',
    ouvrir_maps: 'Ouvrir dans Maps',
    localisation: 'Localisation et contact',
    horaires: 'Horaires',
    aujourdhui: "aujourd'hui",
    ferme: 'Fermé',
    salle_attente_q: "Vous êtes dans la salle d'attente ?",
    salle_attente_aide: 'Aidez les autres : combien de personnes attendent ?',
    merci_signalement: 'Merci ! Votre signalement aide les autres patients.',
    signalements_recents: (n) => `${n} signalement${n > 1 ? 's' : ''} de patients ces 2 dernières heures`,
    temps_attente: "temps d'attente estimé",
    personnes_salle: 'personnes en salle',
    urgence: (num) => `Urgence vitale : appelez le ${num}`,
    medecins: 'Médecins',
    medecins_garde: 'Médecins de garde',
    pharmacies_garde: 'Pharmacies de garde',
    votre_secteur: 'Votre secteur',
    autres_secteurs: 'Autres secteurs et îles',
    aucune_garde: "Aucune garde enregistrée pour le moment. En cas d'urgence, appelez le 15.",
    source: 'Source',
    annuaire: 'Annuaire',
    gardes: 'Gardes',
    espace_pro: 'Espace pro',
    mode_demo: 'Mode démo : données fictives.',
  },
  ty: {
    salut: 'Ia ora na',
  },
};

let langue = (() => {
  try { return localStorage.getItem('taote-langue') || 'fr'; } catch { return 'fr'; }
})();

export function langueActuelle() { return langue; }

export function changerLangue(l) {
  langue = TEXTES[l] ? l : 'fr';
  try { localStorage.setItem('taote-langue', langue); } catch { /* ignoré */ }
  document.documentElement.lang = langue === 'ty' ? 'ty' : 'fr';
}

/** t('cle') ou t('cle', argument) si le texte est une fonction */
export function t(cle, ...args) {
  const v = TEXTES[langue]?.[cle] ?? TEXTES.fr[cle] ?? cle;
  return typeof v === 'function' ? v(...args) : v;
}
