import { suivant } from "./prng";
import type { LigneConsommationCorrective } from "./types";

export interface PieceTiree {
  ref: string;
  quantite: number;
}

/**
 * Générateur des pièces, distinct de celui des pannes.
 * Graine de partie 2026 → 2027. Un tirage ici ne décale pas les défaillances.
 */
export function graineConsommation(grainePartie: number): number {
  return (grainePartie + 1) >>> 0;
}

/**
 * Lit `consommation_corrective` s'il est présent.
 * `pieces === null` : le champ est absent, l'appelant garde la règle actuelle
 * (première pièce corrective, à chaque panne).
 * Tableau vide : réglage, aucune pièce.
 * Probabilité 1 : la pièce est prise sans tirer. Sinon u < probabilite.
 */
export function tirerConsommation(
  state: number,
  lignes: readonly LigneConsommationCorrective[] | undefined,
): { state: number; pieces: PieceTiree[] | null } {
  if (!lignes) return { state, pieces: null };
  const pieces: PieceTiree[] = [];
  let courant = state >>> 0;
  for (const ligne of lignes) {
    if (ligne.probabilite >= 1) {
      pieces.push({ ref: ligne.ref, quantite: ligne.quantite });
      continue;
    }
    const tirage = suivant(courant);
    courant = tirage.state;
    if (tirage.value < ligne.probabilite) {
      pieces.push({ ref: ligne.ref, quantite: ligne.quantite });
    }
  }
  return { state: courant, pieces };
}
