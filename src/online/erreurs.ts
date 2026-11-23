export type FamilleErreur = "table_absente" | "aucun_droit" | "identifiants" | "autre";

export function familleErreur(error: { code?: string; message?: string } | null | undefined): FamilleErreur {
  const code = error?.code ?? "";
  const message = (error?.message ?? "").toLowerCase();
  if (
    code === "42P01" ||
    code === "42703" ||
    code === "PGRST204" ||
    code === "PGRST205" ||
    message.includes("could not find the table") ||
    message.includes("could not find the") ||
    message.includes("does not exist") ||
    (message.includes("schema cache") && message.includes("resultat"))
  ) {
    return "table_absente";
  }
  if (
    code === "42501" ||
    message.includes("permission denied") ||
    message.includes("row-level security") ||
    message.includes("not authorized")
  ) {
    return "aucun_droit";
  }
  if (
    code === "invalid_credentials" ||
    message.includes("invalid login") ||
    message.includes("invalid credentials") ||
    message.includes("invalid email or password")
  ) {
    return "identifiants";
  }
  return "autre";
}

export function messageConnexion(error: { code?: string; message?: string }): string {
  if (familleErreur(error) === "identifiants") return "Identifiants incorrects.";
  return "Connexion impossible. Vérifie l'adresse et le mot de passe, puis réessaie.";
}

export function messageLecture(error: { code?: string; message?: string }): string {
  const famille = familleErreur(error);
  if (famille === "table_absente") {
    return "La table des résultats n'existe pas encore. Pense à exécuter supabase/schema.sql dans l'éditeur SQL de Supabase.";
  }
  if (famille === "aucun_droit") return "Aucun droit pour lire les résultats.";
  return "Impossible de lire les résultats. Réessaie avec Actualiser.";
}

export function messageSuppression(error: { code?: string; message?: string }): string {
  const famille = familleErreur(error);
  if (famille === "table_absente") {
    return "La table des résultats n'existe pas encore. Pense à exécuter supabase/schema.sql dans l'éditeur SQL de Supabase.";
  }
  if (famille === "aucun_droit") return "Aucun droit pour supprimer ce résultat.";
  return "Suppression impossible. Réessaie avec Actualiser.";
}

export const MESSAGE_SANS_DROIT_COMPTE =
  "Aucun droit : seul le compte du professeur peut lire les résultats.";
