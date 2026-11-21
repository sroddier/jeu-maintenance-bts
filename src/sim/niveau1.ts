/**
 * Réglages de game design absents de usine.json (GDD : valeurs provisoires).
 * Les coûts, délais, lois et stocks viennent de usine.json, pas d'ici.
 */
export const NIVEAU_1 = {
  nbTours: 8,
  nbTechniciens: 2,
  /** Budget affiché, non utilisé comme plafond de la note : une attente de sonde dépasse déjà 15 000 € via l'arrêt. */
  budgetEur: 15_000,
  /** Dépannage provisoire : pas dans usine.json. Tient jusqu'au samedi (voir partie.ts). */
  reparationPalliativeH: 0.5,
  remisePalliativeH: 0.25,
  /**
   * Rebuts calés sur l'historique d'exercice (REM-M1 : 1 200, REM-M2 : 600).
   * Le palliatif n'a pas d'équivalent : 200 bouteilles, choix de prototype.
   */
  rebutsCuratif: { "REM-M1": 1200, "REM-M2": 600 } as Record<string, number>,
  rebutsPalliatif: 200,
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
