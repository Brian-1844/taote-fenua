// =====================================================================
// Configuration de Taote Fenua
//
// Laissez les deux valeurs VIDES pour utiliser le MODE DÉMO
// (données fictives, rien n'est envoyé sur Internet).
//
// Pour passer en vrai : Supabase > Project Settings > API, puis copiez
//   - « Project URL »            → SUPABASE_URL
//   - la clé publique « anon »   → SUPABASE_ANON_KEY
//
// La clé « anon » est faite pour être publique : la sécurité est assurée
// par les règles de la base (supabase/schema.sql).
// NE METTEZ JAMAIS ICI la clé « service_role » : elle donne tous les droits.
// =====================================================================

export const CONFIG = {
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',

  // Nom affiché et numéro d'urgence
  APP_NOM: 'Taote Fenua',
  NUMERO_URGENCE: '15',

  // Au-delà de ce délai sans mise à jour, le statut en direct n'est plus affiché
  STATUT_PERIME_MINUTES: 180,
};
