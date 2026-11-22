import { describe, expect, it } from "vitest";
import { estArretCompte, indicateursEquipement, sommesCouts } from "../src/sim/indicateurs";
import {
  appliquer,
  demarrer,
  devisIntervention,
  type ChoixIntervention,
  type Decision,
  type Partie,
} from "../src/sim/partie";
import type { EvenementCalcul } from "../src/sim/types";
import { actionsProposees, modeQuelconque, regleDepannage } from "../src/sim/usine";

describe("dépannage provisoire lu dans usine.json", () => {
  it("masque le choix quand autorise est faux (REM-M3, FAR-M1)", () => {
    const rem3 = modeQuelconque("REM-M3");
    const far1 = modeQuelconque("FAR-M1");
    expect(regleDepannage(rem3).autorise).toBe(false);
    expect(regleDepannage(far1).autorise).toBe(false);
    expect(regleDepannage(rem3).justification).toMatch(/Motoréducteur/);
    expect(regleDepannage(far1).justification).toMatch(/Résistance/);
    expect(actionsProposees(rem3)).toEqual(["curatif"]);
    expect(actionsProposees(far1)).toEqual(["curatif"]);
    expect(actionsProposees(modeQuelconque("REM-M1"))).toEqual(["curatif", "palliatif"]);
    expect(actionsProposees(modeQuelconque("REM-M2"))).toEqual(["curatif", "palliatif"]);
  });

  it("REM-M1 dure 1 h, sans pièce, détection et remise en service inchangées", () => {
    const panne = jouerJusquaPanne("11", "REM-M1");
    const avant = panne.panne;
    if (!avant) throw new Error("panne absente");
    const devis = devisIntervention(panne, palliatif(false));
    expect(devis.erreur).toBeNull();
    expect(devis.reparation).toBe(1);
    expect(devis.reparation).toBe(regleDepannage(modeQuelconque("REM-M1")).duree_reparation_active_h);
    expect(devis.pieces).toEqual([]);
    expect(devis.detection).toBe(avant.detection);
    expect(devis.remise).toBe(avant.remise);
    expect(devis.attente).toBe(0);
    expect(regleDepannage(modeQuelconque("REM-M1")).pieces).toEqual([]);
    expect(regleDepannage(modeQuelconque("REM-M1")).reapparition_apres_h).toBe(40);
  });
});

describe("comptage d'une rechute après dépannage", () => {
  it("ETI-M1 : dépannage puis rechute 40 h après, N = 2, ΣTA = 3 h, MTTR = 0,5 h", () => {
    const mode = modeQuelconque("ETI-M1");
    const regle = regleDepannage(mode);
    const det = 0.5;
    const repDep = regle.duree_reparation_active_h;
    const rs = 0.5;
    const debut = 100;
    const fin = debut + det + repDep + rs;
    const rechute = fin + regle.reapparition_apres_h;
    const repCuratif = mode.mttr_actif_h;
    expect(repDep).toBe(0.25);
    expect(rechute - fin).toBe(40);
    const evenements = [
      arret("ETI", det + repDep + rs, repDep),
      arret("ETI", det + repCuratif + rs, repCuratif),
    ];
    const ind = indicateursEquipement(evenements, "ETI", 800);
    expect(ind.N).toBe(2);
    expect(ind.sommeTA).toBeCloseTo(3, 6);
    expect(ind.MTTR).toBeCloseTo(0.5, 6);
  });

  it("la rechute à 40 h d'ouverture est annulée par le curatif du samedi, dont les coûts directs comptent", () => {
    const scene = trouverCuratifSamedi();
    const samedi = scene.evenements.find((e) => e.type_maintenance === "corrective_differee");
    if (!samedi) throw new Error("curatif différé absent");
    expect(samedi.hors_temps_ouverture).toBe(true);
    expect(samedi.cout_direct_eur).toBeGreaterThan(0);
    expect(scene.reapparitions).toEqual([]);
    const tr = scene.tour * 80;
    const ind = indicateursEquipement(scene.evenements, "REM", tr);
    const comptes = scene.evenements.filter((e) => estArretCompte(e));
    expect(ind.N).toBe(comptes.length);
    expect(comptes.some((e) => e.type_maintenance === "corrective_differee")).toBe(false);
    expect(ind.sommeReparation).toBeCloseTo(
      comptes.reduce((s, e) => s + e.duree_reparation_active_h, 0),
      6,
    );
    const directsHors = scene.evenements
      .filter((e) => e.hors_temps_ouverture)
      .reduce((s, e) => s + e.cout_direct_eur, 0);
    expect(directsHors).toBeGreaterThanOrEqual(samedi.cout_direct_eur);
    expect(sommesCouts(scene.evenements).direct).toBeCloseTo(ind.coutDirect + directsHors, 2);

    let suite = scene;
    if (suite.bilan?.champs.some((c) => !c.resolu)) {
      const valeurs: Record<string, string> = {};
      for (const champ of suite.bilan.champs) valeurs[champ.id] = String(champ.attendu);
      suite = appliquer(suite, { type: "saisie", valeurs });
    }
    suite = appliquer(suite, { type: "tour-suivant" });
    suite = appliquer(suite, { type: "planning", commandes: [] });
    if (suite.phase === "evenements") suite = appliquer(suite, { type: "lire" });
    expect(suite.panne?.rechute).not.toBe(true);
  });

  it("sans curatif différé, la panne revient 40 h d'ouverture après la fin du dépannage", () => {
    const scene = trouverRechute();
    expect(scene.panne?.rechute).toBe(true);
    expect(scene.panne?.modeId).toBe("REM-M1");
    expect(scene.panne?.tbfPrecedent).toBeCloseTo(40, 3);
    const dep = scene.evenements.find((e) => e.reparation_provisoire);
    if (!dep || dep.debut_arret_h_ouverture === null || scene.panne === null) throw new Error("dépannage absent");
    expect(dep.duree_reparation_active_h).toBe(1);
    expect(dep.pieces).toEqual([]);
    const fin = dep.debut_arret_h_ouverture + dep.duree_arret_totale_h;
    expect(scene.panne.heure).toBeCloseTo(fin + 40, 3);
  });
});

function arret(id: string, ta: number, reparation: number): EvenementCalcul {
  return {
    id_equipement: id,
    type_maintenance: "corrective_immediate",
    hors_temps_ouverture: false,
    duree_arret_totale_h: ta,
    duree_reparation_active_h: reparation,
    duree_attente_logistique_h: 0,
    cout_direct_eur: 0,
    cout_indirect_eur: 0,
    cout_total_eur: 0,
  };
}

function palliatif(curatifDiffere: boolean): ChoixIntervention {
  return { nature: "palliatif", intervenant: "interne", approvisionnement: "stock", curatifDiffere };
}

function trouverRechute(): Partie {
  for (let seed = 1; seed <= 60; seed++) {
    let p: Partie;
    try {
      p = jouerJusquaPanne(String(seed), "REM-M1");
    } catch {
      continue;
    }
    const panne = p.panne;
    if (!panne) continue;
    const q = appliquer(p, { type: "intervention", choix: palliatif(false) });
    if (q.erreur || !q.panne?.rechute) continue;
    const dep = q.evenements.find((e) => e.reparation_provisoire);
    if (!dep || dep.debut_arret_h_ouverture === null) continue;
    const fin = dep.debut_arret_h_ouverture + dep.duree_arret_totale_h;
    if (Math.abs(q.panne.heure - (fin + 40)) > 1e-3) continue;
    return q;
  }
  throw new Error("aucune graine ne produit une rechute 40 h après le dépannage");
}

function trouverCuratifSamedi(): Partie {
  for (let seed = 1; seed <= 80; seed++) {
    let p: Partie;
    try {
      p = jouerJusquaPanne(String(seed), "REM-M1");
    } catch {
      continue;
    }
    const panne = p.panne;
    if (!panne) continue;
    if (panne.heure - p.semaineDebut < 36) continue;
    let q = appliquer(p, { type: "intervention", choix: palliatif(true) });
    if (q.erreur) continue;
    const dep = [...q.evenements].reverse().find((e) => e.reparation_provisoire);
    if (!dep || dep.debut_arret_h_ouverture === null) continue;
    const fin = dep.debut_arret_h_ouverture + dep.duree_arret_totale_h;
    if (fin + 40 < p.semaineDebut + 80) continue;
    for (let i = 0; i < 30 && q.phase !== "bilan"; i++) {
      if (q.phase === "evenements") q = appliquer(q, { type: "lire" });
      else if (q.phase === "intervenir" && q.panne) {
        q = appliquer(q, {
          type: "intervention",
          choix: { nature: "curatif", intervenant: "interne", approvisionnement: "express", curatifDiffere: false },
        });
      } else break;
      if (q.erreur) break;
    }
    if (q.erreur || q.phase !== "bilan") continue;
    if (!q.evenements.some((e) => e.type_maintenance === "corrective_differee")) continue;
    return q;
  }
  throw new Error("aucune graine ne laisse un curatif différé annuler la réapparition");
}

function jouerJusquaPanne(seed: string, modeId: string): Partie {
  let p = demarrer(seed, "test");
  for (let i = 0; i < 80; i++) {
    if (p.phase === "termine") break;
    if (p.phase === "intervenir" && p.panne?.modeId === modeId) return p;
    p = appliquer(p, decisionPourAtteindre(p, modeId));
    if (p.erreur) throw new Error(p.erreur);
  }
  throw new Error(`Panne ${modeId} introuvable avec la graine ${seed}`);
}

function decisionPourAtteindre(p: Partie, modeId: string): Decision {
  if (p.phase === "planifier") return { type: "planning", commandes: [] };
  if (p.phase === "evenements") return { type: "lire" };
  if (p.phase === "intervenir" && p.panne) {
    if (p.panne.modeId === modeId) throw new Error("déjà sur la panne");
    const assez =
      quantite(p, p.panne.modeId === "REM-M1" ? "P-REM-01" : "P-REM-03") >= (p.panne.modeId === "REM-M1" ? 2 : 1);
    return {
      type: "intervention",
      choix: {
        nature: "curatif",
        intervenant: "interne",
        approvisionnement: assez ? "stock" : "express",
        curatifDiffere: false,
      },
    };
  }
  if (p.phase === "bilan" && p.bilan?.champs.some((c) => !c.resolu)) {
    const valeurs: Record<string, string> = {};
    for (const champ of p.bilan.champs) if (!champ.resolu) valeurs[champ.id] = String(champ.attendu);
    return { type: "saisie", valeurs };
  }
  return { type: "tour-suivant" };
}

function quantite(p: Partie, ref: string): number {
  return p.stock.filter((lot) => lot.ref === ref).reduce((s, lot) => s + lot.qte, 0);
}
