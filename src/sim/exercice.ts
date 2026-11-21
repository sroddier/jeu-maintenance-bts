import historique from "../../reference/historique_pannes.json";
import type { BilanTour, ChampBilan } from "./bilan";
import { indicateursEquipement } from "./indicateurs";
import type { EvenementCalcul } from "./types";

interface EvenementExercice extends EvenementCalcul {
  id_evenement: string;
  id_mode_defaillance: string;
  description: string;
  action: string;
  reparation_provisoire: boolean;
  debut_arret_h_ouverture: number | null;
  duree_detection_h: number;
  duree_remise_en_service_h: number;
  nb_rebuts_bouteilles: number;
  cout_pieces_eur: number;
  cout_main_oeuvre_eur: number;
  cout_sous_traitance_eur: number;
  nb_techniciens: number;
  intervenant: "interne" | "sous_traitance" | "mixte";
  pieces: { ref: string; quantite: number; prix_unitaire_eur: number }[];
  hors_temps_ouverture: boolean;
}

export const TR_EXERCICE_H = 800;

const evenements = historique as EvenementExercice[];

export function evenementsExercice(): EvenementExercice[] {
  return evenements;
}

export function pannesRemplisseuseExercice(): EvenementExercice[] {
  return evenements.filter(
    (e) => e.id_equipement === "REM" && e.type_maintenance.startsWith("corrective") && !e.hors_temps_ouverture,
  );
}

export function bilanExerciceRemplisseuse(): BilanTour {
  const ind = indicateursEquipement(evenements, "REM", TR_EXERCICE_H);
  if (ind.MTBF === null || ind.MTTR === null) throw new Error("L'exercice remplisseuse n'a pas de panne");
  const champs: ChampBilan[] = [
    champ("mtbf", "MTBF (h)", ind.MTBF),
    champ("mttr", "MTTR (h)", ind.MTTR),
    champ("ao", "Ao — disponibilité opérationnelle (%)", ind.Ao),
  ];
  return { tour: 10, tr: TR_EXERCICE_H, n: ind.N, sommeTA: ind.sommeTA, sommeReparation: ind.sommeReparation, champs };
}

function champ(id: ChampBilan["id"], libelle: string, attendu: number): ChampBilan {
  return {
    id,
    libelle,
    attendu,
    essais: 0,
    resolu: false,
    correctionAffichee: false,
    valeurSaisie: null,
    dernierMessage: null,
  };
}
