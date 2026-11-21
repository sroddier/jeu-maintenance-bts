import { suivant } from "./prng";
import type { ModeDefaillance } from "./types";

const EPS = 1e-12;

/** Γ(z) par l'approximation de Lanczos (coefficients usuels, g ≈ 7). */
export function gamma(z: number): number {
  if (z <= 0) throw new Error("gamma indéfinie pour z ≤ 0");
  return Math.exp(logGamma(z));
}

function logGamma(z: number): number {
  const p = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843696540789e-6, 1.5056327351493116e-7,
  ];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  let x = p[0];
  const zz = z - 1;
  for (let i = 1; i < p.length; i++) x += p[i] / (zz + i);
  const t = zz + p.length - 1.5;
  return 0.5 * Math.log(2 * Math.PI) + (zz + 0.5) * Math.log(t) - t + Math.log(x);
}

/** MTBF = γ + η · Γ(1 + 1/β). */
export function mtbfTheorique(beta: number, eta: number, gammaPos = 0): number {
  return gammaPos + eta * gamma(1 + 1 / beta);
}

/** R(t) = exp(−((t − γ)/η)^β). */
export function fiabilite(t: number, beta: number, eta: number, gammaPos = 0): number {
  if (t <= gammaPos) return 1;
  return Math.exp(-(((t - gammaPos) / eta) ** beta));
}

/**
 * Probabilité de panne sur Δt sachant l'âge t (GDD § 6) :
 * P = 1 − exp[−(((t+Δt−γ)/η)^β − ((t−γ)/η)^β)].
 */
export function probabilitePanne(
  age: number,
  delta: number,
  beta: number,
  eta: number,
  gammaPos = 0,
): number {
  const a = Math.max(0, age - gammaPos);
  const b = Math.max(0, age + delta - gammaPos);
  return 1 - Math.exp(-((b / eta) ** beta - (a / eta) ** beta));
}

function uniforme(state: number): { state: number; u: number } {
  const tirage = suivant(state);
  const u = Math.min(1 - EPS, Math.max(EPS, tirage.value));
  return { state: tirage.state, u };
}

/** Âge absolu de la prochaine défaillance (renouvellement ou première défaillance). */
export function tirageRenouvellement(state: number, mode: ModeDefaillance): { state: number; age: number } {
  const { state: s, u } = uniforme(state);
  const age = mode.gamma_h + mode.eta_h * (-Math.log(1 - u)) ** (1 / mode.beta);
  return { state: s, age };
}

/**
 * Prochaine défaillance d'un processus de Poisson non homogène (réparation minimale),
 * même formule que `donnees.py` : η · ((a/η)^β − ln(1−u))^(1/β).
 */
export function tirageReparationMinimale(
  state: number,
  mode: ModeDefaillance,
  ageActuel: number,
): { state: number; age: number } {
  const { state: s, u } = uniforme(state);
  const rapport = Math.max(ageActuel, 0) / mode.eta_h;
  const age = mode.eta_h * (rapport ** mode.beta - Math.log(1 - u)) ** (1 / mode.beta);
  return { state: s, age };
}

export function choisir<T>(state: number, valeurs: readonly T[]): { state: number; value: T } {
  const tirage = suivant(state);
  const index = Math.min(valeurs.length - 1, Math.floor(tirage.value * valeurs.length));
  return { state: tirage.state, value: valeurs[index] };
}

/** Loi normale centrée réduite (Box-Muller). Consomme deux uniformes. */
export function normaleCentree(state: number): { state: number; z: number } {
  const u1 = uniforme(state);
  const u2 = uniforme(u1.state);
  const z = Math.sqrt(-2 * Math.log(u1.u)) * Math.cos(2 * Math.PI * u2.u);
  return { state: u2.state, z };
}

/**
 * Durée de réparation active : log-normale de moyenne `mttr`, écart-type du log `sigma`,
 * arrondie au quart d'heure, minimum 0,25 h (GDD et `donnees.py`).
 */
export function dureeReparation(state: number, mttr: number, sigma: number): { state: number; heures: number } {
  const n = normaleCentree(state);
  const mu = Math.log(mttr) - 0.5 * sigma * sigma;
  const brut = Math.exp(mu + sigma * n.z);
  const heures = Math.max(0.25, Math.round(brut * 4) / 4);
  return { state: n.state, heures };
}

export function tirageDureesCuratives(
  state: number,
  mode: ModeDefaillance,
): { state: number; detection: number; reparation: number; remise: number } {
  const det = choisir(state, [0.25, 0.5] as const);
  const rep = dureeReparation(det.state, mode.mttr_actif_h, mode.sigma_log_reparation);
  const rem = choisir(rep.state, [0.25, 0.5, 1] as const);
  return { state: rem.state, detection: det.value, reparation: rep.heures, remise: rem.value };
}
