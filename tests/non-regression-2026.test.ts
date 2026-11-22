import { describe, expect, it } from "vitest";
import { choisirBlague } from "../src/narration/blagues";
import { lireEtat } from "../src/narration/etat";
import { evaluerReactions, memoireVide } from "../src/narration/reactions";
import { semaineVisiteClient } from "../src/narration/prng";
import { NIVEAU_1 } from "../src/sim/niveau1";
import { appliquer, demarrer, evaluerPartie, jouer, politiqueReference, type Partie } from "../src/sim/partie";

describe("non-régression seed 2026", () => {
  it("la narration ne change ni le PRNG ni les corrigés", () => {
    const reference = jouer("2026", politiqueReference);
    const avecNarration = jouerEnLisantLaNarration("2026");
    expect(empreinte(avecNarration)).toBe(empreinte(reference));
    expect(empreinte(reference)).toMatchInlineSnapshot(`
      "rng=440014105
      score=100
      ao=98.0078125
      PA-0001|REM-M2|corrective_immediate|4.5|6120|false
      PA-0002|REM-M1|corrective_immediate|5.75|7390|false
      PA-0003|REM-M1|preventive_systematique|8|1000|false
      PA-0004|REM-M1|corrective_immediate|2.5|3370|false
      PA-0005|REM-M1|preventive_systematique|8|1000|false"
    `);
  });
});

function jouerEnLisantLaNarration(seed: string): Partie {
  let partie = demarrer(seed, "simulation");
  let memoire = memoireVide();
  let vues: string[] = [];
  const semaine = semaineVisiteClient(partie.seed, NIVEAU_1.nbTours);
  while (partie.phase !== "termine") {
    const etat = lireEtat(partie);
    memoire = evaluerReactions(etat, memoire).memoire;
    vues = choisirBlague(partie.seed, etat.phase, vues).vues;
    if (etat.tour === semaine) vues = choisirBlague(partie.seed, "chargement", vues).vues;
    partie = appliquer(partie, politiqueReference(partie));
    if (partie.erreur) throw new Error(partie.erreur);
  }
  return partie;
}

function empreinte(partie: Partie): string {
  const score = evaluerPartie(partie);
  const lignes = partie.evenements.map(
    (ev) =>
      `${ev.id_evenement}|${ev.id_mode_defaillance}|${ev.type_maintenance}|${ev.duree_arret_totale_h}|${ev.cout_total_eur}|${ev.reparation_provisoire}`,
  );
  return [`rng=${partie.rng}`, `score=${score.score.total}`, `ao=${score.synthese.indicateurs.Ao}`, ...lignes].join("\n");
}
