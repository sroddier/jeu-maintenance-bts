import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { choisirBlague } from "../src/narration/blagues";
import {
  blagues,
  boutonPasser,
  ecransIntro,
  evenementsTexte,
  objectifAoPct,
  paliersColere,
  personnages,
  reactions,
} from "../src/narration/contenu";
import { arretDansSemaine, heureAlerteVendredi, lireEtat, type EtatNarratif } from "../src/narration/etat";
import { joindreBase, slotsImages } from "../src/narration/images";
import { evaluerReactions, memoireVide, niveauInclus, SEUIL_PALLIATIF_H } from "../src/narration/reactions";
import { graineNarrative, semaineVisiteClient } from "../src/narration/prng";
import { idsEvenementsAffiches, carteVisiteClient } from "../src/narration/visite";
import { demarrer } from "../src/sim/partie";
import { graineDepuisTexte } from "../src/sim/prng";
import { OBJECTIF_DO_PCT } from "../src/sim/score";
import { heuresParSemaine, remplisseuse, usine } from "../src/sim/usine";
import narratif from "../data/narratif.json";

function etat(partiel: Partial<EtatNarratif> = {}): EtatNarratif {
  return {
    niveau: 1,
    tour: 1,
    phase: "planifier",
    heure: 0,
    semaineDebut: 0,
    heuresSemaine: 80,
    arretSemaineH: 0,
    aoSemainePct: 100,
    trsPct: null,
    depensesEur: 0,
    budgetEur: 15_000,
    apresVendredi13: false,
    preventifRealise: false,
    bilan: null,
    palliatifs: [],
    palliatifsSansCuratif: [],
    curatifsSansPiece: [],
    stocksSousMini: [],
    ruptures: [],
    expresses: [],
    ...partiel,
  };
}

function ids(partiel: Partial<EtatNarratif>, memoire = memoireVide()): string[] {
  return evaluerReactions(etat(partiel), memoire).reactions.map((reaction) => reaction.id);
}

describe("réactions", () => {
  it("couvre les 18 réactions, dans l'ordre de priorité et sans dépasser trois par phase", () => {
    expect(reactions.map((reaction) => reaction.id)).toEqual([
      "R01", "R02", "R03", "R04", "R05", "R06", "R07", "R08", "R09", "R10",
      "R11", "R12", "R13", "R14", "R15", "R16", "R17", "R18",
    ]);
    expect(ids({ arretSemaineH: 1.9 })).not.toContain("R01");
    expect(ids({ arretSemaineH: 2 })).toContain("R01");
    expect(ids({ arretSemaineH: 5 })[0]).toBe("R02");
    expect(ids({ arretSemaineH: 10 })[0]).toBe("R03");
    expect(ids({ arretSemaineH: 20 })[0]).toBe("R04");
    expect(ids({ phase: "bilan", aoSemainePct: 91.9 })).not.toContain("R05");
    expect(ids({ phase: "bilan", aoSemainePct: 92 })).toContain("R05");
    expect(ids({ phase: "bilan", trsPct: 70 })).not.toContain("R06");
    expect(ids({ niveau: 2, phase: "bilan", trsPct: 65 })).toContain("R06");
    expect(ids({ palliatifs: [{ cle: "PA-1", heuresAvantSamedi: SEUIL_PALLIATIF_H }] })).not.toContain("R07");
    expect(ids({ palliatifs: [{ cle: "PA-1", heuresAvantSamedi: SEUIL_PALLIATIF_H + 1 }] })).toContain("R07");
    expect(ids({ apresVendredi13: true, palliatifsSansCuratif: [{ cle: "PA-2" }] })).toContain("R08");
    expect(ids({ curatifsSansPiece: [{ cle: "PA-3", ref: "P-REM-03" }] })).toContain("R09");
    expect(ids({ stocksSousMini: [{ ref: "P-REM-03" }] })).toContain("R10");
    expect(ids({ ruptures: [{ cle: "panne", ref: "P-REM-03" }] })).toContain("R11");
    expect(ids({ depensesEur: 11_249 })).not.toContain("R12");
    expect(ids({ depensesEur: 11_250 })).toEqual(["R12"]);
    expect(ids({ depensesEur: 13_500 })).toEqual(["R13"]);
    expect(ids({ depensesEur: 15_000 })).toEqual(["R13"]);
    expect(ids({ depensesEur: 15_001 })).toEqual(["R14"]);
    expect(ids({ preventifRealise: true, phase: "evenements" })).toContain("R15");
    expect(ids({ phase: "bilan", bilan: { tousJustesPremierCoup: true, correctionAffichee: false } })).toContain("R16");
    expect(ids({ phase: "bilan", bilan: { tousJustesPremierCoup: false, correctionAffichee: true } })).toContain("R17");
    expect(ids({ expresses: [{ cle: "plan-0-0" }] })).toContain("R18");
  });

  it("ne répète pas une réaction déjà vue et réarme le stock", () => {
    const premier = evaluerReactions(etat({ stocksSousMini: [{ ref: "P-REM-03" }] }), memoireVide());
    expect(premier.reactions.map((reaction) => reaction.id)).toEqual(["R10"]);
    const encore = evaluerReactions(etat({ stocksSousMini: [{ ref: "P-REM-03" }] }), premier.memoire);
    expect(encore.reactions).toEqual([]);
    const relache = evaluerReactions(etat({ stocksSousMini: [] }), premier.memoire);
    const retour = evaluerReactions(etat({ tour: 2, stocksSousMini: [{ ref: "P-REM-03" }] }), relache.memoire);
    expect(retour.reactions.map((reaction) => reaction.id)).toEqual(["R10"]);
    expect(retour.reactions[0]?.cle).not.toBe(premier.reactions[0]?.cle);
  });

  it("limite R04 à deux fois dans la partie et oublie la colère le lundi", () => {
    let memoire = memoireVide();
    memoire = evaluerReactions(etat({ tour: 1, arretSemaineH: 20 }), memoire).memoire;
    memoire = evaluerReactions(etat({ tour: 2, arretSemaineH: 20 }), memoire).memoire;
    expect(ids({ tour: 3, arretSemaineH: 20 }, memoire)[0]).toBe("R03");
    expect(ids({ tour: 2, arretSemaineH: 1 })).not.toContain("R01");
    const saute = evaluerReactions(etat({ arretSemaineH: 12 }), memoireVide());
    expect(saute.reactions.map((reaction) => reaction.id)).toEqual(["R03"]);
    expect(evaluerReactions(etat({ arretSemaineH: 12 }), saute.memoire).reactions).toEqual([]);
  });

  it("affiche au plus trois réactions par phase, la colère d'abord", () => {
    const riche = etat({
      phase: "bilan",
      arretSemaineH: 20,
      depensesEur: 16_000,
      aoSemainePct: 96,
      preventifRealise: true,
      bilan: { tousJustesPremierCoup: true, correctionAffichee: false },
      expresses: [{ cle: "e" }],
      stocksSousMini: [{ ref: "P-REM-03" }],
    });
    const resultat = evaluerReactions(riche, memoireVide());
    expect(resultat.reactions.length).toBe(3);
    expect(resultat.reactions[0]?.id).toBe("R04");
    expect(evaluerReactions(riche, resultat.memoire).reactions).toEqual([]);
  });

  it("prend les textes dans narratif.json et ne modifie pas l'état", () => {
    const courant = etat({ arretSemaineH: 2 });
    const gele = structuredClone(courant);
    const resultat = evaluerReactions(courant, memoireVide());
    expect(resultat.reactions[0]?.replique).toBe(reactions.find((reaction) => reaction.id === "R01")?.replique);
    expect(resultat.reactions[0]?.portrait).not.toContain("fachee");
    expect(evaluerReactions(etat({ arretSemaineH: 5 }), memoireVide()).reactions[0]?.portrait).toContain("fachee");
    expect(courant).toEqual(gele);
  });

  it("ignore les niveaux hors plage", () => {
    expect(niveauInclus("1–6", 1)).toBe(true);
    expect(niveauInclus("2–6", 1)).toBe(false);
    expect(ids({ niveau: 7, arretSemaineH: 20 })).toEqual([]);
  });
});

describe("visite client et blagues", () => {
  it("n'affiche que E08, sur un PRNG séparé de la simulation", () => {
    expect(idsEvenementsAffiches(1)).toEqual(["E08"]);
    expect(idsEvenementsAffiches(4)).toEqual(["E08"]);
    expect(graineNarrative(2026)).toBe(2027);
    expect(graineNarrative(2026)).not.toBe(graineDepuisTexte("2026"));
    const semaine = semaineVisiteClient(2026, 8);
    expect(semaineVisiteClient(2026, 8)).toBe(semaine);
    expect(semaine).toBeGreaterThanOrEqual(1);
    expect(semaine).toBeLessThanOrEqual(8);
    expect(carteVisiteClient(2026, semaine, 8, 1)?.id_evenement).toBe("E08");
    expect(carteVisiteClient(2026, semaine === 1 ? 2 : 1, 8, 1)).toBeNull();
    const partie = demarrer("2026", "camille");
    const avant = structuredClone(partie);
    carteVisiteClient(partie.seed, 1, 8, 1);
    choisirBlague(partie.seed, "planifier", []);
    expect(partie).toEqual(avant);
  });

  it("tire une blague par phase sans la répéter", () => {
    const premiere = choisirBlague(2026, "planifier", []);
    const identique = choisirBlague(2026, "planifier", []);
    expect(premiere.blague?.id).toBe(identique.blague?.id);
    expect(premiere.blague?.texte).toBe(blagues.find((blague) => blague.id === premiere.blague?.id)?.texte);
    const suivante = choisirBlague(2026, "planifier", premiere.vues);
    expect(suivante.blague?.id).not.toBe(premiere.blague?.id);
    let vues = premiere.vues;
    for (let i = 0; i < 6; i++) vues = choisirBlague(2026, "planifier", vues).vues;
    expect(choisirBlague(2026, "planifier", vues).blague).toBeNull();
  });
});

describe("cohérence avec usine.json", () => {
  it("recalcule les paliers de colère et les faits d'intro depuis l'usine", () => {
    const penalite = remplisseuse().penalite_arret_eur_par_h;
    const heures = heuresParSemaine();
    expect(heureAlerteVendredi()).toBe(72);
    expect(paliersColere.map((palier) => palier.seuil_h)).toEqual([2, 5, 10, 20]);
    expect(paliersColere[3]?.seuil_h).toBe(heures * 0.25);
    for (const [index, id] of ["R01", "R02", "R03", "R04"].entries()) {
      const reaction = reactions.find((item) => item.id === id);
      const texte = `${reaction?.replique ?? ""} ${reaction?.condition ?? ""}`;
      expect(contientNombre(texte, paliersColere[index]!.seuil_h * penalite)).toBe(true);
    }
    expect(objectifAoPct(1)).toBe(OBJECTIF_DO_PCT);
    expect(ecransIntro).toHaveLength(7);
    expect(boutonPasser).toBe("Passer la visite");
    expect(contientNombre(ecran("SOU").fait_cle, cadence("SOU"))).toBe(true);
    expect(ecran("SOU").fait_cle).toContain("non goulot");
    expect(usine.equipements.find((item) => item.id_equipement === "SOU")?.goulot).toBe(false);
    expect(contientNombre(ecran("REM").fait_cle, cadence("REM"))).toBe(true);
    expect(ecran("REM").fait_cle).toContain("GOULOT");
    expect(remplisseuse().goulot).toBe(true);
    expect(contientNombre(ecran("REM").fait_cle, mode("REM", "REM-M1").beta)).toBe(true);
    expect(contientNombre(ecran("REM").fait_cle, mode("REM", "REM-M1").eta_h)).toBe(true);
    expect(contientNombre(ecransIntro[6]!.fait_cle, heures)).toBe(true);
    expect(contientNombre(ecransIntro[6]!.fait_cle, usine.couts.taux_main_oeuvre_eur_par_h)).toBe(true);
    expect(contientNombre(ecransIntro[6]!.fait_cle, usine.couts.taux_main_oeuvre_heures_sup_eur_par_h)).toBe(true);
    const arret = [{ type_maintenance: "corrective_immediate", hors_temps_ouverture: false, debut_arret_h_ouverture: 70, duree_arret_totale_h: 20 }];
    expect(arretDansSemaine(arret, 0, 80)).toBe(10);
    expect(arretDansSemaine(arret, 80, 160)).toBe(10);
  });

  it("ne recopie pas les paramètres chiffrés des événements", () => {
    expect(evenementsTexte.map((evenement) => evenement.id_evenement)).toEqual(["E01", "E02", "E03", "E04", "E05", "E06", "E07", "E08"]);
    for (const evenement of evenementsTexte) {
      expect(Object.keys(evenement).sort()).toEqual(["id_evenement", "image", "nom", "personnage"]);
      expect(personnages.some((personnage) => personnage.id === evenement.personnage)).toBe(true);
    }
    const brut = JSON.stringify(narratif.evenements);
    expect(brut).not.toMatch(/probabilite|frequence|cout_eur|niveaux|effet/i);
  });

  it("relie les 31 images à une silhouette", () => {
    const slots = slotsImages();
    expect(slots).toHaveLength(31);
    const fichiers = new Set(readdirSync("public/assets/img"));
    for (const slot of slots) {
      const nom = slot.fichier.split("/").pop()?.replace(/\.(webp|png)$/i, ".svg");
      expect(fichiers.has(nom ?? "")).toBe(true);
      expect(slot.width).toBeGreaterThan(0);
      expect(slot.height).toBeGreaterThan(0);
    }
    expect(joindreBase("/jeu-maintenance-bts/", "assets/img/intro-01-souffleuse.webp")).toBe(
      "/jeu-maintenance-bts/assets/img/intro-01-souffleuse.webp",
    );
    expect(joindreBase("/jeu-maintenance-bts", "/assets/img/portrait-directrice.png")).toBe(
      "/jeu-maintenance-bts/assets/img/portrait-directrice.png",
    );
  });

  it("lit l'état sans y toucher", () => {
    const partie = demarrer("2026", "camille");
    const avant = structuredClone(partie);
    const lu = lireEtat(partie);
    expect(lu.stocksSousMini.map((stock) => stock.ref)).toContain("P-REM-03");
    expect(lu.arretSemaineH).toBe(0);
    expect(evaluerReactions(lu, memoireVide()).reactions.map((reaction) => reaction.id)).toEqual(["R10"]);
    expect(partie).toEqual(avant);
    expect(sourcesNarratives()).not.toContain("Réunion de crise à 14 h");
  });
});

function ecran(id: string) {
  const trouve = ecransIntro.find((item) => item.id_equipement === id);
  if (!trouve) throw new Error(id);
  return trouve;
}

function cadence(id: string): number {
  return usine.equipements.find((item) => item.id_equipement === id)?.cadence_nominale_bouteilles_par_h ?? 0;
}

function mode(equipement: string, id: string) {
  const trouve = usine.equipements.find((item) => item.id_equipement === equipement)?.modes.find((item) => item.id_mode === id);
  if (!trouve) throw new Error(id);
  return trouve;
}

function contientNombre(texte: string, valeur: number): boolean {
  const plat = texte.replace(/[\u202f\u00a0]/g, " ");
  const compact = plat.replace(/\s/g, "");
  const variantes = new Set([
    String(valeur),
    String(valeur).replace(".", ","),
    new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(valeur).replace(/[\u202f\u00a0]/g, " "),
  ]);
  for (const variante of variantes) {
    if (plat.includes(variante) || compact.includes(variante.replace(/\s/g, ""))) return true;
  }
  return false;
}

function sourcesNarratives(): string {
  const fichiers = lister("src/narration").concat(lister("src/ui/narration.ts"));
  return fichiers.map((fichier) => readFileSync(fichier, "utf8")).join("\n");
}

function lister(cible: string): string[] {
  try {
    const stats = readdirSync(cible, { withFileTypes: true });
    return stats.flatMap((entree) => {
      const suivant = `${cible}/${entree.name}`;
      return entree.isDirectory() ? lister(suivant) : suivant.endsWith(".ts") ? [suivant] : [];
    });
  } catch {
    return [cible];
  }
}
