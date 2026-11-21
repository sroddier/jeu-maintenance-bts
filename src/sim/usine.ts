import brut from "../../data/usine.json";
import type { Equipement, ModeDefaillance, Piece, PolitiqueInitiale, Usine } from "./types";

export const usine = brut as Usine;

const MODES_NIVEAU_1 = ["REM-M1", "REM-M2"] as const;

export function equipement(id: string, source: Usine = usine): Equipement {
  const eq = source.equipements.find((e) => e.id_equipement === id);
  if (!eq) throw new Error(`Équipement ${id} introuvable dans usine.json`);
  return eq;
}

export function remplisseuse(source: Usine = usine): Equipement {
  return equipement("REM", source);
}

/** Modes joués au niveau 1, dans l'ordre de usine.json. */
export function modesNiveau1(source: Usine = usine): ModeDefaillance[] {
  const ids = new Set<string>(MODES_NIVEAU_1);
  const modes = remplisseuse(source).modes.filter((m) => ids.has(m.id_mode));
  if (modes.length !== MODES_NIVEAU_1.length) {
    throw new Error("usine.json ne contient pas REM-M1 et REM-M2");
  }
  return modes;
}

export function modeParId(id: string, source: Usine = usine): ModeDefaillance {
  const mode = modesNiveau1(source).find((m) => m.id_mode === id);
  if (!mode) throw new Error(`Mode ${id} hors niveau 1`);
  return mode;
}

export function pieceParRef(ref: string, source: Usine = usine): Piece {
  const piece = source.pieces.find((p) => p.ref === ref);
  if (!piece) throw new Error(`Pièce ${ref} introuvable dans usine.json`);
  return piece;
}

/** Pièces utiles à la remplisseuse sur les modes du niveau 1 (correctif et préventif). */
export function piecesNiveau1(source: Usine = usine): Piece[] {
  const refs = new Set<string>();
  for (const mode of modesNiveau1(source)) {
    for (const ref of mode.pieces_corrective) refs.add(ref);
    for (const ref of mode.pieces_preventive) refs.add(ref);
  }
  return source.pieces.filter((p) => refs.has(p.ref));
}

export function politiqueRemM1(source: Usine = usine): PolitiqueInitiale {
  const p = source.politique_initiale.find((x) => x.id_mode === "REM-M1");
  if (!p) throw new Error("Politique préventive REM-M1 absente de usine.json");
  return p;
}

export function heuresParSemaine(source: Usine = usine): number {
  return source.organisation.heures_ouverture_par_semaine;
}

/** 20 %/an sur 50 semaines, lu dans usine.json (le GDD retient 0,4 %/semaine). */
export function tauxPossessionSemaine(source: Usine = usine): number {
  return source.couts.cout_possession_stock_pct_par_an / 100 / 50;
}

export function delaiStandardHeures(ref: string, source: Usine = usine): number {
  return pieceParRef(ref, source).delai_standard_semaines * heuresParSemaine(source);
}

export function prixExpress(prix: number, source: Usine = usine): number {
  return prix * (1 + source.couts.majoration_express_pct / 100);
}
