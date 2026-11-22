import Ajv from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
import schema from "../reference/schema_equipement.json";
import { evenementsExercice, TR_EXERCICE_H } from "../src/sim/exercice";
import { indicateursEquipement } from "../src/sim/indicateurs";
import { appliquer, demarrer, devisIntervention, jouer, politiqueReference, type Decision, type Partie } from "../src/sim/partie";
import { modeQuelconque, usine } from "../src/sim/usine";

describe("chargement et validation de usine.json", () => {
  it("respecte schema_equipement.json", () => {
    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
    const valide = ajv.compile(schema);
    const ok = valide(usine);
    expect(valide.errors ?? [], JSON.stringify(valide.errors, null, 2)).toEqual([]);
    expect(ok).toBe(true);
  });

  it("charge les champs hors niveau 1 sans les appliquer", () => {
    expect(usine.organisation.hors_specialite.majoration_reparation_active_pct).toBe(25);
    expect(usine.organisation.hors_specialite.niveaux).toEqual([2, 3, 4, 5, 6]);
    expect(usine.organisation.hors_specialite.niveaux).not.toContain(1);
    expect(usine.couts.taux_main_oeuvre_dimanche_eur_par_h).toBe(80);
    expect(usine.couts.taux_main_oeuvre_eur_par_h).toBe(40);
    expect(usine.evenements.liste.map((e) => e.id_evenement)).toEqual([
      "E01",
      "E02",
      "E03",
      "E04",
      "E05",
      "E06",
      "E07",
      "E08",
    ]);
    const chiffres = usine.evenements.liste.filter((e) => e.effet_numerique);
    expect(chiffres.every((e) => !e.niveaux.includes(1))).toBe(true);

    const rem = modeQuelconque("REM-M1");
    expect(rem.specialite).toBe("mecanique");
    expect(rem.depannage_provisoire.duree_reparation_active_h).toBe(1);
    expect(rem.depannage_provisoire.duree_reparation_active_hors_specialite_h).toBe(1.25);

    const panne = jusquaPanne("11", "REM-M1");
    const devis = devisIntervention(panne, {
      nature: "palliatif",
      intervenant: "interne",
      approvisionnement: "stock",
      curatifDiffere: false,
    });
    expect(devis.reparation).toBe(1);
    expect(devis.reparation).not.toBe(1.25);

    const partie = jouer("2026", politiqueReference);
    const idsSpeciaux = new Set(usine.evenements.liste.map((e) => e.id_evenement));
    expect(partie.evenements.some((e) => idsSpeciaux.has(e.id_evenement))).toBe(false);
    const recit = partie.recit.map((l) => l.texte).join(" ");
    expect(recit).not.toMatch(/Canicule|Pièce livrée fausse|Commande urgente|Visite d'un client/);
    for (const ev of partie.evenements) {
      if (ev.intervenant !== "interne" || ev.heures_main_oeuvre_h <= 0) continue;
      const taux = ev.hors_temps_ouverture
        ? usine.couts.taux_main_oeuvre_heures_sup_eur_par_h
        : usine.couts.taux_main_oeuvre_eur_par_h;
      if (ev.type_maintenance === "preventive_systematique") continue;
      expect(ev.cout_main_oeuvre_eur).toBeCloseTo(ev.heures_main_oeuvre_h * taux, 2);
      expect(taux).not.toBe(usine.couts.taux_main_oeuvre_dimanche_eur_par_h);
    }
  });

  it("laisse les corrigés d'exercice inchangés", () => {
    const rem = indicateursEquipement(evenementsExercice(), "REM", TR_EXERCICE_H);
    expect(rem.MTBF).toBe(180);
    expect(rem.MTTR).toBe(7.5);
    expect(rem.Ao).toBeCloseTo(90, 6);
    expect(evenementsExercice().find((e) => e.id_evenement === "EX-0017")?.cout_total_eur).toBe(72550);
  });
});

function jusquaPanne(seed: string, modeId: string): Partie {
  let p = demarrer(seed, "test");
  for (let i = 0; i < 80; i++) {
    if (p.phase === "intervenir" && p.panne?.modeId === modeId) return p;
    p = appliquer(p, decision(p, modeId));
    if (p.erreur) throw new Error(p.erreur);
  }
  throw new Error(`Panne ${modeId} introuvable`);
}

function decision(p: Partie, modeId: string): Decision {
  if (p.phase === "planifier") return { type: "planning", commandes: [] };
  if (p.phase === "evenements") return { type: "lire" };
  if (p.phase === "intervenir" && p.panne && p.panne.modeId !== modeId) {
    return politiqueReference(p);
  }
  if (p.phase === "bilan" && p.bilan?.champs.some((c) => !c.resolu)) {
    const valeurs: Record<string, string> = {};
    for (const champ of p.bilan.champs) if (!champ.resolu) valeurs[champ.id] = String(champ.attendu);
    return { type: "saisie", valeurs };
  }
  return { type: "tour-suivant" };
}
