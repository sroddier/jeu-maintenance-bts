import type { Usine } from "./types";
import { equipement, usine as usineDefaut } from "./usine";

export interface PieceFacturee {
  ref: string;
  quantite: number;
  prixUnitaire: number;
}

export interface ParametresCout {
  usine?: Usine;
  idEquipement: string;
  detection: number;
  attente: number;
  reparation: number;
  remise: number;
  nbTechniciens: number;
  intervenant: "interne" | "sous_traitance";
  horsOuverture: boolean;
  pieces: readonly PieceFacturee[];
  rebuts: number;
}

export interface DetailCout {
  ta: number;
  heuresMainOeuvre: number;
  coutPieces: number;
  coutMainOeuvre: number;
  coutSousTraitance: number;
  coutDirect: number;
  penaliteHoraire: number;
  coutArret: number;
  coutRebuts: number;
  coutIndirect: number;
  coutTotal: number;
}

/**
 * Coût direct = pièces + main-d'œuvre interne + sous-traitance.
 * Coût indirect = arrêt × pénalité de l'équipement + rebuts.
 * Hors ouverture : pas de pénalité d'arrêt, main-d'œuvre au taux des heures supplémentaires.
 * La sous-traitance est facturée (réparation + remise) × taux + déplacement, une équipe.
 */
export function calculerCout(p: ParametresCout): DetailCout {
  const source = p.usine ?? usineDefaut;
  const ta = p.detection + p.attente + p.reparation + p.remise;
  const heuresActives = p.reparation + p.remise;
  const coutPieces = round2(p.pieces.reduce((s, x) => s + x.quantite * x.prixUnitaire, 0));
  let coutMainOeuvre = 0;
  let coutSousTraitance = 0;
  let heuresMainOeuvre = 0;
  if (p.intervenant === "sous_traitance") {
    coutSousTraitance = round2(heuresActives * source.couts.sous_traitance_eur_par_h + source.couts.sous_traitance_deplacement_eur);
  } else {
    const taux = p.horsOuverture
      ? source.couts.taux_main_oeuvre_heures_sup_eur_par_h
      : source.couts.taux_main_oeuvre_eur_par_h;
    heuresMainOeuvre = heuresActives * p.nbTechniciens;
    coutMainOeuvre = round2(heuresMainOeuvre * taux);
  }
  const coutDirect = round2(coutPieces + coutMainOeuvre + coutSousTraitance);
  const penaliteHoraire = p.horsOuverture ? 0 : equipement(p.idEquipement, source).penalite_arret_eur_par_h;
  const coutArret = round2(ta * penaliteHoraire);
  const coutRebuts = round2(p.rebuts * source.organisation.cout_rebut_eur_par_bouteille);
  const coutIndirect = round2(coutArret + coutRebuts);
  return {
    ta: round4(ta),
    heuresMainOeuvre: round4(heuresMainOeuvre),
    coutPieces,
    coutMainOeuvre,
    coutSousTraitance,
    coutDirect,
    penaliteHoraire,
    coutArret,
    coutRebuts,
    coutIndirect,
    coutTotal: round2(coutDirect + coutIndirect),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
