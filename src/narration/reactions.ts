import { blaguePersonnage, personnageParId, reactionParId, reactions, seuilColere, objectifAoPct } from "./contenu";
import type { EtatNarratif } from "./etat";
import { PORTRAIT_FACHEE } from "./images";

/**
 * Au-delà de cette avance sur le samedi, Lucas prévient que le dépannage
 * ne tiendra pas. Ce seuil ne modifie pas les durées : le moteur fait toujours
 * tenir le palliatif jusqu'au samedi.
 */
export const SEUIL_PALLIATIF_H = 40;

const FAMILLE: Record<string, number> = {
  "colère directrice": 70,
  palliatif: 60,
  stock: 50,
  fournisseur: 45,
  budget: 40,
  félicitations: 30,
  encouragement: 20,
  calculs: 10,
};

export interface MemoireReactions {
  vues: string[];
  phaseTour: number;
  phaseNom: string;
  phaseCompte: number;
  r10Latche: string[];
  r10Fois: Record<string, number>;
  r04Partie: number;
}

export interface ReactionChoisie {
  id: string;
  cle: string;
  famille: string;
  personnageId: string;
  replique: string;
  portrait: string;
  precision?: string;
}

interface Candidat {
  id: string;
  cle: string;
  famille: string;
  precision?: string;
  masquerAussi: string[];
}

export function memoireVide(): MemoireReactions {
  return { vues: [], phaseTour: 0, phaseNom: "", phaseCompte: 0, r10Latche: [], r10Fois: {}, r04Partie: 0 };
}

export function niveauInclus(spec: string, niveau: number): boolean {
  const borne = /(\d+)\s*[–-]\s*(\d+)/.exec(spec);
  if (borne) return niveau >= Number(borne[1]) && niveau <= Number(borne[2]);
  return spec
    .split(/[^\d]+/)
    .filter(Boolean)
    .map(Number)
    .includes(niveau);
}

/** Réactions lisibles depuis l'état. Au plus une à la fois est affichée, au plus trois par phase. */
export function evaluerReactions(
  etat: EtatNarratif,
  memoire: MemoireReactions,
): { reactions: ReactionChoisie[]; memoire: MemoireReactions } {
  const vues = new Set(memoire.vues);
  let phaseCompte = memoire.phaseCompte;
  let phaseTour = memoire.phaseTour;
  let phaseNom = memoire.phaseNom;
  if (phaseTour !== etat.tour || phaseNom !== etat.phase) {
    phaseCompte = 0;
    phaseTour = etat.tour;
    phaseNom = etat.phase;
  }
  const actifs = new Set(etat.stocksSousMini.map((stock) => stock.ref));
  const r10Latche = memoire.r10Latche.filter((ref) => actifs.has(ref));
  const r10Fois = { ...memoire.r10Fois };
  let r04Partie = memoire.r04Partie;

  let candidats = reactions.flatMap((reaction) => candidatsDe(reaction.id, etat, vues, r10Latche, r10Fois, r04Partie));
  candidats = garderLePlusSevere(candidats, "colère directrice");
  candidats = garderLePlusSevere(candidats, "budget");
  candidats.sort((a, b) => rang(b) - rang(a) || a.id.localeCompare(b.id));

  const choisis: ReactionChoisie[] = [];
  for (const candidat of candidats) {
    if (phaseCompte >= 3) break;
    const texte = reactionParId(candidat.id);
    const personnage = texte ? personnageParId(texte.personnage) : undefined;
    if (!texte || !personnage) continue;
    const portrait = candidat.id === "R02" || candidat.id === "R03" || candidat.id === "R04" ? PORTRAIT_FACHEE : personnage.portrait;
    choisis.push({
      id: candidat.id,
      cle: candidat.cle,
      famille: texte.famille,
      personnageId: personnage.id,
      replique: texte.replique,
      portrait,
      precision: candidat.precision,
    });
    vues.add(candidat.cle);
    for (const autre of candidat.masquerAussi) {
      if (autre !== candidat.id) vues.add(cleVue(autre, etat));
    }
    if (candidat.id === "R10" && candidat.precision) {
      r10Latche.push(candidat.precision);
      r10Fois[candidat.precision] = (r10Fois[candidat.precision] ?? 0) + 1;
    }
    if (candidat.id === "R04") r04Partie += 1;
    phaseCompte += 1;
  }

  return {
    reactions: choisis,
    memoire: { vues: [...vues], phaseTour, phaseNom, phaseCompte, r10Latche, r10Fois, r04Partie },
  };
}

export function portraitBlague(phase: string): string | undefined {
  const id = blaguePersonnage[phase];
  return id ? personnageParId(id)?.portrait : undefined;
}

export function personnageBlague(phase: string): string | undefined {
  return blaguePersonnage[phase];
}

function candidatsDe(
  id: string,
  etat: EtatNarratif,
  vues: ReadonlySet<string>,
  r10Latche: readonly string[],
  r10Fois: Readonly<Record<string, number>>,
  r04Partie: number,
): Candidat[] {
  const texte = reactionParId(id);
  if (!texte || !niveauInclus(texte.niveaux, etat.niveau)) return [];
  if (id === "R04" && r04Partie >= 2) return [];
  if (id === "R10") {
    return etat.stocksSousMini
      .filter((stock) => !r10Latche.includes(stock.ref))
      .map((stock) => ({
        id,
        cle: `R10@${stock.ref}@${(r10Fois[stock.ref] ?? 0) + 1}`,
        famille: texte.famille,
        precision: stock.ref,
        masquerAussi: [] as string[],
      }));
  }
  const plusieurs = candidatsMultiples(id, etat, texte.famille, vues);
  if (plusieurs) return plusieurs;
  if (!correspond(id, etat)) return [];
  const precision = precisionDe(id, etat);
  const cle = cleVue(id, etat, precision);
  if (vues.has(cle)) return [];
  return [{ id, cle, famille: texte.famille, precision, masquerAussi: [] }];
}

function candidatsMultiples(id: string, etat: EtatNarratif, famille: string, vues: ReadonlySet<string>): Candidat[] | null {
  if (id === "R07") {
    return etat.palliatifs
      .filter((item) => item.heuresAvantSamedi > SEUIL_PALLIATIF_H && !vues.has(`R07@${item.cle}`))
      .map((item) => ({ id, cle: `R07@${item.cle}`, famille, precision: item.cle, masquerAussi: [] }));
  }
  if (id === "R08") {
    if (!etat.apresVendredi13) return [];
    return etat.palliatifsSansCuratif
      .filter((item) => !vues.has(`R08@${item.cle}`))
      .map((item) => ({ id, cle: `R08@${item.cle}`, famille, precision: item.cle, masquerAussi: [] }));
  }
  if (id === "R09") {
    return etat.curatifsSansPiece
      .filter((item) => !vues.has(`R09@${item.cle}`))
      .map((item) => ({ id, cle: `R09@${item.cle}`, famille, precision: item.ref, masquerAussi: [] }));
  }
  if (id === "R11") {
    return etat.ruptures
      .filter((item) => !vues.has(`R11@${item.cle}`))
      .map((item) => ({ id, cle: `R11@${item.cle}`, famille, precision: item.ref, masquerAussi: [] }));
  }
  return null;
}

function correspond(id: string, etat: EtatNarratif): boolean {
  switch (id) {
    case "R01":
      return atteint(etat, 1);
    case "R02":
      return atteint(etat, 2);
    case "R03":
      return atteint(etat, 3);
    case "R04":
      return atteint(etat, 4);
    case "R05":
      return etat.phase === "bilan" && etat.aoSemainePct + 1e-9 >= objectifAoPct(etat.niveau);
    case "R06":
      return etat.phase === "bilan" && etat.trsPct !== null && etat.trsPct + 1e-9 >= 65;
    case "R07":
    case "R08":
    case "R09":
    case "R11":
      return false;
    case "R12":
      return etat.depensesEur + 1e-9 >= etat.budgetEur * 0.75;
    case "R13":
      return etat.depensesEur + 1e-9 >= etat.budgetEur * 0.9;
    case "R14":
      return etat.depensesEur > etat.budgetEur + 1e-9;
    case "R15":
      return etat.preventifRealise && (etat.phase === "evenements" || etat.phase === "bilan");
    case "R16":
      return etat.phase === "bilan" && etat.bilan?.tousJustesPremierCoup === true;
    case "R17":
      return etat.phase === "bilan" && etat.bilan?.correctionAffichee === true;
    case "R18":
      return etat.expresses.length > 0;
    default:
      return false;
  }
}

function precisionDe(id: string, etat: EtatNarratif): string | undefined {
  if (id === "R18") return etat.expresses[0]?.cle;
  return undefined;
}

function atteint(etat: EtatNarratif, palier: number): boolean {
  const seuil = seuilColere(palier);
  return seuil !== undefined && etat.arretSemaineH + 1e-9 >= seuil;
}

function cleVue(id: string, etat: EtatNarratif, precision?: string): string {
  if (id === "R10" && precision) return `R10@${precision}@${etat.tour}`;
  if (id === "R12" || id === "R13" || id === "R14") return id;
  if (id === "R07" || id === "R08" || id === "R09" || id === "R11") return `${id}@${precision ?? etat.tour}`;
  return `${id}@${etat.tour}`;
}

function garderLePlusSevere(liste: Candidat[], famille: string): Candidat[] {
  const groupe = liste.filter((candidat) => candidat.famille === famille);
  const autres = liste.filter((candidat) => candidat.famille !== famille);
  if (groupe.length === 0) return autres;
  const meilleur = groupe.reduce((courant, candidat) => (Number(candidat.id.slice(1)) > Number(courant.id.slice(1)) ? candidat : courant));
  return [...autres, { ...meilleur, masquerAussi: groupe.map((candidat) => candidat.id) }];
}

function rang(candidat: Candidat): number {
  const base = FAMILLE[candidat.famille] ?? 0;
  const numero = Number(candidat.id.slice(1));
  if (candidat.famille === "colère directrice" || candidat.famille === "budget") return base * 100 + numero;
  return base * 100 - numero / 100;
}

export const REACTIONS_CONNUES = reactions.map((reaction) => reaction.id);
