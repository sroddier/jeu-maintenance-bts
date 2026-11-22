import { describe, expect, it } from "vitest";
import resultats from "../reference/scripts/resultats.json";
import { calculerCout } from "../src/sim/couts";
import { evenementsExercice, pannesRemplisseuseExercice, TR_EXERCICE_H } from "../src/sim/exercice";
import { estArretCompte, indicateursEquipement, sommesCouts } from "../src/sim/indicateurs";
import { usine } from "../src/sim/usine";

const EQUIPEMENTS = ["SOU", "REM", "BOU", "ETI", "FAR", "CON"] as const;

describe("indicateurs de l'historique d'exercice", () => {
  const evenements = evenementsExercice();

  it.each(EQUIPEMENTS)("%s : MTBF, MTTR, MDT, Ao et coûts collent à resultats.json", (eq) => {
    const calcul = indicateursEquipement(evenements, eq, TR_EXERCICE_H);
    const attendu = resultats.indicateurs[eq];
    expect(calcul.N).toBe(attendu.N);
    expect(calcul.sommeTA).toBeCloseTo(attendu.somme_TA_h, 6);
    expect(calcul.sommeReparation).toBeCloseTo(attendu.somme_reparation_h, 6);
    expect(calcul.sommeAttente).toBeCloseTo(attendu.somme_attente_h, 6);
    expect(calcul.sommeTBF).toBeCloseTo(attendu.somme_TBF_h, 6);
    expect(calcul.MTBF).toBeCloseTo(attendu.MTBF_h, 6);
    expect(calcul.MTTR).toBeCloseTo(attendu.MTTR_h, 6);
    expect(calcul.MDT).toBeCloseTo(attendu.MDT_h, 6);
    expect(calcul.Ao).toBeCloseTo(attendu.Ao_pct, 6);
    expect(calcul.Ai).toBeCloseTo(attendu.Ai_pct_exact, 6);
    expect(calcul.coutDirect).toBeCloseTo(attendu.cout_direct_eur, 6);
    expect(calcul.coutIndirect).toBeCloseTo(attendu.cout_indirect_eur, 6);
    expect(calcul.coutTotal).toBeCloseTo(attendu.cout_total_eur, 6);
  });

  it("remplisseuse : les valeurs de calculatrice du GDD", () => {
    const rem = indicateursEquipement(evenements, "REM", TR_EXERCICE_H);
    expect(rem.N).toBe(4);
    expect(rem.MTBF).toBe(180);
    expect(rem.MTTR).toBe(7.5);
    expect(rem.MDT).toBe(20);
    expect(rem.Ao).toBeCloseTo(90, 6);
    expect(rem.Ai).toBeCloseTo(96, 6);
    expect(pannesRemplisseuseExercice().map((e) => e.id_evenement)).toEqual([
      "EX-0004",
      "EX-0007",
      "EX-0016",
      "EX-0017",
    ]);
  });

  it("la disponibilité opérationnelle du niveau 1 est l'Ao (90 %), pas le Do du TRS (75 %)", () => {
    const rem = indicateursEquipement(evenements, "REM", TR_EXERCICE_H);
    expect(rem.Ao).toBeCloseTo(90, 6);
    expect(resultats.trs.Do).toBe(75);
    expect(rem.Ao).not.toBeCloseTo(resultats.trs.Do, 1);
  });

  it("les coûts globaux de l'exercice, préventif compris", () => {
    const couts = sommesCouts(evenements);
    expect(couts.direct).toBeCloseTo(resultats.couts.direct, 6);
    expect(couts.indirect).toBeCloseTo(resultats.couts.indirect, 6);
    expect(couts.total).toBeCloseTo(resultats.couts.total, 6);
  });
});

describe("recalcul des coûts depuis usine.json", () => {
  it("chaque événement d'exercice retrouve les coûts stockés", () => {
    for (const ev of evenementsExercice()) {
      const cout = calculerCout({
        usine,
        idEquipement: ev.id_equipement,
        detection: ev.duree_detection_h,
        attente: ev.duree_attente_logistique_h,
        reparation: ev.duree_reparation_active_h,
        remise: ev.duree_remise_en_service_h,
        nbTechniciens: ev.nb_techniciens,
        intervenant: ev.intervenant === "sous_traitance" ? "sous_traitance" : "interne",
        horsOuverture: ev.hors_temps_ouverture,
        pieces: ev.pieces.map((p) => ({ ref: p.ref, quantite: p.quantite, prixUnitaire: p.prix_unitaire_eur })),
        rebuts: ev.nb_rebuts_bouteilles,
      });
      expect(cout.ta, ev.id_evenement).toBeCloseTo(ev.duree_arret_totale_h, 6);
      expect(cout.coutDirect, ev.id_evenement).toBeCloseTo(ev.cout_direct_eur, 2);
      expect(cout.coutIndirect, ev.id_evenement).toBeCloseTo(ev.cout_indirect_eur, 2);
      expect(cout.coutTotal, ev.id_evenement).toBeCloseTo(ev.cout_total_eur, 2);
      expect(cout.coutMainOeuvre, ev.id_evenement).toBeCloseTo(ev.cout_main_oeuvre_eur, 2);
      expect(cout.coutPieces, ev.id_evenement).toBeCloseTo(ev.cout_pieces_eur, 2);
    }
  });

  it("les lignes d'exercice à 0 h d'attente et les dépannages fournis ne sont pas régénérés", () => {
    const parId = Object.fromEntries(evenementsExercice().map((e) => [e.id_evenement, e]));
    expect(parId["EX-0004"]?.duree_attente_logistique_h).toBe(0);
    expect(parId["EX-0016"]?.duree_attente_logistique_h).toBe(0);
    expect(parId["EX-0002"]?.reparation_provisoire).toBe(true);
    expect(parId["EX-0002"]?.duree_reparation_active_h).toBe(0.5);
    expect(parId["EX-0002"]?.duree_attente_logistique_h).toBe(1.5);
    expect(parId["EX-0013"]?.reparation_provisoire).toBe(true);
    expect(parId["EX-0013"]?.duree_reparation_active_h).toBe(0.5);
    expect(parId["EX-0013"]?.duree_attente_logistique_h).toBe(2.5);
    expect(parId["EX-0201"]?.hors_temps_ouverture).toBe(true);
    expect(parId["EX-0201"]?.type_maintenance).toBe("corrective_differee");
    expect(parId["EX-0201"]?.cout_direct_eur).toBeGreaterThan(0);
    expect(parId["EX-0202"]?.hors_temps_ouverture).toBe(true);
    expect(parId["EX-0202"]?.cout_direct_eur).toBeGreaterThan(0);
    const eti = indicateursEquipement(evenementsExercice(), "ETI", TR_EXERCICE_H);
    const comptes = evenementsExercice().filter((e) => e.id_equipement === "ETI" && estArretCompte(e));
    expect(eti.N).toBe(comptes.length);
    expect(comptes.map((e) => e.id_evenement)).not.toEqual(expect.arrayContaining(["EX-0201", "EX-0202"]));
    expect(comptes.map((e) => e.id_evenement)).toEqual(expect.arrayContaining(["EX-0002", "EX-0013"]));
    const hors = (parId["EX-0201"]?.cout_direct_eur ?? 0) + (parId["EX-0202"]?.cout_direct_eur ?? 0);
    expect(sommesCouts(evenementsExercice()).direct).toBeGreaterThanOrEqual(eti.coutDirect + hors);
  });

  it("EX-0017 coûte 72 550 € et EX-0004 coûte 4 000 €", () => {
    const ex17 = evenementsExercice().find((e) => e.id_evenement === "EX-0017");
    const ex04 = evenementsExercice().find((e) => e.id_evenement === "EX-0004");
    expect(ex17?.cout_total_eur).toBe(72550);
    expect(ex04?.cout_total_eur).toBe(4000);
    expect(resultats.ex17.cout_total_eur).toBe(72550);
  });
});
