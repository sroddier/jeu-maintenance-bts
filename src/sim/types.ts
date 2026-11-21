/** Formes lues dans `data/usine.json` (source unique de vérité). */

export interface MetaUsine {
  nom: string;
  version: string;
  date?: string;
  avertissement?: string;
  unites?: string;
}

export interface Organisation {
  postes_par_jour: number;
  heures_par_poste: number;
  jours_par_semaine: number;
  heures_ouverture_par_semaine: number;
  horaires: string;
  produit: string;
  marge_sur_cout_variable_eur_par_bouteille: number;
  cout_rebut_eur_par_bouteille: number;
  coefficient_propagation_arret_hors_goulot: number;
}

export interface CoutsUsine {
  taux_main_oeuvre_eur_par_h: number;
  taux_main_oeuvre_heures_sup_eur_par_h: number;
  sous_traitance_eur_par_h: number;
  sous_traitance_deplacement_eur: number;
  sous_traitance_delai_arrivee_h: number;
  majoration_express_pct: number;
  delai_express_h: number;
  cout_possession_stock_pct_par_an: number;
  penalite_arret_goulot_eur_par_h: number;
  penalite_arret_autre_eur_par_h: number;
}

export interface PolitiqueInitiale {
  id_mode: string;
  type_maintenance: string;
  action: string;
  periode_semaines: number;
  hors_temps_ouverture: boolean;
  duree_h: number;
  nb_techniciens: number;
  cout_eur: number;
}

export interface Piece {
  ref: string;
  designation: string;
  prix_unitaire_eur: number;
  delai_standard_semaines: number;
  stock_initial: number;
  stock_mini: number;
}

export interface SousEnsemble {
  id_sous_ensemble: string;
  designation: string;
}

export interface ModeDefaillance {
  id_mode: string;
  id_sous_ensemble: string;
  designation: string;
  loi: "exponentielle" | "weibull";
  beta: number;
  eta_h: number;
  gamma_h: number;
  lambda_par_h: number | null;
  mtbf_theorique_h: number;
  effet_correctif: "renouvellement" | "reparation_minimale";
  mttr_actif_h: number;
  sigma_log_reparation: number;
  pieces_corrective: string[];
  pieces_preventive: string[];
  mode_detection: string;
  probabilite_piece_en_stock: number;
}

export interface Equipement {
  id_equipement: string;
  designation: string;
  fonction: string;
  cadence_nominale_bouteilles_par_h: number;
  goulot: boolean;
  penalite_arret_eur_par_h: number;
  sous_ensembles: SousEnsemble[];
  modes: ModeDefaillance[];
  mtbf_theorique_equipement_h: number | null;
}

export interface Usine {
  meta: MetaUsine;
  organisation: Organisation;
  couts: CoutsUsine;
  politique_initiale: PolitiqueInitiale[];
  pieces: Piece[];
  equipements: Equipement[];
}

/** Événement réduit, commun à l'historique d'exercice et à la partie. */
export interface EvenementCalcul {
  id_equipement: string;
  type_maintenance: string;
  hors_temps_ouverture: boolean;
  duree_arret_totale_h: number;
  duree_reparation_active_h: number;
  duree_attente_logistique_h: number;
  cout_direct_eur: number;
  cout_indirect_eur: number;
  cout_total_eur: number;
}

export interface Indicateurs {
  N: number;
  sommeTA: number;
  sommeReparation: number;
  sommeAttente: number;
  sommeTBF: number;
  /** null si N = 0 (non défini). */
  MTBF: number | null;
  MTTR: number | null;
  MDT: number | null;
  /** Disponibilité opérationnelle au sens maintenance, en %. Définie même si N = 0. */
  Ao: number;
  Ai: number | null;
  coutDirect: number;
  coutIndirect: number;
  coutTotal: number;
}
