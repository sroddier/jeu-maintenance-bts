/** Bornes affichées par les boutons − / +, les mêmes que la validation du planning. */
export const QUANTITE_MIN = 0;
export const QUANTITE_MAX = 20;

/** Ramène une saisie à un entier dans [min, max]. Une valeur illisible retombe sur min. */
export function bornerQuantite(valeur: number, min = QUANTITE_MIN, max = QUANTITE_MAX): number {
  if (!Number.isFinite(valeur)) return min;
  return Math.min(max, Math.max(min, Math.trunc(valeur)));
}

/** Ne garde que les chiffres, pour le clavier numérique du téléphone. */
export function filtrerChiffres(saisie: string): string {
  return saisie.replace(/\D/g, "");
}
