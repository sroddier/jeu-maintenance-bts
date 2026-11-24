import brut from "../../data/usine.json";
import type {
  DepannageProvisoire,
  Equipement,
  ModeDefaillance,
  Piece,
  PolitiqueInitiale,
  SurchargesNiveau1,
  Usine,
} from "./types";

/** Vérifie la présence des champs. Ne les applique pas : le niveau 1 les ignore. */
function charger(source: Usine): Usine {
  if (!source.evenements?.liste?.length) throw new Error("usine.json : evenements.liste est absent");
  if (!source.organisation.hors_specialite?.niveaux?.length) {
    throw new Error("usine.json : organisation.hors_specialite est absent");
  }
  if (typeof source.couts.taux_main_oeuvre_dimanche_eur_par_h !== "number") {
    throw new Error("usine.json : taux_main_oeuvre_dimanche_eur_par_h est absent");
  }
  const surcharges = source.organisation.surcharges_niveau_1;
  if (!surcharges || typeof surcharges.delai_semaines_toutes_pieces !== "number") {
    throw new Error("usine.json : organisation.surcharges_niveau_1 est absent");
  }
  if (source.propositions_a_valider !== undefined && !Array.isArray(source.propositions_a_valider)) {
    throw new Error("usine.json : propositions_a_valider n'est pas un tableau");
  }
  if (source.outillages !== undefined && !Array.isArray(source.outillages)) {
    throw new Error("usine.json : outillages n'est pas un tableau");
  }
  for (const eq of source.equipements) {
    for (const mode of eq.modes) {
      if (mode.specialite !== "electrique" && mode.specialite !== "mecanique") {
        throw new Error(`usine.json : specialite absente pour ${mode.id_mode}`);
      }
      if (typeof mode.depannage_provisoire?.duree_reparation_active_hors_specialite_h !== "number") {
        throw new Error(`usine.json : duree hors spécialité absente pour ${mode.id_mode}`);
      }
      if (mode.outillage_requis !== undefined && !Array.isArray(mode.outillage_requis)) {
        throw new Error(`usine.json : outillage_requis illisible pour ${mode.id_mode}`);
      }
      if (mode.epi !== undefined && !Array.isArray(mode.epi)) {
        throw new Error(`usine.json : epi illisible pour ${mode.id_mode}`);
      }
      if (mode.consommation_corrective !== undefined && !Array.isArray(mode.consommation_corrective)) {
        throw new Error(`usine.json : consommation_corrective illisible pour ${mode.id_mode}`);
      }
    }
  }
  return source;
}

export const usine = charger(brut as Usine);

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

/** N'importe quel mode de l'usine, y compris ceux qui ne sont pas joués au niveau 1. */
export function modeQuelconque(id: string, source: Usine = usine): ModeDefaillance {
  for (const eq of source.equipements) {
    const mode = eq.modes.find((m) => m.id_mode === id);
    if (mode) return mode;
  }
  throw new Error(`Mode ${id} introuvable dans usine.json`);
}

/** Lit l'objet figé. Lève une erreur s'il manque : pas de durée ni de délai par défaut. */
export function regleDepannage(mode: ModeDefaillance): DepannageProvisoire {
  const regle = mode.depannage_provisoire;
  if (!regle || typeof regle.autorise !== "boolean" || typeof regle.duree_reparation_active_h !== "number") {
    throw new Error(`depannage_provisoire absent pour ${mode.id_mode}`);
  }
  return regle;
}

export function depannageAutorise(mode: ModeDefaillance): boolean {
  return regleDepannage(mode).autorise;
}

/** Le choix « dépannage provisoire » n'est proposé que si le mode l'autorise. */
export function actionsProposees(mode: ModeDefaillance): Array<"curatif" | "palliatif"> {
  return depannageAutorise(mode) ? ["curatif", "palliatif"] : ["curatif"];
}

export function pieceParRef(ref: string, source: Usine = usine): Piece {
  const piece = source.pieces.find((p) => p.ref === ref);
  if (!piece) throw new Error(`Pièce ${ref} introuvable dans usine.json`);
  return piece;
}

export function surchargesNiveau1(source: Usine = usine): SurchargesNiveau1 {
  return source.organisation.surcharges_niveau_1;
}

/** Délai standard figé du niveau 1 : 2 semaines pour toutes les pièces. */
export function delaiSemainesNiveau1(_ref: string, source: Usine = usine): number {
  return surchargesNiveau1(source).delai_semaines_toutes_pieces;
}

export function stockMiniNiveau1(ref: string, source: Usine = usine): number {
  const mini = surchargesNiveau1(source).stock_mini[ref];
  if (typeof mini !== "number") throw new Error(`stock_mini niveau 1 absent pour ${ref}`);
  return mini;
}

export function delaiExpressNiveau1(source: Usine = usine): number {
  return surchargesNiveau1(source).delai_express_h;
}

/** Vue niveau 1 : délai et stock mini de la surcharge, le reste vient du catalogue. */
export function pieceVueNiveau1(piece: Piece, source: Usine = usine): Piece {
  return {
    ...piece,
    delai_semaines: delaiSemainesNiveau1(piece.ref, source),
    stock_mini: stockMiniNiveau1(piece.ref, source),
  };
}

/** Pièces utiles à la remplisseuse sur les modes du niveau 1 (correctif et préventif). */
export function piecesNiveau1(source: Usine = usine): Piece[] {
  const refs = new Set<string>();
  for (const mode of modesNiveau1(source)) {
    for (const ref of mode.pieces_corrective) refs.add(ref);
    for (const ref of mode.pieces_preventive) refs.add(ref);
  }
  return source.pieces.filter((p) => refs.has(p.ref)).map((p) => pieceVueNiveau1(p, source));
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
  return delaiSemainesNiveau1(ref, source) * heuresParSemaine(source);
}

export function prixExpress(prix: number, source: Usine = usine): number {
  return prix * (1 + source.couts.majoration_express_pct / 100);
}
