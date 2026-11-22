import { graineDepuisTexte, suivant } from "../sim/prng";

/**
 * Générateur de la couche narrative.
 * La graine est celle de la simulation, plus un. On n'appelle jamais `suivant`
 * sur `partie.rng` : les pannes et les corrigés ne bougent pas.
 * Visite client et blagues ont des canaux distincts, tous dérivés de cette graine,
 * pour que l'ordre d'affichage ne mélange pas leurs tirages.
 */
export function graineNarrative(seedSimulation: number): number {
  return (seedSimulation + 1) >>> 0;
}

export function tirageCanal(seedSimulation: number, canal: string): { valeur: number; etat: number } {
  const depart = graineDepuisTexte(`${graineNarrative(seedSimulation)}:${canal}`);
  const tirage = suivant(depart);
  return { valeur: tirage.value, etat: tirage.state };
}

/** Semaine (1…nbTours) de la visite client E08. Un seul tirage, sans effet de jeu. */
export function semaineVisiteClient(seedSimulation: number, nbTours: number): number {
  if (nbTours < 1) return 1;
  const tirage = tirageCanal(seedSimulation, "E08");
  return 1 + Math.min(nbTours - 1, Math.floor(tirage.valeur * nbTours));
}
