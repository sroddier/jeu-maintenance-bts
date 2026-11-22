import { tirageCanal } from "./prng";
import { blaguesDe, type Blague } from "./contenu";

/**
 * Une blague par entrée de phase, jamais deux fois la même dans la partie.
 * Le tirage passe par le PRNG narratif (graine de simulation + 1).
 */
export function choisirBlague(
  seedSimulation: number,
  phase: string,
  vues: readonly string[],
): { blague: Blague | null; vues: string[] } {
  const candidats = blaguesDe(phase).filter((blague) => !vues.includes(blague.id));
  if (candidats.length === 0) return { blague: null, vues: [...vues] };
  const tirage = tirageCanal(seedSimulation, `blague:${phase}:${vues.filter((id) => id.startsWith("B")).length}`);
  const index = Math.min(candidats.length - 1, Math.floor(tirage.valeur * candidats.length));
  const blague = candidats[index] ?? null;
  if (!blague) return { blague: null, vues: [...vues] };
  return { blague, vues: [...vues, blague.id] };
}
