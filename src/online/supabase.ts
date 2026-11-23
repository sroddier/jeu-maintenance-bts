import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_CLE_PUBLIQUE, SUPABASE_URL } from "./config";
import type { ClientResultats, ErreurEnvoi } from "./envoi";
import { ligneSql, type LigneResultat } from "./ligne";

/**
 * Deux clients distincts.
 * La page élève n'enregistre pas de session : une connexion professeur
 * dans le même navigateur ne doit pas transformer l'envoi en session
 * connectée (sinon la console de l'élève pourrait lire le classement).
 * La page prof garde sa session sous une autre clé.
 */

let eleve: SupabaseClient | null = null;
let prof: SupabaseClient | null = null;

export function clientEleve(): ClientResultats {
  return adaptateur(supabaseEleve());
}

export function clientProf(): SupabaseClient {
  if (!prof) {
    prof = createClient(SUPABASE_URL, SUPABASE_CLE_PUBLIQUE, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: "jeu-maintenance-prof-session",
      },
    });
  }
  return prof;
}

function supabaseEleve(): SupabaseClient {
  if (!eleve) {
    eleve = createClient(SUPABASE_URL, SUPABASE_CLE_PUBLIQUE, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: "jeu-maintenance-eleve-auth",
      },
    });
  }
  return eleve;
}

/**
 * Insert sans .select(). Le rôle anon n'a pas le droit de relire la ligne :
 * le retour demandé au serveur reste minimal.
 */
export function adaptateur(supabase: {
  from(table: string): {
    insert(ligne: ReturnType<typeof ligneSql>): PromiseLike<{ error: { code?: string; message: string } | null }>;
  };
}): ClientResultats {
  return {
    async inserer(ligne: LigneResultat): Promise<ErreurEnvoi | null> {
      const { error } = await supabase.from("resultats").insert(ligneSql(ligne));
      if (!error) return null;
      return { code: error.code, message: error.message };
    },
  };
}
