/**
 * Adresse du projet et clé publique (rôle anon, format « publishable »).
 *
 * Ces deux valeurs sont faites pour voyager dans le navigateur : ce ne sont
 * pas des secrets, et le dépôt les affiche en clair volontairement. Elles ne
 * permettent que ce que les règles du fichier supabase/schema.sql autorisent
 * (un élève ajoute une ligne, il ne peut pas lire les résultats).
 *
 * Aucune clé d'administration du projet ne doit être ajoutée ici, ni dans
 * un autre fichier. La protection vient des règles RLS, pas du silence.
 */
export const SUPABASE_URL = "https://mbefjocapackbcgsmnyb.supabase.co";

export const SUPABASE_CLE_PUBLIQUE = "sb_publishable_2YkHd1w2a_hNSneci41oXQ_pIZNeSiY";

/** Seul ce compte peut lire et supprimer. Le même e-mail est écrit dans schema.sql. */
export const EMAIL_PROF = "stephane.roddier@ac-aix-marseille.fr";

/** Identique au champ version de package.json. Texte court envoyé avec chaque score. */
export const VERSION_JEU = "0.1.0";
