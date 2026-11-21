import { describe, expect, it } from "vitest";
import { exporterCsv } from "../src/sim/csv";
import { NIVEAU_1 } from "../src/sim/niveau1";
import {
  appliquer,
  demarrer,
  devisIntervention,
  evaluerPartie,
  jouer,
  politiqueReference,
  preventifCetteSemaine,
  quantiteStock,
  rejouer,
  type ChoixIntervention,
  type Decision,
  type Partie,
} from "../src/sim/partie";
import { heuresParSemaine, pieceParRef, politiqueRemM1, usine } from "../src/sim/usine";

describe("partie de niveau 1", () => {
  it("joue 8 tours de façon reproductible, sans REM-M3", () => {
    const a = jouer("2026", politiqueReference);
    const b = jouer("2026", politiqueReference);
    expect(a.phase).toBe("termine");
    expect(a.tour).toBe(8);
    expect(a.evenements.map(signature)).toEqual(b.evenements.map(signature));
    expect(a.possessionCumulee).toBeCloseTo(b.possessionCumulee, 6);
    expect(a.evenements.every((e) => e.id_mode_defaillance !== "REM-M3")).toBe(true);
    expect(a.evenements.every((e) => e.id_equipement === "REM")).toBe(true);
    const rejouee = rejouer("2026", "simulation", a.journal);
    expect(rejouee.evenements.map(signature)).toEqual(a.evenements.map(signature));
    expect(rejouee.possessionCumulee).toBeCloseTo(a.possessionCumulee, 6);
    expect(rejouee.phase).toBe("termine");
  });

  it("une autre graine peut changer les pannes", () => {
    const a = jouer("2026", politiqueReference);
    const b = jouer("7", politiqueReference);
    const pa = a.evenements.filter((e) => !e.hors_temps_ouverture).map((e) => e.debut_arret_h_ouverture);
    const pb = b.evenements.filter((e) => !e.hors_temps_ouverture).map((e) => e.debut_arret_h_ouverture);
    expect(pa).not.toEqual(pb);
  });

  it("le préventif des semaines 4 et 8 coûte le forfait de usine.json et remet les joints à neuf", () => {
    const fin = jouer("2026", politiqueReference);
    const preventifs = fin.evenements.filter((e) => e.type_maintenance === "preventive_systematique");
    expect(preventifs.map((e) => e.tour)).toEqual([4, 8]);
    for (const ev of preventifs) {
      expect(ev.cout_direct_eur).toBe(politiqueRemM1().cout_eur);
      expect(ev.hors_temps_ouverture).toBe(true);
      expect(ev.pieces.map((p) => p.ref)).toEqual(["P-REM-02"]);
    }
    const kit = pieceParRef("P-REM-02").prix_unitaire_eur;
    const mo =
      politiqueRemM1().duree_h *
      politiqueRemM1().nb_techniciens *
      usine.couts.taux_main_oeuvre_heures_sup_eur_par_h;
    expect(kit + mo).toBe(politiqueRemM1().cout_eur);
  });

  it("express et délai standard sortent de usine.json, le stock attend 0,25 h", () => {
    const panne = amenerUnePanne("11", "REM-M2");
    expect(quantiteStock(panne, "P-REM-03")).toBe(0);
    const express = devisIntervention(panne, choix("express"));
    const standard = devisIntervention(panne, choix("standard"));
    expect(express.erreur).toBeNull();
    expect(express.attente).toBe(usine.couts.delai_express_h);
    expect(standard.attente).toBe(pieceParRef("P-REM-03").delai_standard_semaines * heuresParSemaine());
    const prix = pieceParRef("P-REM-03").prix_unitaire_eur;
    expect(express.pieces[0]?.prixUnitaire).toBeCloseTo(prix * (1 + usine.couts.majoration_express_pct / 100), 6);
    expect(standard.pieces[0]?.prixUnitaire).toBe(prix);
    expect(express.cout?.penaliteHoraire).toBe(usine.equipements.find((e) => e.id_equipement === "REM")?.penalite_arret_eur_par_h);

    const avecStock = amenerUnePanne("11", "REM-M1");
    const stock = devisIntervention(avecStock, choix("stock"));
    expect(stock.attente).toBe(0.25);
    expect(stock.pieces[0]?.quantite).toBe(2);
    expect(stock.cout?.coutPieces).toBe(50);
  });

  it("la sous-traitance ajoute le déplacement et n'est pas plus rapide que l'arrivée à 4 h", () => {
    const panne = amenerUnePanne("11", "REM-M1");
    const devis = devisIntervention(panne, {
      nature: "curatif",
      intervenant: "sous_traitance",
      approvisionnement: "stock",
      curatifDiffere: false,
    });
    expect(devis.attente).toBe(usine.couts.sous_traitance_delai_arrivee_h);
    expect(devis.cout?.coutSousTraitance).toBeGreaterThan(usine.couts.sous_traitance_deplacement_eur);
    expect(devis.cout?.coutMainOeuvre).toBe(0);
  });

  it("un dépannage sans curatif différé fait revenir la panne, le samedi l'évite", () => {
    const retour = finirSemaine(jouerJusquaPanne("3", "REM-M1"), {
      nature: "palliatif",
      intervenant: "interne",
      approvisionnement: "stock",
      curatifDiffere: false,
    });
    const lundi = avancerJusquaIntervention(retour);
    expect(lundi.panne?.rechute).toBe(true);
    expect(lundi.panne?.modeId).toBe("REM-M1");

    const solde = finirSemaine(jouerJusquaPanne("3", "REM-M1"), {
      nature: "palliatif",
      intervenant: "interne",
      approvisionnement: "stock",
      curatifDiffere: true,
    });
    const suite = avancerJusquaIntervention(solde);
    expect(suite.panne?.rechute).not.toBe(true);
    expect(solde.evenements.some((e) => e.type_maintenance === "corrective_differee")).toBe(true);
  });

  it("la disponibilité finale reste entre 0 et 100 et la note est un demi-point", () => {
    const fin = jouer("2026", politiqueReference);
    const evaluation = evaluerPartie(fin);
    expect(evaluation.synthese.tr).toBe(NIVEAU_1.nbTours * heuresParSemaine());
    expect(evaluation.synthese.indicateurs.Ao).toBeGreaterThanOrEqual(0);
    expect(evaluation.synthese.indicateurs.Ao).toBeLessThanOrEqual(100);
    expect(evaluation.synthese.indicateurs.sommeTA).toBeLessThanOrEqual(evaluation.synthese.tr + 1e-6);
    expect(evaluation.score.note20 * 2).toBe(Math.round(evaluation.score.note20 * 2));
    expect(evaluation.score.total).toBeGreaterThan(0);
    expect(evaluation.score.pointsJustesse).toBe(25);
    const csv = exporterCsv(fin, new Date("2026-11-21T12:00:00Z"));
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("2026");
    expect(csv).toContain("note_sur_20");
    expect(csv).toContain(";");
    expect(csv).not.toContain("REM-M3");
  });

  it("le préventif tombe les semaines multiples de la période lue dans usine.json", () => {
    expect(politiqueRemM1().periode_semaines).toBe(4);
    expect(preventifCetteSemaine(4)).toBe(true);
    expect(preventifCetteSemaine(3)).toBe(false);
    expect(preventifCetteSemaine(8)).toBe(true);
  });
});

function signature(ev: { id_evenement: string; debut_arret_h_ouverture: number | null; duree_arret_totale_h: number; cout_total_eur: number }): string {
  return `${ev.id_evenement}:${ev.debut_arret_h_ouverture}:${ev.duree_arret_totale_h}:${ev.cout_total_eur}`;
}

function choix(approvisionnement: ChoixIntervention["approvisionnement"]): ChoixIntervention {
  return { nature: "curatif", intervenant: "interne", approvisionnement, curatifDiffere: false };
}

/** Avance jusqu'à la première panne du mode demandé, sans rien commander. */
function amenerUnePanne(seed: string, modeId: string): Partie {
  return jouerJusquaPanne(seed, modeId);
}

function jouerJusquaPanne(seed: string, modeId: string): Partie {
  let p = demarrer(seed, "test");
  for (let i = 0; i < 40; i++) {
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
    const assez = quantiteStock(p, p.panne.modeId === "REM-M1" ? "P-REM-01" : "P-REM-03") >= (p.panne.modeId === "REM-M1" ? 2 : 1);
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

function finirSemaine(p: Partie, choixIntervention: ChoixIntervention): Partie {
  let q = appliquer(p, { type: "intervention", choix: choixIntervention });
  for (let i = 0; i < 20 && q.phase !== "bilan"; i++) {
    if (q.phase === "evenements") q = appliquer(q, { type: "lire" });
    else if (q.phase === "intervenir" && q.panne) {
      q = appliquer(q, {
        type: "intervention",
        choix: { nature: "curatif", intervenant: "interne", approvisionnement: "express", curatifDiffere: false },
      });
    } else break;
  }
  if (q.erreur) throw new Error(q.erreur);
  if (q.phase !== "bilan") throw new Error(`bilan attendu, phase ${q.phase}`);
  return q;
}

function avancerJusquaIntervention(bilan: Partie): Partie {
  let q = bilan;
  if (q.bilan?.champs.some((c) => !c.resolu)) {
    const valeurs: Record<string, string> = {};
    for (const champ of q.bilan.champs) valeurs[champ.id] = String(champ.attendu);
    q = appliquer(q, { type: "saisie", valeurs });
  }
  q = appliquer(q, { type: "tour-suivant" });
  q = appliquer(q, { type: "planning", commandes: [] });
  if (q.phase === "evenements") q = appliquer(q, { type: "lire" });
  return q;
}
