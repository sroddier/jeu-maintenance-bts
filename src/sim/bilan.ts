import { evaluerSaisie, type ContexteSaisie, type EvaluationSaisie, type IdChamp } from "./saisie";

export interface ChampBilan {
  id: IdChamp;
  libelle: string;
  attendu: number;
  essais: number;
  resolu: boolean;
  correctionAffichee: boolean;
  valeurSaisie: number | null;
  dernierMessage: string | null;
}

export interface BilanTour {
  tour: number;
  tr: number;
  n: number;
  sommeTA: number;
  sommeReparation: number;
  champs: ChampBilan[];
}

export function contexteDepuisBilan(bilan: BilanTour): ContexteSaisie {
  const mtbf = bilan.n > 0 ? (bilan.tr - bilan.sommeTA) / bilan.n : null;
  const mttr = bilan.n > 0 ? bilan.sommeReparation / bilan.n : null;
  const mdt = bilan.n > 0 ? bilan.sommeTA / bilan.n : null;
  const ai = mtbf !== null && mttr !== null && mtbf + mttr > 0 ? (mtbf / (mtbf + mttr)) * 100 : null;
  const dispo = ((bilan.tr - bilan.sommeTA) / bilan.tr) * 100;
  return {
    tr: bilan.tr,
    n: bilan.n,
    sommeTA: bilan.sommeTA,
    sommeReparation: bilan.sommeReparation,
    mtbf,
    mttr,
    mdt,
    ai,
    dispo,
  };
}

export function evaluerChampBilan(id: IdChamp, raw: string, ctx: ContexteSaisie): EvaluationSaisie {
  return evaluerSaisie(id, raw, ctx);
}
