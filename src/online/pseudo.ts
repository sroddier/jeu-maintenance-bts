/**
 * Même liste que la contrainte resultats_pseudo_chk de supabase/schema.sql.
 * Le point est autorisé (initiale du nom). Le tiret est en fin de classe
 * pour rester un caractère, pas un intervalle.
 */
export const LETTRES =
  "A-Za-zàâäéèêëïîôùûüÿçœæÀÂÄÉÈÊËÏÎÔÙÛÜŸÇŒÆáíóúñÁÍÓÚÑ";

export const CARACTERES_SIGNIFIANTS = `0-9${LETTRES}`;

/** Espace, underscore, point, puis tiret en fin de classe. */
export const CARACTERES_PSEUDO = `${CARACTERES_SIGNIFIANTS} _.-`;

const AUTORISE = new RegExp(`^[${CARACTERES_PSEUDO}]+$`, "u");
const A_UNE_LETTRE = new RegExp(`[${LETTRES}]`, "u");

export const CONSIGNE_PRENOM =
  "Ton prénom et l'initiale de ton nom (ex. : Karim B.)";

export const MESSAGE_PSEUDO =
  "Le prénom doit faire entre 3 et 20 caractères : lettres, chiffres, espace, tiret, underscore ou point. Il faut au moins une lettre, sans espace au début ni à la fin.";

export function normaliserPseudo(saisi: string): string {
  return saisi.trim();
}

export function pseudoValide(saisi: string): boolean {
  const pseudo = normaliserPseudo(saisi);
  return (
    pseudo.length >= 3 &&
    pseudo.length <= 20 &&
    AUTORISE.test(pseudo) &&
    A_UNE_LETTRE.test(pseudo)
  );
}
