import { describe, expect, it } from "vitest";
import resultats from "../reference/scripts/resultats.json";
import { fiabilite, gamma, mtbfTheorique, probabilitePanne } from "../src/sim/fiabilite";
import { graineDepuisTexte, suivant } from "../src/sim/prng";
import { modesNiveau1, usine } from "../src/sim/usine";

describe("lois de fiabilité", () => {
  it("Γ(1 + 1/β) colle à la table de l'expert", () => {
    const table = resultats.gamma_table as Record<string, number>;
    for (const [beta, attendu] of Object.entries(table)) {
      const valeur = gamma(1 + 1 / Number(beta));
      expect(valeur, `beta ${beta}`).toBeCloseTo(attendu, 4);
    }
  });

  it("MTBF théoriques des modes = γ + η·Γ(1+1/β), à 0,05 h près de usine.json", () => {
    for (const eq of usine.equipements) {
      for (const mode of eq.modes) {
        const mtbf = mtbfTheorique(mode.beta, mode.eta_h, mode.gamma_h);
        expect(mtbf, mode.id_mode).toBeCloseTo(mode.mtbf_theorique_h, 1);
      }
    }
    expect(mtbfTheorique(3, 300, 0)).toBeCloseTo(resultats.calc_fiab.MTBF_REM_M1_premiere, 1);
    expect(mtbfTheorique(2, 500, 0)).toBeCloseTo(resultats.calc_fiab.MTBF_BOU_M1, 1);
    expect(mtbfTheorique(3, 400, 100)).toBeCloseTo(resultats.calc_fiab.MTBF_FAR_M2, 1);
  });

  it("R(t) et P(panne dans la semaine) collent à calc_fiab", () => {
    const rBou = fiabilite(250, 2, 500, 0);
    expect(Math.round(rBou * 10000) / 10000).toBe(resultats.calc_fiab.R_BOU_250);
    const rEti = fiabilite(80, 1, 100, 0);
    expect(Math.round(rEti * 10000) / 10000).toBe(resultats.calc_fiab.R_ETI_80);
    const pBou = probabilitePanne(400, 80, 2, 500, 0);
    expect(Math.round(pBou * 10000) / 10000).toBe(resultats.calc_fiab.P_BOU_sem_age400);
  });

  it("le niveau 1 ne charge que REM-M1 et REM-M2, lus dans usine.json", () => {
    expect(modesNiveau1().map((m) => m.id_mode)).toEqual(["REM-M1", "REM-M2"]);
    expect(modesNiveau1()[0].mttr_actif_h).toBe(2.5);
    expect(modesNiveau1()[1].eta_h).toBe(600);
    expect(modesNiveau1().some((m) => m.id_mode === "REM-M3")).toBe(false);
  });
});

describe("mulberry32", () => {
  it("même graine, même suite ; une autre graine diverge", () => {
    const a = suite(2026, 5);
    const b = suite(2026, 5);
    const c = suite(2027, 5);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
    for (const u of a) {
      expect(u).toBeGreaterThanOrEqual(0);
      expect(u).toBeLessThan(1);
    }
  });

  it("une graine textuelle est stable", () => {
    expect(graineDepuisTexte("2026")).toBe(2026);
    expect(graineDepuisTexte("calanques")).toBe(graineDepuisTexte("calanques"));
    expect(graineDepuisTexte("calanques")).not.toBe(graineDepuisTexte("calanque"));
  });
});

function suite(seed: number, n: number): number[] {
  const valeurs: number[] = [];
  let state = seed >>> 0;
  for (let i = 0; i < n; i++) {
    const tirage = suivant(state);
    state = tirage.state;
    valeurs.push(tirage.value);
  }
  return valeurs;
}
