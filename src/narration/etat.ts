import { NIVEAU_1, quantiteCorrective } from "../sim/niveau1";
import { quantiteEnCommande, quantiteStock, type Partie } from "../sim/partie";
import { heuresParSemaine, modeParId, piecesNiveau1, usine } from "../sim/usine";

export interface BilanNarratif {
  tousJustesPremierCoup: boolean;
  correctionAffichee: boolean;
}

export interface EtatNarratif {
  niveau: number;
  tour: number;
  phase: Partie["phase"];
  heure: number;
  semaineDebut: number;
  heuresSemaine: number;
  /** Arrêt de ligne compté dans la semaine en cours (les samedis n'y entrent pas). Remis à zéro le lundi. */
  arretSemaineH: number;
  aoSemainePct: number;
  /** null au niveau 1 : le TRS n'est pas dans l'état joué. */
  trsPct: number | null;
  depensesEur: number;
  budgetEur: number;
  apresVendredi13: boolean;
  preventifRealise: boolean;
  bilan: BilanNarratif | null;
  palliatifs: { cle: string; heuresAvantSamedi: number }[];
  palliatifsSansCuratif: { cle: string }[];
  curatifsSansPiece: { cle: string; ref: string }[];
  stocksSousMini: { ref: string }[];
  ruptures: { cle: string; ref: string }[];
  expresses: { cle: string }[];
}

/**
 * Heure d'ouverture où tombe le vendredi 13:00.
 * 13 h est l'heure citée par la réplique R08. Le découpage des journées vient de usine.json.
 */
export function heureAlerteVendredi(): number {
  const org = usine.organisation;
  const match = /(\d{1,2}):(\d{2})/.exec(org.horaires);
  const ouverture = match ? Number(match[1]) : 5;
  const heuresJour = org.postes_par_jour * org.heures_par_poste;
  const vendredi = (org.jours_par_semaine - 1) * heuresJour;
  return vendredi + (13 - ouverture);
}

export function lireEtat(partie: Partie, niveau = 1): EtatNarratif {
  const heures = heuresParSemaine();
  const debut = partie.semaineDebut;
  const fin = debut + heures;
  const arret = arretDansSemaine(partie.evenements, debut, fin);
  const champs = partie.bilan?.champs ?? [];
  const bilan = partie.bilan
    ? {
        tousJustesPremierCoup:
          champs.length > 0 && champs.every((champ) => champ.resolu && !champ.correctionAffichee && champ.essais === 0),
        correctionAffichee: champs.some((champ) => champ.correctionAffichee),
      }
    : null;
  return {
    niveau,
    tour: partie.tour,
    phase: partie.phase,
    heure: partie.heure,
    semaineDebut: debut,
    heuresSemaine: heures,
    arretSemaineH: arret,
    aoSemainePct: ((heures - arret) / heures) * 100,
    trsPct: null,
    depensesEur: Math.round((partie.evenements.reduce((somme, ev) => somme + ev.cout_total_eur, 0) + partie.possessionCumulee) * 100) / 100,
    budgetEur: NIVEAU_1.budgetEur,
    apresVendredi13: partie.heure + 1e-9 >= debut + heureAlerteVendredi(),
    preventifRealise: partie.evenements.some((ev) => ev.tour === partie.tour && ev.type_maintenance === "preventive_systematique"),
    bilan,
    palliatifs: palliatifsDe(partie, heures),
    palliatifsSansCuratif: palliatifsSansCuratif(partie),
    curatifsSansPiece: curatifsSansPiece(partie),
    stocksSousMini: stocksSousMini(partie),
    ruptures: rupturesDe(partie),
    expresses: expressesDe(partie),
  };
}

export function arretDansSemaine(
  evenements: readonly { type_maintenance: string; hors_temps_ouverture: boolean; debut_arret_h_ouverture: number | null; duree_arret_totale_h: number }[],
  debut: number,
  fin: number,
): number {
  let arret = 0;
  for (const ev of evenements) {
    if (!ev.type_maintenance.startsWith("corrective") || ev.hors_temps_ouverture || ev.debut_arret_h_ouverture === null) continue;
    const a = ev.debut_arret_h_ouverture;
    const b = a + ev.duree_arret_totale_h;
    arret += Math.max(0, Math.min(b, fin) - Math.max(a, debut));
  }
  return arret;
}

export function cleEtat(etat: EtatNarratif): string {
  return [
    etat.tour,
    etat.phase,
    etat.arretSemaineH.toFixed(3),
    etat.aoSemainePct.toFixed(3),
    etat.depensesEur,
    etat.apresVendredi13 ? 1 : 0,
    etat.preventifRealise ? 1 : 0,
    etat.bilan ? `${etat.bilan.tousJustesPremierCoup}:${etat.bilan.correctionAffichee}` : "-",
    etat.palliatifs.map((item) => item.cle).join(","),
    etat.palliatifsSansCuratif.map((item) => item.cle).join(","),
    etat.curatifsSansPiece.map((item) => item.cle).join(","),
    etat.stocksSousMini.map((item) => item.ref).join(","),
    etat.ruptures.map((item) => item.cle).join(","),
    etat.expresses.map((item) => item.cle).join(","),
  ].join("|");
}

function palliatifsDe(partie: Partie, heures: number): { cle: string; heuresAvantSamedi: number }[] {
  return partie.evenements
    .filter((ev) => ev.reparation_provisoire && ev.debut_arret_h_ouverture !== null)
    .map((ev) => ({
      cle: ev.id_evenement,
      heuresAvantSamedi: ev.tour * heures - (ev.debut_arret_h_ouverture ?? 0),
    }));
}

function decisionsIntervention(partie: Partie): Extract<Partie["journal"][number], { type: "intervention" }>[] {
  return partie.journal.filter((decision) => decision.type === "intervention");
}

function palliatifsSansCuratif(partie: Partie): { cle: string }[] {
  const decisions = decisionsIntervention(partie);
  const immediates = partie.evenements.filter((ev) => ev.type_maintenance === "corrective_immediate");
  const resultat: { cle: string }[] = [];
  immediates.forEach((ev, index) => {
    if (!ev.reparation_provisoire) return;
    const decision = decisions[index];
    if (!decision || decision.choix.curatifDiffere) return;
    if (!partie.suspendus.includes(ev.id_mode_defaillance)) return;
    resultat.push({ cle: ev.id_evenement });
  });
  return resultat;
}

function curatifsSansPiece(partie: Partie): { cle: string; ref: string }[] {
  const decisions = decisionsIntervention(partie);
  const immediates = partie.evenements.filter((ev) => ev.type_maintenance === "corrective_immediate");
  const resultat: { cle: string; ref: string }[] = [];
  immediates.forEach((ev, index) => {
    const decision = decisions[index];
    if (!decision?.choix.curatifDiffere) return;
    const mode = ev.id_mode_defaillance;
    const ref = modeParId(mode).pieces_corrective[0];
    if (!ref) return;
    const realise = partie.evenements.some(
      (autre) => autre.type_maintenance === "corrective_differee" && autre.id_mode_defaillance === mode && autre.tour >= ev.tour,
    );
    if (realise) return;
    if (quantiteStock(partie, ref) >= quantiteCorrective(mode)) return;
    resultat.push({ cle: ev.id_evenement, ref });
  });
  return resultat;
}

function stocksSousMini(partie: Partie): { ref: string }[] {
  return piecesNiveau1()
    .filter((piece) => quantiteStock(partie, piece.ref) < piece.stock_mini && quantiteEnCommande(partie, piece.ref) === 0)
    .map((piece) => ({ ref: piece.ref }));
}

function rupturesDe(partie: Partie): { cle: string; ref: string }[] {
  if (!partie.panne) return [];
  const ref = modeParId(partie.panne.modeId).pieces_corrective[0];
  if (!ref || quantiteStock(partie, ref) > 0) return [];
  return [{ cle: `${partie.tour}:${partie.panne.modeId}:${partie.panne.heure}`, ref }];
}

function expressesDe(partie: Partie): { cle: string }[] {
  const resultat: { cle: string }[] = [];
  partie.journal.forEach((decision, index) => {
    if (decision.type === "planning") {
      decision.commandes.forEach((ligne, ligneIndex) => {
        if (ligne.delai === "express" && ligne.qte > 0) resultat.push({ cle: `plan-${index}-${ligneIndex}` });
      });
    }
    if (decision.type === "intervention" && decision.choix.approvisionnement === "express") {
      resultat.push({ cle: `intervention-${index}` });
    }
  });
  return resultat;
}
