// =====================================================================
// Textes de l'interface : français (fr) et reo Tahiti (ty)
//
// ⚠ La colonne « ty » est une PREMIÈRE VERSION, rédigée sans relecture
// par un locuteur natif. Elle doit être corrigée et validée (idéalement
// avec l'Académie tahitienne — Fare Vāna'a) avant l'ouverture au public.
// Pour corriger : modifiez simplement le texte entre guillemets.
// Toute clé absente en « ty » s'affiche automatiquement en français.
//
// Les noms des cabinets, adresses et informations pratiques viennent de
// la base de données : ils restent dans la langue où ils ont été saisis.
// =====================================================================

const tranche = (tr, a, plus) => tr.replace('-', a).replace('+', plus);

export const TEXTES = {
  fr: {
    salut: 'Ia ora na',
    recherche: 'Médecin, pharmacie, dentiste…',
    rechercher: 'Rechercher',
    commune: 'Commune',
    toutes_communes: 'Toutes les communes',
    autour_de_moi: 'Autour de moi',
    filtres: 'Filtres',
    langue: 'Langue',
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
    tries_distance: 'triés par distance',
    aucun_resultat: 'Aucun établissement ne correspond. Essayez une autre commune ou retirez un filtre.',
    hors_ligne: (le) => `Hors connexion : données du ${le}.`,
    mode_demo: 'Mode démo : données fictives.',
    erreur_chargement: 'Impossible de charger les données. Vérifiez votre connexion puis rechargez la page.',
    geo_indispo: "La localisation n'est pas disponible sur cet appareil.",
    geo_refus: 'Position refusée ou introuvable. Choisissez votre commune.',
    etab_introuvable: "Cet établissement n'existe pas ou n'est plus référencé.",
    retour: 'Retour',
    appeler: 'Appeler',
    appeler_num: (num) => `Appeler le ${num}`,
    itineraire: 'Itinéraire',
    ouvrir_maps: 'Ouvrir dans Maps',
    localisation: 'Localisation et contact',
    fixe: 'Fixe',
    mobile: 'Mobile',
    horaires: 'Horaires',
    aujourdhui: "aujourd'hui",
    ferme: 'Fermé',
    rdv_uniquement: 'Consultations uniquement sur rendez-vous. Appelez pour obtenir un créneau.',
    maj: (quand) => `mis à jour ${quand}`,
    maj_par_etab: "mis à jour par l'établissement",
    pas_de_maj: 'pas de mise à jour récente',
    pas_sans_rdv_auj: "pas de consultation sans rendez-vous aujourd'hui",
    salle_attente_q: "Vous êtes dans la salle d'attente ?",
    salle_attente_aide: 'Aidez les autres : combien de personnes attendent ?',
    tranche_9plus: '9 et +',
    merci_signalement: 'Merci ! Votre signalement aide les autres patients.',
    envoi_echec: "L'envoi a échoué.",
    signalements_recents: (n) => `${n} signalement${n > 1 ? 's' : ''} de patients ces 2 dernières heures`,
    le_plus_souvent: (tr) => `le plus souvent : ${tranche(tr, ' à ', ' et plus')} personnes`,
    temps_attente: "temps d'attente estimé",
    personnes_salle: 'personnes en salle',
    personnes: (n) => `${n} personne${n > 1 ? 's' : ''}`,
    urgence: (num) => `Urgence vitale : appelez le ${num}`,
    medecins: 'Médecins',
    medecins_garde: 'Médecins de garde',
    pharmacies_garde: 'Pharmacies de garde',
    type_garde: 'Type de garde',
    votre_secteur: 'Votre secteur',
    autres_secteurs: 'Autres secteurs et îles',
    en_ce_moment: 'En ce moment',
    prochainement: 'Prochainement',
    aucune_garde: "Aucune garde enregistrée pour le moment. En cas d'urgence, appelez le 15.",
    source: 'Source',
    astuce_commune: "Astuce : choisissez votre commune dans l'annuaire pour voir votre secteur en premier.",
    annuaire: 'Annuaire',
    gardes: 'Gardes',
    espace_pro: 'Espace pro',
    note_traduction: '',

    // Ouverture
    ouvert_jusqua: (h) => `Ouvert jusqu'à ${h}`,
    ferme_ouvre: (h) => `Fermé · ouvre à ${h}`,
    ferme_auj: "Fermé pour aujourd'hui",
    horaires_inconnus: 'Horaires non communiqués',

    // Temps écoulé
    a_linstant: "à l'instant",
    ilya_min: (n) => `il y a ${n} min`,
    ilya_h: (n) => `il y a ${n} h`,
    ilya_j: (n) => `il y a ${n} j`,

    // Statuts
    niveau_peu: "Peu d'attente",
    niveau_beaucoup: "Beaucoup d'attente",
    niveau_complet: 'Complet',
    niveau_ferme: 'Fermé exceptionnellement',
    p_ferme: 'Fermé',
    p_rdv: 'Sur RDV',
    p_inconnu: 'Attente non communiquée',

    // Mode d'accueil
    mode_sans_rdv: 'Sans rendez-vous',
    mode_sur_rdv: 'Sur rendez-vous',
    mode_mixte: 'Avec ou sans rendez-vous',

    // Types d'établissement
    type_medecin: 'Médecin',
    type_pharmacie: 'Pharmacie',
    type_dentiste: 'Dentiste',
    type_kine: 'Kinésithérapeute',
    type_infirmier: 'Infirmier·e',
    type_sage_femme: 'Sage-femme',
    type_dispensaire: 'Dispensaire',
    type_clinique: 'Clinique',
    type_autre: 'Autre',

    // Jours
    jour_lun: 'Lundi', jour_mar: 'Mardi', jour_mer: 'Mercredi', jour_jeu: 'Jeudi',
    jour_ven: 'Vendredi', jour_sam: 'Samedi', jour_dim: 'Dimanche',

    // Adresse
    cote_mer: 'côté mer',
    cote_montagne: 'côté montagne',
  },

  // -------------------------------------------------------------------
  // REO TAHITI — première version, À FAIRE RELIRE par un locuteur natif
  // -------------------------------------------------------------------
  ty: {
    salut: 'Ia ora na',
    recherche: "Taote, fare rā'au, taote niho…",
    rechercher: "'Imi",
    commune: "'Oire",
    toutes_communes: "Te mau 'oire ato'a",
    autour_de_moi: "Piri iā'u",
    filtres: "Mā'itira'a",
    langue: 'Reo',
    ouvert_maintenant: 'Matara i teie nei',
    sans_rdv: "'Aita e fārereira'a",
    tous: 'Pauroa',
    generalistes: 'Taote',
    pharmacies: "Fare rā'au",
    dentistes: 'Taote niho',
    autres: 'Te tahi atu',
    gardes_titre: "Te mau tīa'i i teie nei",
    gardes_sous_titre: "Taote 'e fare rā'au tīa'i",
    resultats: (n) => (n === 0 ? "'Aita e mea i 'itehia" : `E ${n} i 'itehia`),
    tries_distance: "mai te piri roa a'e",
    aucun_resultat: "'Aita e fare i 'itehia. A tāmata i te tahi atu 'oire.",
    hors_ligne: (le) => `'Aita e tāhonora'a : parau nō te ${le}.`,
    mode_demo: "Tāmatara'a : e'ere teie i te mau parau mau.",
    erreur_chargement: "'Aita i manuia. A hi'o i tā 'oe tāhonora'a 'e a tāmata fa'ahou.",
    geo_indispo: "'Aita e nehenehe e 'ite i tō 'oe vāhi i ni'a i teie mātini.",
    geo_refus: "'Aita tō 'oe vāhi i 'itehia. A mā'iti i tō 'oe 'oire.",
    etab_introuvable: "'Aita teie fare i roto i te tāpura.",
    retour: "Ho'i",
    appeler: 'Niuniu',
    appeler_num: (num) => `Niuniu i te ${num}`,
    itineraire: "'Ē'a",
    ouvrir_maps: "'Īriti i roto ia Maps",
    localisation: "Vāhi 'e niuniu",
    fixe: 'Niuniu fare',
    mobile: 'Vini',
    horaires: 'Te mau hora',
    aujourdhui: 'teie mahana',
    ferme: 'Ua piri',
    rdv_uniquement: "Mā te fārereira'a ana'e. A niuniu nō te tāpa'o i te hora.",
    maj: (quand) => `fa'a'āpīhia ${quand}`,
    maj_par_etab: "fa'a'āpīhia e te fare",
    pas_de_maj: "'aita e parau 'āpī",
    pas_sans_rdv_auj: "'aita e fa'ari'ira'a mā te fārereira'a 'ore i teie mahana",
    salle_attente_q: "Tei roto ānei 'oe i te piha tīa'ira'a ?",
    salle_attente_aide: "A tauturu mai : e hia ta'ata e tīa'i nei ?",
    tranche_9plus: "9 'e hau",
    merci_signalement: "Māuruuru ! E tauturu tā 'oe parau i te tahi atu.",
    envoi_echec: "'Aita i manuia te hāponora'a.",
    signalements_recents: (n) => `${n} parau a te mau ta'ata i nā hora e 2 i ma'iri`,
    le_plus_souvent: (tr) => `pinepine : ${tranche(tr, ' – ', " 'e hau")} ta'ata`,
    temps_attente: "taime tīa'ira'a",
    personnes_salle: "ta'ata i roto i te piha",
    personnes: (n) => `${n} ta'ata`,
    urgence: (num) => `Fifi rū : a niuniu i te ${num}`,
    medecins: 'Taote',
    medecins_garde: "Taote tīa'i",
    pharmacies_garde: "Fare rā'au tīa'i",
    type_garde: "Huru tīa'i",
    votre_secteur: "Tō 'oe tuha'a",
    autres_secteurs: "Te tahi atu mau tuha'a 'e mau motu",
    en_ce_moment: 'I teie nei',
    prochainement: "A muri a'e",
    aucune_garde: "'Aita e tīa'i i tāpa'ohia. Mai te mea e fifi rū, a niuniu i te 15.",
    source: 'Puna parau',
    astuce_commune: "A mā'iti i tō 'oe 'oire i roto i te tāpura nō te 'ite i tō 'oe tuha'a nā mua.",
    annuaire: 'Tāpura',
    gardes: "Tīa'i",
    espace_pro: "Vāhi tōro'a",
    note_traduction: "Traduction en reo Tahiti provisoire, en cours de relecture. Merci de signaler toute erreur.",

    ouvert_jusqua: (h) => `Matara e tae atu i te ${h}`,
    ferme_ouvre: (h) => `Ua piri · e matara i te ${h}`,
    ferme_auj: 'Ua piri i teie mahana',
    horaires_inconnus: "Hora 'aita i fa'a'itehia",

    a_linstant: 'i teie nei iho',
    ilya_min: (n) => `e ${n} miniti i ma'iri`,
    ilya_h: (n) => `e ${n} hora i ma'iri`,
    ilya_j: (n) => `e ${n} mahana i ma'iri`,

    niveau_peu: "Tīa'ira'a poto",
    niveau_beaucoup: "Tīa'ira'a roa",
    niveau_complet: "Ua 'ī",
    niveau_ferme: "Ua piri ta'a 'ē",
    p_ferme: 'Ua piri',
    p_rdv: "Mā te fārereira'a",
    p_inconnu: "'Aita i fa'a'itehia",

    mode_sans_rdv: "'Aita e fārereira'a",
    mode_sur_rdv: "Mā te fārereira'a",
    mode_mixte: "Mā te fārereira'a 'aore rā 'aita",

    type_medecin: 'Taote',
    type_pharmacie: "Fare rā'au",
    type_dentiste: 'Taote niho',
    type_kine: 'Taote tāurumi',
    // type_infirmier : à traduire par un locuteur natif (affiché en français en attendant)
    type_sage_femme: "Vahine fa'afānau",
    type_dispensaire: "Fare utuutura'a ma'i",
    type_clinique: "Fare ma'i",
    type_autre: 'Te tahi atu',

    jour_lun: 'Monirē', jour_mar: 'Mahana piti', jour_mer: 'Mahana toru', jour_jeu: 'Mahana maha',
    jour_ven: 'Mahana pae', jour_sam: "Mahana mā'a", jour_dim: 'Tāpati',

    cote_mer: 'pae tai',
    cote_montagne: 'pae uta',
  },
};

let langue = (() => {
  try { return localStorage.getItem('taote-langue') || 'fr'; } catch { return 'fr'; }
})();
if (!TEXTES[langue]) langue = 'fr';

export function langueActuelle() { return langue; }

/** Change la langue et la retient pour les prochaines visites */
export function changerLangue(l) {
  langue = TEXTES[l] ? l : 'fr';
  try { localStorage.setItem('taote-langue', langue); } catch { /* ignoré */ }
  document.documentElement.lang = langue;
}

/** Fixe la langue pour la page en cours, sans changer le choix enregistré */
export function forcerLangue(l) { langue = TEXTES[l] ? l : 'fr'; }

/** t('cle') ou t('cle', argument) si le texte est une fonction */
export function t(cle, ...args) {
  const v = TEXTES[langue]?.[cle] ?? TEXTES.fr[cle] ?? cle;
  return typeof v === 'function' ? v(...args) : v;
}
