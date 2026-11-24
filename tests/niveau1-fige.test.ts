import { describe, expect, it } from "vitest";
import reference from "../reference/scripts/reference_niveau1.json";
import { graineConsommation, tirerConsommation } from "../src/sim/consommation";
import { evaluerPartie, jouer, politiqueReference } from "../src/sim/partie";
import {
  delaiExpressNiveau1,
  delaiSemainesNiveau1,
  modeQuelconque,
  modesNiveau1,
  pieceParRef,
  stockMiniNiveau1,
  surchargesNiveau1,
  usine,
} from "../src/sim/usine";

const figé = reference.parametres_effectifs;

describe("niveau 1 figé, sauf la consommation CON-M1", () => {
  it("les paramètres effectifs de la remplisseuse collent à reference_niveau1.json", () => {
    const surcharge = surchargesNiveau1();
    expect(surcharge.delai_semaines_toutes_pieces).toBe(2);
    expect(surcharge.probabilite_retard).toBe(0);
    expect(surcharge.delai_express_h).toBe(16);
    expect(surcharge.cout_passation_commande_eur).toBe(0);
    expect(surcharge.outillage_tout_disponible).toBe(true);
    expect(surcharge.majoration_outillage_confort_pct).toBe(0);
    expect(surcharge.interdiction_sans_outillage_obligatoire).toBe(false);
    expect(delaiExpressNiveau1()).toBe(figé.pieces["P-REM-03"].delai_express_h);
    expect(figé.outillage).toBe("sans_effet");
    expect(figé.cout_passation_commande_eur).toBe(0);

    for (const mode of modesNiveau1()) {
      const attendu = figé.modes[mode.id_mode as "REM-M1" | "REM-M2"];
      expect(mode.beta).toBe(attendu.beta);
      expect(mode.eta_h).toBe(attendu.eta_h);
      expect(mode.mttr_actif_h).toBe(attendu.mttr_actif_h);
      expect(mode.pieces_corrective).toEqual(attendu.pieces_corrective);
      expect(mode.consommation_corrective).toEqual(attendu.consommation);
      expect(mode.depannage_provisoire.duree_reparation_active_h).toBe(attendu.depannage[1]);
      expect(mode.depannage_provisoire.reapparition_apres_h).toBe(attendu.depannage[2]);
    }

    for (const ref of ["P-REM-01", "P-REM-02", "P-REM-03", "P-REM-04"] as const) {
      const attendu = figé.pieces[ref];
      const catalogue = pieceParRef(ref);
      expect(catalogue.prix_unitaire_eur).toBe(attendu.prix);
      expect(catalogue.stock_initial).toBe(attendu.stock_initial);
      expect(delaiSemainesNiveau1(ref)).toBe(attendu.delai_semaines);
      expect(stockMiniNiveau1(ref)).toBe(attendu.stock_mini);
    }
  });

  it("la graine 2026 rejoue la même partie de remplisseuse", () => {
    const partie = jouer("2026", politiqueReference);
    const evaluation = evaluerPartie(partie);
    const ind = evaluation.synthese.indicateurs;
    expect(partie.rng).toBe(440014105);
    expect(partie.rngPieces).toBe(graineConsommation(2026));
    expect(partie.rngPieces).toBe(2027);
    expect(ind.N).toBe(3);
    expect(ind.sommeTA).toBe(12.75);
    expect(ind.MTTR).toBe(3.25);
    expect(ind.Ao).toBe(98.0078125);
    expect(evaluation.score.total).toBe(100);
    const pieces = partie.evenements.reduce((s, ev) => s + ev.cout_pieces_eur, 0);
    const direct = partie.evenements.reduce((s, ev) => s + ev.cout_direct_eur, 0);
    const total = partie.evenements.reduce((s, ev) => s + ev.cout_total_eur, 0);
    expect(pieces).toBe(1750);
    expect(direct).toBe(2980);
    expect(total).toBe(18880);
    expect(partie.stock.some((lot) => lot.ref === "P-CON-01" || lot.ref === "P-CON-02")).toBe(false);
    expect(partie.evenements.every((ev) => ev.id_equipement === "REM")).toBe(true);
  });

  it("CON-M1 tire P-CON-02 à 0,25 sur la graine 2027, jamais le variateur", () => {
    const mode = modeQuelconque("CON-M1");
    expect(mode.pieces_corrective).toEqual(["P-CON-01", "P-CON-02"]);
    expect(mode.consommation_corrective).toEqual([{ ref: "P-CON-02", quantite: 1, probabilite: 0.25 }]);
    expect(pieceParRef("P-CON-01").prix_unitaire_eur).toBe(450);
    expect(pieceParRef("P-CON-02").prix_unitaire_eur).toBe(600);

    let state = graineConsommation(2026);
    let cartes = 0;
    const essais = 4000;
    for (let i = 0; i < essais; i++) {
      const tirage = tirerConsommation(state, mode.consommation_corrective);
      state = tirage.state;
      expect(tirage.pieces?.every((piece) => piece.ref === "P-CON-02")).toBe(true);
      if (tirage.pieces && tirage.pieces.length > 0) cartes += 1;
      else expect(tirage.pieces).toEqual([]);
    }
    expect(cartes / essais).toBeGreaterThan(0.22);
    expect(cartes / essais).toBeLessThan(0.28);

    const rem = tirerConsommation(2027, modesNiveau1()[0]?.consommation_corrective);
    expect(rem.state).toBe(2027);
    expect(rem.pieces).toEqual([{ ref: "P-REM-01", quantite: 2 }]);
  });

  it("charge les EPI et l'outillage sans les appliquer, et n'exige pas propositions_a_valider", () => {
    const sou = modeQuelconque("SOU-M1");
    expect(sou.epi).toEqual(["gants de protection thermique", "lunettes"]);
    expect(sou.outillage_requis).toEqual([{ id_outil: "O-MULTI", exigence: "confort" }]);
    expect(usine.outillages?.some((outil) => outil.id_outil === "O-MULTI")).toBe(true);
    expect(usine.propositions_a_valider).toBeUndefined();
    const partie = jouer("2026", politiqueReference);
    expect(partie.recit.map((ligne) => ligne.texte).join(" ")).not.toMatch(/O-MULTI|outillage|gants/);
  });
});
