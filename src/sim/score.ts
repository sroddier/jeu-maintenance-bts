/**
 * Score du niveau 1, fonction pure.
 * Poids GDD : Ao du goulot 30, coût global 25, TRS 20, justesse 25.
 * Au niveau 1 les 20 points de TRS sont réaffectés à l'Ao (GDD § 9) : 50 / 25 / 25.
 * Le Do du TRS n'est pas saisi ici : il est réservé au niveau 2.
 * La note /20 = score ÷ 5, arrondie au demi-point.
 */

export interface QuestionScore {
  /** 1 si juste au premier essai, 0,5 au second, 0 si la correction a été affichée. */
  credit: number;
}

export interface EntreeScore {
  /** Ao de la remplisseuse, en %. Ao = (Tr − ΣTA) / Tr. */
  aoPct: number;
  coutGlobal: number;
  coutReference: number;
  questions: readonly QuestionScore[];
}

export interface Score {
  pointsAo: number;
  pointsCout: number;
  pointsJustesse: number;
  total: number;
  etoiles: 0 | 1 | 2 | 3;
  note20: number;
  justesseRatio: number;
  objectifAo: boolean;
  /** Ao ≥ 92 %, au moins 2 étoiles, au moins 70 % de calculs justes. */
  passage: boolean;
}

export const POIDS_NIVEAU_1 = { ao: 50, cout: 25, justesse: 25 } as const;
/** Seuil d'Ao pour réussir le niveau 1. Le sigle Do est réservé au TRS du niveau 2. */
export const OBJECTIF_AO_PCT = 92;

/**
 * 0 pt à 70 % ou moins, 40 pts à l'objectif 92 %, 50 pts à partir de 98 %.
 * Segments linéaires. Choix de prototype : le GDD fixe le poids, pas la courbe.
 */
export function pointsDisponibilite(aoPct: number): number {
  const max = POIDS_NIVEAU_1.ao;
  if (aoPct >= 98) return max;
  if (aoPct <= 70) return 0;
  if (aoPct >= OBJECTIF_AO_PCT) {
    const partiel = 40;
    return partiel + ((aoPct - OBJECTIF_AO_PCT) / (98 - OBJECTIF_AO_PCT)) * (max - partiel);
  }
  return ((aoPct - 70) / (OBJECTIF_AO_PCT - 70)) * 40;
}

/**
 * 25 pts si le coût global est inférieur ou égal à la politique de référence
 * (curatif interne, express seulement en rupture, commandes standard anticipées).
 * 0 pt si le coût atteint le double. Linéaire entre les deux.
 */
export function pointsCout(coutJoueur: number, coutReference: number): number {
  const max = POIDS_NIVEAU_1.cout;
  if (coutReference <= 0) return coutJoueur <= coutReference ? max : 0;
  if (coutJoueur <= coutReference) return max;
  const surplus = (coutJoueur - coutReference) / coutReference;
  return Math.max(0, max * (1 - surplus));
}

export function pointsJustesse(questions: readonly QuestionScore[]): number {
  if (questions.length === 0) return POIDS_NIVEAU_1.justesse;
  const credit = questions.reduce((s, q) => s + q.credit, 0);
  return POIDS_NIVEAU_1.justesse * (credit / questions.length);
}

export function creditChamp(champ: { resolu: boolean; correctionAffichee: boolean; essais: number }): number {
  if (!champ.resolu || champ.correctionAffichee) return 0;
  return champ.essais === 0 ? 1 : 0.5;
}

export function ratioJustesse(questions: readonly QuestionScore[]): number {
  if (questions.length === 0) return 1;
  return questions.reduce((s, q) => s + q.credit, 0) / questions.length;
}

export function noteSur20(score: number): number {
  return Math.round((score / 5) * 2) / 2;
}

export function etoiles(score: number): 0 | 1 | 2 | 3 {
  if (score >= 90) return 3;
  if (score >= 75) return 2;
  if (score >= 60) return 1;
  return 0;
}

export function calculerScore(entree: EntreeScore): Score {
  const pointsAo = pointsDisponibilite(entree.aoPct);
  const pointsCoutV = pointsCout(entree.coutGlobal, entree.coutReference);
  const pointsJ = pointsJustesse(entree.questions);
  const total = pointsAo + pointsCoutV + pointsJ;
  const et = etoiles(total);
  const justesse = ratioJustesse(entree.questions);
  const objectifAo = entree.aoPct + 1e-9 >= OBJECTIF_AO_PCT;
  return {
    pointsAo,
    pointsCout: pointsCoutV,
    pointsJustesse: pointsJ,
    total,
    etoiles: et,
    note20: noteSur20(total),
    justesseRatio: justesse,
    objectifAo,
    passage: objectifAo && et >= 2 && justesse + 1e-12 >= 0.7,
  };
}
