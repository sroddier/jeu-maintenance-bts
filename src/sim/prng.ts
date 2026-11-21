/**
 * mulberry32, PRNG imposé par le GDD.
 * Ce n'est pas le générateur PCG64 de NumPy : une graine ne rejoue pas
 * `historique_pannes_simule.json`. Elle rejoue la partie du prototype.
 */

export function mulberry32(seed: number): { state: number } {
  return { state: seed >>> 0 };
}

/** Uniforme dans [0, 1). Met à jour l'état uint32. */
export function suivant(state: number): { state: number; value: number } {
  let a = state >>> 0;
  a = (a + 0x6d2b79f5) >>> 0;
  let t = Math.imul(a ^ (a >>> 15), a | 1);
  t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t;
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { state: a, value };
}

/** Entier décimal → uint32. Sinon empreinte FNV-1a du texte. */
export function graineDepuisTexte(label: string): number {
  const texte = label.trim();
  if (/^\d+$/.test(texte)) {
    const n = Number(texte);
    if (Number.isSafeInteger(n)) return n >>> 0;
  }
  let h = 2166136261;
  for (let i = 0; i < texte.length; i++) {
    h ^= texte.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
