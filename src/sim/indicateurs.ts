import type { EvenementCalcul, Indicateurs } from "./types";

/**
 * Filtre identique à `calculs.py` : correctif (immédiat ou différé) pendant l'ouverture.
 *
 * Une rechute après dépannage provisoire est un nouvel événement pendant l'ouverture :
 * +1 à N, son TA entre dans ΣTA, sa réparation active dans le MTTR. Son TBF est le temps
 * de bon fonctionnement depuis la fin du dépannage (40 h si la ligne n'a pas été arrêtée entre-temps).
 * Le dépannage provisoire lui-même est aussi un événement.
 *
 * Le curatif différé du samedi (`hors_temps_ouverture`) est exclu de N, de ΣTA et du MTTR.
 * Ses coûts directs sont hors de ces indicateurs d'arrêt : ils sont dans `sommesCouts`
 * et dans le coût global de la partie.
 */
export function estArretCompte(e: EvenementCalcul): boolean {
  return e.type_maintenance.startsWith("corrective") && !e.hors_temps_ouverture;
}

export function indicateursEquipement(
  evenements: readonly EvenementCalcul[],
  idEquipement: string,
  tr: number,
): Indicateurs {
  if (tr <= 0) throw new Error("Tr doit être strictement positif");
  const ev = evenements.filter((e) => e.id_equipement === idEquipement && estArretCompte(e));
  const N = ev.length;
  const sommeTA = somme(ev.map((e) => e.duree_arret_totale_h));
  const sommeReparation = somme(ev.map((e) => e.duree_reparation_active_h));
  const sommeAttente = somme(ev.map((e) => e.duree_attente_logistique_h));
  const sommeTBF = tr - sommeTA;
  const MTBF = N > 0 ? sommeTBF / N : null;
  const MTTR = N > 0 ? sommeReparation / N : null;
  const MDT = N > 0 ? sommeTA / N : null;
  const Ao = (sommeTBF / tr) * 100;
  const Ai = MTBF !== null && MTTR !== null && MTBF + MTTR > 0 ? (MTBF / (MTBF + MTTR)) * 100 : null;
  return {
    N,
    sommeTA,
    sommeReparation,
    sommeAttente,
    sommeTBF,
    MTBF,
    MTTR,
    MDT,
    Ao,
    Ai,
    coutDirect: somme(ev.map((e) => e.cout_direct_eur)),
    coutIndirect: somme(ev.map((e) => e.cout_indirect_eur)),
    coutTotal: somme(ev.map((e) => e.cout_total_eur)),
  };
}

export function sommesCouts(evenements: readonly EvenementCalcul[]): {
  direct: number;
  indirect: number;
  total: number;
} {
  const direct = somme(evenements.map((e) => e.cout_direct_eur));
  const indirect = somme(evenements.map((e) => e.cout_indirect_eur));
  return { direct, indirect, total: direct + indirect };
}

function somme(valeurs: number[]): number {
  return valeurs.reduce((a, b) => a + b, 0);
}
