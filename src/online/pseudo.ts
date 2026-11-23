/**
 * Même liste que la contrainte resultats_pseudo_chk de supabase/schema.sql.
 * Le tiret est en fin de classe pour rester un caractère, pas un intervalle.
 */
export const CARACTERES_SIGNIFIANTS =
  "0-9A-Za-zàâäéèêëïîôùûüÿçœæÀÂÄÉÈÊËÏÎÔÙÛÜŸÇŒÆáíóúñÁÍÓÚÑ";

export const CARACTERES_PSEUDO = `${CARACTERES_SIGNIFIANTS} _-`;

const AUTORISE = new RegExp(`^[${CARACTERES_PSEUDO}]+$`, "u");
const A_UNE_LETTRE_OU_UN_CHIFFRE = new RegExp(`[${CARACTERES_SIGNIFIANTS}]`, "u");

export const RAPPEL_PSEUDO = "N'utilise pas ton vrai nom.";

export const MESSAGE_PSEUDO =
  "Le pseudo doit faire entre 3 et 20 caractères : lettres, chiffres, espace, tiret ou underscore.";

export function normaliserPseudo(saisi: string): string {
  return saisi.trim();
}

export function pseudoValide(saisi: string): boolean {
  const pseudo = normaliserPseudo(saisi);
  return (
    pseudo.length >= 3 &&
    pseudo.length <= 20 &&
    AUTORISE.test(pseudo) &&
    A_UNE_LETTRE_OU_UN_CHIFFRE.test(pseudo)
  );
}
