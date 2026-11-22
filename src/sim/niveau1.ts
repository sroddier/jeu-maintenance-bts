/**
 * Réglages de game design absents de usine.json (GDD : valeurs provisoires).
 * Les coûts, délais, lois, stocks et la règle de dépannage provisoire viennent de usine.json.
 *
 * Plus tard, ne pas coder ici :
 * - niveau 5 : le coût global devient un critère de passage (≤ 90 % de la partie de référence) ;
 * - niveau 6 : le budget devient un critère.
 * Au niveau 1 il n'y a pas de plafond de budget.
 *
 * Chargés dans usine.json et ignorés ici (moteur prévu plus tard) :
 * evenements.liste, specialite, duree_reparation_active_hors_specialite_h,
 * organisation.hors_specialite et taux_main_oeuvre_dimanche_eur_par_h.
 * E04, la liste canicule, le taux du dimanche et le volume de la commande urgente
 * attendent encore la validation de Steph.
 */
export const NIVEAU_1 = {
  nbTours: 8,
  nbTechniciens: 2,
  /**
   * Rebuts calés sur l'historique d'exercice (REM-M1 : 1 200, REM-M2 : 600).
   * Le dépannage provisoire ne consomme pas de pièce ; les rebuts ne sont pas dans usine.json, ils restent à 0.
   */
  rebutsCuratif: { "REM-M1": 1200, "REM-M2": 600 } as Record<string, number>,
  /**
   * Quantité consommée. L'exercice et `donnees.py` posent 2 kits P-REM-01 par fuite de joint.
   * Les autres modes : 1 pièce.
   */
  quantiteCorrective: { "REM-M1": 2 } as Record<string, number>,
} as const;

export function quantiteCorrective(modeId: string): number {
  return NIVEAU_1.quantiteCorrective[modeId] ?? 1;
}

export function rebutsCuratif(modeId: string): number {
  return NIVEAU_1.rebutsCuratif[modeId] ?? 0;
}
