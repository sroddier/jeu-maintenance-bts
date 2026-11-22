import type { Partie } from "./partie";
import { evaluerPartie } from "./partie";

/** CSV pour le professeur : séparateur « ; », décimales avec un point, comme les historiques experts. */
export function exporterCsv(p: Partie, quand = new Date()): string {
  const { synthese, reference, score } = evaluerPartie(p);
  const lignes: string[][] = [];
  lignes.push(["section", "cle", "valeur"]);
  lignes.push(["synthese", "pseudo", p.pseudo]);
  lignes.push(["synthese", "graine", p.seedLabel]);
  lignes.push(["synthese", "graine_uint32", String(p.seed)]);
  lignes.push(["synthese", "date", quand.toISOString()]);
  lignes.push(["synthese", "niveau", "1"]);
  lignes.push(["synthese", "tours", String(p.tour)]);
  lignes.push(["synthese", "score", num(score.total)]);
  lignes.push(["synthese", "note_sur_20", num(score.note20)]);
  lignes.push(["synthese", "etoiles", String(score.etoiles)]);
  lignes.push(["synthese", "points_ao", num(score.pointsAo)]);
  lignes.push(["synthese", "points_cout", num(score.pointsCout)]);
  lignes.push(["synthese", "points_justesse", num(score.pointsJustesse)]);
  lignes.push(["synthese", "justesse_ratio", num(score.justesseRatio)]);
  lignes.push(["synthese", "ao_pct", num(synthese.indicateurs.Ao)]);
  lignes.push(["synthese", "mtbf_h", num(synthese.indicateurs.MTBF)]);
  lignes.push(["synthese", "mttr_h", num(synthese.indicateurs.MTTR)]);
  lignes.push(["synthese", "mdt_h", num(synthese.indicateurs.MDT)]);
  lignes.push(["synthese", "n_pannes", String(synthese.indicateurs.N)]);
  lignes.push(["synthese", "somme_ta_h", num(synthese.indicateurs.sommeTA)]);
  lignes.push(["synthese", "tr_h", num(synthese.tr)]);
  lignes.push(["synthese", "cout_direct_eur", num(synthese.coutDirect)]);
  lignes.push(["synthese", "cout_indirect_eur", num(synthese.coutIndirect)]);
  lignes.push(["synthese", "cout_possession_eur", num(synthese.possession)]);
  lignes.push(["synthese", "cout_global_eur", num(synthese.coutGlobal)]);
  lignes.push(["synthese", "cout_reference_eur", num(reference.coutGlobal)]);
  lignes.push(["synthese", "objectif_ao_92", score.objectifAo ? "oui" : "non"]);
  lignes.push(["synthese", "passage", score.passage ? "oui" : "non"]);
  lignes.push(["synthese", "niveau_1", score.passage ? "niveau réussi" : "niveau non réussi"]);
  lignes.push(["synthese", "nb_preventifs", String(synthese.nbPreventifs)]);
  lignes.push([]);
  lignes.push(ENTETE_EVENEMENT);
  for (const ev of p.evenements) {
    lignes.push([
      "evenement",
      ev.id_evenement,
      String(ev.tour),
      ev.id_mode_defaillance,
      ev.type_maintenance,
      ev.action,
      ev.reparation_provisoire ? "oui" : "non",
      ev.hors_temps_ouverture ? "oui" : "non",
      ev.intervenant,
      num(ev.debut_arret_h_ouverture),
      num(ev.duree_detection_h),
      num(ev.duree_attente_logistique_h),
      num(ev.duree_reparation_active_h),
      num(ev.duree_remise_en_service_h),
      num(ev.duree_arret_totale_h),
      String(ev.nb_techniciens),
      ev.pieces.map((x) => `${x.ref}x${x.quantite}`).join("|"),
      num(ev.cout_direct_eur),
      num(ev.cout_indirect_eur),
      num(ev.cout_total_eur),
      String(ev.nb_rebuts_bouteilles),
      ev.tronque ? "oui" : "non",
      ev.rechute ? "oui" : "non",
    ]);
  }
  lignes.push([]);
  lignes.push(["saisie", "tour", "indicateur", "attendu", "saisi", "essais", "credit", "correction_affichee"]);
  for (const bilan of p.bilansClos) {
    for (const champ of bilan.champs) {
      const credit = !champ.resolu || champ.correctionAffichee ? 0 : champ.essais === 0 ? 1 : 0.5;
      lignes.push([
        "saisie",
        String(bilan.tour),
        champ.id,
        num(champ.attendu),
        num(champ.valeurSaisie),
        String(champ.essais),
        num(credit),
        champ.correctionAffichee ? "oui" : "non",
      ]);
    }
  }
  return `\uFEFF${lignes.map((ligne) => ligne.map(cellule).join(";")).join("\r\n")}\r\n`;
}

const ENTETE_EVENEMENT = [
  "section",
  "id",
  "tour",
  "mode",
  "type",
  "action",
  "provisoire",
  "hors_ouverture",
  "intervenant",
  "debut_h",
  "detection_h",
  "attente_h",
  "reparation_h",
  "remise_h",
  "ta_h",
  "nb_techniciens",
  "pieces",
  "cout_direct_eur",
  "cout_indirect_eur",
  "cout_total_eur",
  "rebuts",
  "tronque",
  "rechute",
];

function num(valeur: number | null | undefined): string {
  if (valeur === null || valeur === undefined || Number.isNaN(valeur)) return "";
  return String(Math.round(valeur * 10000) / 10000);
}

function cellule(valeur: string): string {
  if (/[;"\r\n]/.test(valeur)) return `"${valeur.replace(/"/g, '""')}"`;
  return valeur;
}

export function nomFichierCsv(pseudo: string, seed: string): string {
  const base = `${pseudo || "eleve"}-${seed || "graine"}`.replace(/[^\p{L}\p{N}_-]+/gu, "-");
  return `resultats-niveau1-${base}.csv`;
}
