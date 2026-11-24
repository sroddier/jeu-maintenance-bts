import { graineConsommation, tirerConsommation, type PieceTiree } from "./consommation";
import { calculerCout, type DetailCout, type PieceFacturee } from "./couts";
import { formatEuros, libelleHoraire } from "./format";
import {
  tirageDureesCuratives,
  tirageRenouvellement,
  tirageReparationMinimale,
} from "./fiabilite";
import { indicateursEquipement } from "./indicateurs";
import { NIVEAU_1, quantiteCorrective, rebutsCuratif } from "./niveau1";
import { graineDepuisTexte } from "./prng";
import { calculerScore, creditChamp as creditChampScore, type Score } from "./score";
import { contexteDepuisBilan, type ChampBilan, type BilanTour, evaluerChampBilan } from "./bilan";
import type { ModeDefaillance } from "./types";
import {
  delaiExpressNiveau1,
  delaiStandardHeures,
  heuresParSemaine,
  modeParId,
  modesNiveau1,
  pieceParRef,
  piecesNiveau1,
  politiqueRemM1,
  prixExpress,
  regleDepannage,
  tauxPossessionSemaine,
  usine,
} from "./usine";

const EPS = 1e-6;

export type Phase = "planifier" | "evenements" | "intervenir" | "bilan" | "termine";

export interface Lot {
  ref: string;
  qte: number;
  prixUnitaire: number;
}

export interface Commande {
  id: string;
  ref: string;
  qte: number;
  delai: "standard" | "express";
  prixUnitaire: number;
  heureCommande: number;
  heureArrivee: number;
  livree: boolean;
}

export interface LigneCommande {
  ref: string;
  qte: number;
  delai: "standard" | "express";
}

export interface EvenementPartie {
  id_evenement: string;
  id_equipement: string;
  id_sous_ensemble: string;
  id_mode_defaillance: string;
  description: string;
  type_maintenance: "corrective_immediate" | "corrective_differee" | "preventive_systematique";
  action: "depannage" | "remplacement" | "reglage";
  reparation_provisoire: boolean;
  hors_temps_ouverture: boolean;
  debut_arret_h_ouverture: number | null;
  tbf_precedent_h: number | null;
  duree_detection_h: number;
  duree_attente_logistique_h: number;
  duree_reparation_active_h: number;
  duree_remise_en_service_h: number;
  duree_arret_totale_h: number;
  nb_techniciens: number;
  intervenant: "interne" | "sous_traitance";
  heures_main_oeuvre_h: number;
  pieces: { ref: string; quantite: number; prix_unitaire_eur: number }[];
  cout_pieces_eur: number;
  cout_main_oeuvre_eur: number;
  cout_sous_traitance_eur: number;
  cout_direct_eur: number;
  penalite_arret_eur_par_h: number;
  cout_arret_production_eur: number;
  nb_rebuts_bouteilles: number;
  cout_rebuts_eur: number;
  cout_indirect_eur: number;
  cout_total_eur: number;
  tour: number;
  rechute: boolean;
  tronque: boolean;
}

export interface PanneOuverte {
  modeId: string;
  heure: number;
  detection: number;
  reparation: number;
  remise: number;
  rechute: boolean;
  tbfPrecedent: number;
  /**
   * null : le mode n'a pas de consommation_corrective.
   * Tableau vide : réglage, sans pièce et sans attente logistique.
   */
  piecesImposees: PieceTiree[] | null;
}

export interface Differe {
  modeId: string;
  rep: number;
  rem: number;
  /** Copié depuis la panne quand le mode a un champ consommation_corrective. */
  piecesImposees?: PieceTiree[];
}

/** Réapparition figée après un dépannage provisoire, en heures d'ouverture absolues. */
export interface Reapparition {
  modeId: string;
  heure: number;
}

export interface LigneRecit {
  tour: number;
  heure: number | null;
  texte: string;
}

export interface ChoixIntervention {
  nature: "palliatif" | "curatif";
  intervenant: "interne" | "sous_traitance";
  approvisionnement: "stock" | "express" | "standard";
  curatifDiffere: boolean;
}

export interface DevisIntervention {
  erreur: string | null;
  detection: number;
  attente: number;
  reparation: number;
  remise: number;
  pieces: PieceFacturee[];
  rebuts: number;
  depuisStock: boolean;
  cout: DetailCout | null;
  tronque: boolean;
  effetApplique: boolean;
}

export type Decision =
  | { type: "planning"; commandes: LigneCommande[] }
  | { type: "lire" }
  | { type: "intervention"; choix: ChoixIntervention }
  | { type: "saisie"; valeurs: Record<string, string> }
  | { type: "tour-suivant" };

export interface Partie {
  version: 2;
  seedLabel: string;
  seed: number;
  pseudo: string;
  rng: number;
  /** Générateur des pièces (graine + 1). Indépendant de rng. */
  rngPieces: number;
  tour: number;
  phase: Phase;
  suite: "intervenir" | "bilan" | null;
  heure: number;
  semaineDebut: number;
  cloturee: boolean;
  age: Record<string, number>;
  prochainAge: Record<string, number>;
  suspendus: string[];
  differes: Differe[];
  reapparitions: Reapparition[];
  indisponibleJusqua: number | null;
  dernierRedemarrage: number;
  stock: Lot[];
  commandes: Commande[];
  evenements: EvenementPartie[];
  recit: LigneRecit[];
  panne: PanneOuverte | null;
  bilan: BilanTour | null;
  bilansClos: BilanTour[];
  possessionCumulee: number;
  compteurEvenement: number;
  compteurCommande: number;
  journal: Decision[];
  erreur: string | null;
}

export function horizonHeures(): number {
  return NIVEAU_1.nbTours * heuresParSemaine();
}

export function demarrer(seedLabel: string, pseudo: string): Partie {
  const seed = graineDepuisTexte(seedLabel);
  let rng = seed;
  const age: Record<string, number> = {};
  const prochainAge: Record<string, number> = {};
  for (const mode of modesNiveau1()) {
    age[mode.id_mode] = 0;
    const tirage =
      mode.effet_correctif === "reparation_minimale"
        ? tirageReparationMinimale(rng, mode, 0)
        : tirageRenouvellement(rng, mode);
    rng = tirage.state;
    prochainAge[mode.id_mode] = tirage.age;
  }
  return {
    version: 2,
    seedLabel: seedLabel.trim(),
    seed,
    pseudo: pseudo.trim(),
    rng,
    rngPieces: graineConsommation(seed),
    tour: 1,
    phase: "planifier",
    suite: null,
    heure: 0,
    semaineDebut: 0,
    cloturee: false,
    age,
    prochainAge,
    suspendus: [],
    differes: [],
    reapparitions: [],
    indisponibleJusqua: null,
    dernierRedemarrage: 0,
    stock: piecesNiveau1().map((piece) => ({
      ref: piece.ref,
      qte: piece.stock_initial,
      prixUnitaire: piece.prix_unitaire_eur,
    })),
    commandes: [],
    evenements: [],
    recit: [],
    panne: null,
    bilan: null,
    bilansClos: [],
    possessionCumulee: 0,
    compteurEvenement: 0,
    compteurCommande: 0,
    journal: [],
    erreur: null,
  };
}

export function appliquer(partie: Partie, decision: Decision, journaliser = true): Partie {
  const p = structuredClone(partie);
  p.erreur = null;
  switch (decision.type) {
    case "planning":
      return appliquerPlanning(p, decision.commandes, decision, journaliser);
    case "lire":
      return appliquerLire(p, decision, journaliser);
    case "intervention":
      return appliquerIntervention(p, decision.choix, decision, journaliser);
    case "saisie":
      return appliquerSaisie(p, decision.valeurs, decision, journaliser);
    case "tour-suivant":
      return appliquerTourSuivant(p, decision, journaliser);
    default:
      p.erreur = "Décision inconnue.";
      return p;
  }
}

export function jouer(seedLabel: string, politique: (p: Partie) => Decision, maxEtapes = 500): Partie {
  let p = demarrer(seedLabel, "simulation");
  let etapes = 0;
  while (p.phase !== "termine") {
    if (++etapes > maxEtapes) throw new Error(`Partie bloquée en phase ${p.phase}`);
    const decision = politique(p);
    p = appliquer(p, decision);
    if (p.erreur) throw new Error(`${p.erreur} (phase ${p.phase}, tour ${p.tour})`);
  }
  return p;
}

export function rejouer(seedLabel: string, pseudo: string, journal: readonly Decision[]): Partie {
  let p = demarrer(seedLabel, pseudo);
  for (const decision of journal) p = appliquer(p, decision, false);
  return p;
}

/** Politique de référence : curatif interne, stock sinon express, commandes standard jusqu'au stock mini. */
export function politiqueReference(p: Partie): Decision {
  if (p.phase === "planifier") return { type: "planning", commandes: commandesReference(p) };
  if (p.phase === "evenements") return { type: "lire" };
  if (p.phase === "intervenir") {
    if (!p.panne) throw new Error("Intervention sans panne");
    const imposees = p.panne.piecesImposees;
    if (imposees && imposees.length === 0) {
      return {
        type: "intervention",
        choix: {
          nature: "curatif",
          intervenant: "interne",
          approvisionnement: "stock",
          curatifDiffere: false,
        },
      };
    }
    const ref = imposees?.[0]?.ref ?? pieceCorrective(p.panne.modeId);
    const qte = imposees?.[0]?.quantite ?? quantiteCorrective(p.panne.modeId);
    const assez = quantiteStock(p, ref) >= qte;
    return {
      type: "intervention",
      choix: {
        nature: "curatif",
        intervenant: "interne",
        approvisionnement: assez ? "stock" : "express",
        curatifDiffere: false,
      },
    };
  }
  if (p.phase === "bilan" && p.bilan && p.bilan.champs.some((c) => !c.resolu)) {
    const valeurs: Record<string, string> = {};
    for (const champ of p.bilan.champs) {
      if (!champ.resolu) valeurs[champ.id] = String(champ.attendu);
    }
    return { type: "saisie", valeurs };
  }
  return { type: "tour-suivant" };
}

export function quantiteStock(p: Partie, ref: string): number {
  return p.stock.filter((lot) => lot.ref === ref).reduce((s, lot) => s + lot.qte, 0);
}

export function quantiteEnCommande(p: Partie, ref: string): number {
  return p.commandes.filter((c) => c.ref === ref && !c.livree).reduce((s, c) => s + c.qte, 0);
}

export function preventifCetteSemaine(tour: number): boolean {
  return tour % politiqueRemM1().periode_semaines === 0;
}

export function devisIntervention(p: Partie, choix: ChoixIntervention): DevisIntervention {
  if (!p.panne) return devisVide("Aucune panne à traiter.");
  const mode = modeParId(p.panne.modeId);
  if (choix.nature === "palliatif") {
    const regle = regleDepannage(mode);
    if (!regle.autorise) return devisVide(`Dépannage provisoire impossible pour ${mode.id_mode}.`);
    // Pas de pièce : pas d'attente magasin. La détection et la remise en service restent celles de la panne.
    // La durée hors spécialité et les événements spéciaux ne s'appliquent pas au niveau 1.
    const attente = choix.intervenant === "sous_traitance" ? usine.couts.sous_traitance_delai_arrivee_h : 0;
    return chiffrer(p, {
      detection: p.panne.detection,
      attente,
      reparation: regle.duree_reparation_active_h,
      remise: p.panne.remise,
      pieces: [],
      rebuts: 0,
      intervenant: choix.intervenant,
      depuisStock: false,
      hors: false,
      debut: p.panne.heure,
      effetApplique: false,
    });
  }
  const imposees = p.panne.piecesImposees;
  if (imposees && imposees.length === 0) {
    const attente = choix.intervenant === "sous_traitance" ? usine.couts.sous_traitance_delai_arrivee_h : 0;
    return chiffrer(p, {
      detection: p.panne.detection,
      attente,
      reparation: p.panne.reparation,
      remise: p.panne.remise,
      pieces: [],
      rebuts: rebutsCuratif(mode.id_mode),
      intervenant: choix.intervenant,
      depuisStock: false,
      hors: false,
      debut: p.panne.heure,
      effetApplique: true,
    });
  }
  const ref = imposees?.[0]?.ref ?? pieceCorrective(mode.id_mode);
  const qte = imposees?.[0]?.quantite ?? quantiteCorrective(mode.id_mode);
  const piece = pieceParRef(ref);
  let attente = 0;
  let pieces: PieceFacturee[] = [];
  let depuisStock = false;
  if (choix.approvisionnement === "stock") {
    if (quantiteStock(p, ref) < qte) {
      return devisVide(`Stock insuffisant : ${ref} demande ${qte}, magasin ${quantiteStock(p, ref)}.`);
    }
    attente = 0.25;
    depuisStock = true;
    pieces = [{ ref, quantite: qte, prixUnitaire: prixMoyenDisponible(p, ref, qte) }];
  } else if (choix.approvisionnement === "express") {
    attente = delaiExpressNiveau1();
    pieces = [{ ref, quantite: qte, prixUnitaire: round4(prixExpress(piece.prix_unitaire_eur)) }];
  } else {
    attente = delaiStandardHeures(ref);
    pieces = [{ ref, quantite: qte, prixUnitaire: piece.prix_unitaire_eur }];
  }
  if (choix.intervenant === "sous_traitance") {
    attente = Math.max(attente, usine.couts.sous_traitance_delai_arrivee_h);
  }
  return chiffrer(p, {
    detection: p.panne.detection,
    attente,
    reparation: p.panne.reparation,
    remise: p.panne.remise,
    pieces,
    rebuts: rebutsCuratif(mode.id_mode),
    intervenant: choix.intervenant,
    depuisStock,
    hors: false,
    debut: p.panne.heure,
    effetApplique: true,
  });
}

export interface Synthese {
  tr: number;
  indicateurs: ReturnType<typeof indicateursEquipement>;
  coutDirect: number;
  coutIndirect: number;
  possession: number;
  coutGlobal: number;
  nbPreventifs: number;
  nbPalliatifsNonSoldes: number;
}

export function syntheseFinale(p: Partie): Synthese {
  const tr = horizonHeures();
  const indicateurs = indicateursEquipement(p.evenements, "REM", tr);
  let direct = 0;
  let indirect = 0;
  for (const ev of p.evenements) {
    direct += ev.cout_direct_eur;
    indirect += ev.cout_indirect_eur;
  }
  direct = round2(direct);
  indirect = round2(indirect);
  const possession = round2(p.possessionCumulee);
  return {
    tr,
    indicateurs,
    coutDirect: direct,
    coutIndirect: indirect,
    possession,
    coutGlobal: round2(direct + indirect + possession),
    nbPreventifs: p.evenements.filter((e) => e.type_maintenance === "preventive_systematique").length,
    nbPalliatifsNonSoldes: p.suspendus.length,
  };
}

export function evaluerPartie(p: Partie): { synthese: Synthese; reference: Synthese; score: Score } {
  const synthese = syntheseFinale(p);
  const reference = syntheseFinale(jouer(p.seedLabel, politiqueReference));
  const questions = p.bilansClos.flatMap((bilan) =>
    bilan.champs.map((champ) => ({ credit: creditChampScore(champ) })),
  );
  const score = calculerScore({
    aoPct: synthese.indicateurs.Ao,
    coutGlobal: synthese.coutGlobal,
    coutReference: reference.coutGlobal,
    questions,
  });
  return { synthese, reference, score };
}

export function ligneArretee(p: Partie): boolean {
  return p.panne !== null || (p.indisponibleJusqua !== null && p.heure < p.indisponibleJusqua - EPS);
}

function appliquerPlanning(p: Partie, lignes: LigneCommande[], decision: Decision, journaliser: boolean): Partie {
  if (p.phase !== "planifier") {
    p.erreur = "Le planning est déjà validé.";
    return p;
  }
  for (const ligne of lignes) {
    if (!Number.isInteger(ligne.qte) || ligne.qte < 0) {
      p.erreur = "La quantité commandée doit être un entier positif ou nul.";
      return p;
    }
    if (ligne.qte > 20) {
      p.erreur = "Quantité maximale par ligne : 20.";
      return p;
    }
    if (ligne.qte === 0) continue;
    const piece = piecesNiveau1().find((x) => x.ref === ligne.ref);
    if (!piece) continue;
    const prix =
      ligne.delai === "express" ? round4(prixExpress(piece.prix_unitaire_eur)) : piece.prix_unitaire_eur;
    const delaiH = ligne.delai === "express" ? delaiExpressNiveau1() : delaiStandardHeures(piece.ref);
    p.compteurCommande += 1;
    p.commandes.push({
      id: identifiant("C", p.compteurCommande),
      ref: piece.ref,
      qte: ligne.qte,
      delai: ligne.delai,
      prixUnitaire: prix,
      heureCommande: p.heure,
      heureArrivee: round4(p.heure + delaiH),
      livree: false,
    });
    const arrivee = p.heure + delaiH > horizonHeures() ? "après la fin de la partie" : `dans ${formatHeuresCourtes(delaiH)}`;
    p.recit.push({
      tour: p.tour,
      heure: p.heure,
      texte: `Commande ${ligne.qte} × ${piece.ref} (${ligne.delai === "express" ? "express" : "délai standard"}), arrivée ${arrivee}.`,
    });
  }
  const politique = politiqueRemM1();
  p.recit.push({
    tour: p.tour,
    heure: p.heure,
    texte: preventifCetteSemaine(p.tour)
      ? `Semaine ${p.tour}. Préventif imposé samedi : ${politique.action} (${formatEuros(politique.cout_eur)}, hors ouverture).`
      : `Semaine ${p.tour}. ${NIVEAU_1.nbTechniciens} techniciens sur la remplisseuse. Pas de préventif samedi.`,
  });
  if (journaliser) p.journal.push(structuredClone(decision));
  return presenter(simuler(p));
}

function appliquerLire(p: Partie, decision: Decision, journaliser: boolean): Partie {
  if (p.phase !== "evenements") {
    p.erreur = "Il n'y a pas d'événements à poursuivre.";
    return p;
  }
  if (journaliser) p.journal.push(structuredClone(decision));
  if (p.suite === "intervenir" && p.panne) {
    p.phase = "intervenir";
    return p;
  }
  if (p.suite === "bilan") {
    p.bilan = creerBilan(p);
    p.phase = "bilan";
    return p;
  }
  p.erreur = "La semaine n'a pas de suite.";
  return p;
}

function appliquerIntervention(p: Partie, choix: ChoixIntervention, decision: Decision, journaliser: boolean): Partie {
  if (p.phase !== "intervenir" || !p.panne) {
    p.erreur = "Aucune intervention en cours.";
    return p;
  }
  const devis = devisIntervention(p, choix);
  if (devis.erreur || !devis.cout) {
    p.erreur = devis.erreur ?? "Devis impossible.";
    return p;
  }
  const panne = p.panne;
  const mode = modeParId(panne.modeId);
  if (devis.depuisStock) {
    const ref = devis.pieces[0]?.ref;
    const qte = devis.pieces[0]?.quantite ?? 0;
    if (ref) devis.pieces = consommer(p, ref, qte);
  }
  pousserEvenement(p, {
    mode,
    type: "corrective_immediate",
    action: choix.nature === "palliatif" ? "depannage" : panne.piecesImposees?.length === 0 ? "reglage" : "remplacement",
    provisoire: choix.nature === "palliatif",
    hors: false,
    debut: panne.heure,
    tbf: panne.tbfPrecedent,
    detection: devis.detection,
    attente: devis.attente,
    reparation: devis.reparation,
    remise: devis.remise,
    intervenant: choix.intervenant,
    pieces: devis.pieces,
    rebuts: devis.rebuts,
    cout: devis.cout,
    rechute: panne.rechute,
    tronque: devis.tronque,
  });

  p.indisponibleJusqua = panne.heure + devis.cout.ta;
  p.panne = null;

  if (choix.nature === "palliatif") {
    const regle = regleDepannage(mode);
    if (!p.suspendus.includes(mode.id_mode)) p.suspendus.push(mode.id_mode);
    if (!devis.tronque) {
      const fin = p.indisponibleJusqua ?? panne.heure;
      poserReapparition(p, mode.id_mode, round4(fin + regle.reapparition_apres_h));
    }
    if (choix.curatifDiffere && regle.annule_par_curatif_differe && !p.differes.some((d) => d.modeId === mode.id_mode)) {
      p.differes.push({
        modeId: mode.id_mode,
        rep: panne.reparation,
        rem: panne.remise,
        ...(panne.piecesImposees ? { piecesImposees: panne.piecesImposees } : {}),
      });
      p.recit.push({
        tour: p.tour,
        heure: panne.heure,
        texte: `Curatif différé noté pour samedi, hors ouverture : pas de perte de production, coûts directs comptés. Il annule la réapparition (${regle.reapparition_apres_h} h d'ouverture après la fin du dépannage) si la pièce est en stock.`,
      });
    } else if (!choix.curatifDiffere) {
      p.recit.push({
        tour: p.tour,
        heure: panne.heure,
        texte: `Dépannage provisoire : le mode n'est pas remis à neuf. La panne revient après ${regle.reapparition_apres_h} h d'ouverture.`,
      });
    }
  } else if (devis.effetApplique) {
    solderMode(p, mode.id_mode);
    appliquerEffetCuratif(p, mode);
  }

  if (journaliser) p.journal.push(structuredClone(decision));
  return presenter(simuler(p));
}

function appliquerSaisie(p: Partie, valeurs: Record<string, string>, decision: Decision, journaliser: boolean): Partie {
  if (p.phase !== "bilan" || !p.bilan) {
    p.erreur = "Le bilan n'est pas ouvert.";
    return p;
  }
  const ctx = contexteDepuisBilan(p.bilan);
  let traite = false;
  for (const champ of p.bilan.champs) {
    if (champ.resolu || !(champ.id in valeurs)) continue;
    traite = true;
    const resultat = evaluerChampBilan(champ.id, valeurs[champ.id] ?? "", ctx);
    champ.valeurSaisie = resultat.valeur;
    if (resultat.ok) {
      champ.resolu = true;
      champ.correctionAffichee = false;
      champ.dernierMessage = resultat.indice;
    } else {
      champ.essais += 1;
      if (champ.essais >= 2) {
        champ.resolu = true;
        champ.correctionAffichee = true;
        champ.dernierMessage = resultat.correction;
      } else {
        champ.dernierMessage = resultat.indice;
      }
    }
  }
  if (!traite) {
    p.erreur = "Saisis les indicateurs encore ouverts.";
    return p;
  }
  if (journaliser) p.journal.push(structuredClone(decision));
  return p;
}

function appliquerTourSuivant(p: Partie, decision: Decision, journaliser: boolean): Partie {
  if (p.phase !== "bilan" || !p.bilan) {
    p.erreur = "Termine le bilan avant de continuer.";
    return p;
  }
  if (p.bilan.champs.some((c) => !c.resolu)) {
    p.erreur = "Les indicateurs ne sont pas encore tous traités.";
    return p;
  }
  if (journaliser) p.journal.push(structuredClone(decision));
  p.bilansClos.push(p.bilan);
  p.bilan = null;
  if (p.tour >= NIVEAU_1.nbTours) {
    p.phase = "termine";
    p.suite = null;
    return p;
  }
  p.tour += 1;
  p.semaineDebut += heuresParSemaine();
  p.heure = p.semaineDebut;
  p.cloturee = false;
  p.phase = "planifier";
  p.suite = null;
  return p;
}

function presenter(p: Partie): Partie {
  p.phase = "evenements";
  return p;
}

function simuler(p: Partie): Partie {
  if (p.cloturee) {
    p.suite = "bilan";
    return p;
  }
  const fin = p.semaineDebut + heuresParSemaine();
  let garde = 0;
  while (p.heure < fin - EPS && garde++ < 20000) {
    livrer(p);
    if (p.panne) {
      p.suite = "intervenir";
      return p;
    }
    const enArret = p.indisponibleJusqua !== null && p.heure < p.indisponibleJusqua - EPS;
    const incident = incidentImminent(p);
    if (!enArret && incident.delai <= EPS) {
      ouvrirIncident(p, incident);
      p.suite = "intervenir";
      return p;
    }
    const limite = enArret ? Math.min(fin, p.indisponibleJusqua as number) : fin;
    const livraison = prochaineLivraison(p);
    let cible = limite;
    if (livraison !== null && livraison < cible) cible = livraison;
    if (!enArret) {
      const dtCible = cible - p.heure;
      if (incident.delai < dtCible - EPS) {
        avancerMarche(p, incident.delai);
        ouvrirIncident(p, incident);
        p.suite = "intervenir";
        return p;
      }
      avancerMarche(p, Math.max(0, dtCible));
    } else {
      p.heure = cible;
    }
    livrer(p);
    if (p.indisponibleJusqua !== null && p.heure >= p.indisponibleJusqua - EPS) {
      p.indisponibleJusqua = null;
      p.dernierRedemarrage = p.heure;
      p.recit.push({
        tour: p.tour,
        heure: p.heure,
        texte: `${quand(p.heure)} — remise en service, la ligne repart.`,
      });
    }
    if (p.heure >= fin - EPS) break;
  }
  if (garde >= 20000) throw new Error("Simulation bloquée");
  p.heure = fin;
  cloturerSamedi(p);
  p.suite = "bilan";
  return p;
}

interface Incident {
  delai: number;
  modeId: string;
  rechute: boolean;
}

/** Prochaine défaillance : loi du mode, ou réapparition figée après dépannage. */
function incidentImminent(p: Partie): Incident {
  let delai = Number.POSITIVE_INFINITY;
  let modeId = "";
  let rechute = false;
  for (const mode of modesNiveau1()) {
    if (p.suspendus.includes(mode.id_mode)) continue;
    const d = p.prochainAge[mode.id_mode] - p.age[mode.id_mode];
    if (d < delai) {
      delai = d;
      modeId = mode.id_mode;
      rechute = false;
    }
  }
  for (const reapparition of p.reapparitions) {
    const d = reapparition.heure - p.heure;
    if (d < delai + EPS) {
      delai = d;
      modeId = reapparition.modeId;
      rechute = true;
    }
  }
  return { delai, modeId, rechute };
}

function ouvrirIncident(p: Partie, incident: Incident): void {
  if (!incident.modeId) throw new Error("Pas de mode en panne");
  if (incident.rechute) {
    p.reapparitions = p.reapparitions.filter((r) => r.modeId !== incident.modeId);
  }
  ouvrirPanne(p, incident.modeId, incident.rechute);
}

function poserReapparition(p: Partie, modeId: string, heure: number): void {
  p.reapparitions = p.reapparitions.filter((r) => r.modeId !== modeId);
  p.reapparitions.push({ modeId, heure });
}

function solderMode(p: Partie, modeId: string): void {
  p.suspendus = p.suspendus.filter((id) => id !== modeId);
  p.differes = p.differes.filter((d) => d.modeId !== modeId);
  p.reapparitions = p.reapparitions.filter((r) => r.modeId !== modeId);
}

function avancerMarche(p: Partie, dt: number): void {
  if (dt <= 0) return;
  p.heure += dt;
  for (const mode of modesNiveau1()) p.age[mode.id_mode] += dt;
}

function ouvrirPanne(p: Partie, modeId: string, rechute: boolean): void {
  const mode = modeParId(modeId);
  const tirage = tirageDureesCuratives(p.rng, mode);
  p.rng = tirage.state;
  const consommation = tirerConsommation(p.rngPieces ?? graineConsommation(p.seed), mode.consommation_corrective);
  p.rngPieces = consommation.state;
  p.panne = {
    modeId,
    heure: p.heure,
    detection: tirage.detection,
    reparation: tirage.reparation,
    remise: tirage.remise,
    rechute,
    tbfPrecedent: round4(Math.max(0, p.heure - p.dernierRedemarrage)),
    piecesImposees: consommation.pieces,
  };
  p.recit.push({
    tour: p.tour,
    heure: p.heure,
    texte: rechute
      ? `${quand(p.heure)} — la panne revient (${mode.designation}) après ${regleDepannage(mode).reapparition_apres_h} h d'ouverture. Nouvelle défaillance : le dépannage n'a pas remis le mode à neuf.`
      : `${quand(p.heure)} — ${mode.designation}. Détection : ${mode.mode_detection}. La ligne s'arrête.`,
  });
}

function cloturerSamedi(p: Partie): void {
  if (p.cloturee) return;
  const politique = politiqueRemM1();
  const modeM1 = modeParId("REM-M1");
  const kit = modeM1.pieces_preventive[0];
  if (preventifCetteSemaine(p.tour)) {
    if (kit && quantiteStock(p, kit) >= 1) {
      p.differes = p.differes.filter((d) => d.modeId !== "REM-M1");
      p.suspendus = p.suspendus.filter((id) => id !== "REM-M1");
      p.reapparitions = p.reapparitions.filter((r) => r.modeId !== "REM-M1");
      const pieces = consommer(p, kit, 1);
      p.age[modeM1.id_mode] = 0;
      const tirage = tirageReparationMinimale(p.rng, modeM1, 0);
      p.rng = tirage.state;
      p.prochainAge[modeM1.id_mode] = tirage.age;
      const prixKit = pieces[0] ? round2(pieces[0].quantite * pieces[0].prixUnitaire) : 0;
      const coutMo = round2(politique.cout_eur - prixKit);
      pousserEvenementForfait(p, {
        mode: modeM1,
        pieces,
        coutPieces: prixKit,
        coutMo,
        coutDirect: politique.cout_eur,
        texte: `Samedi — préventif réalisé : ${politique.action}. Coût ${formatEuros(politique.cout_eur)}, pas d'arrêt de ligne. Les joints repartent à neuf.`,
      });
    } else {
      p.recit.push({
        tour: p.tour,
        heure: null,
        texte: "Samedi — préventif des joints impossible : le kit complet n'est pas en stock. L'usure continue.",
      });
    }
  }
  const differes = [...p.differes];
  p.differes = [];
  for (const differe of differes) {
    const mode = modeParId(differe.modeId);
    if (differe.piecesImposees && differe.piecesImposees.length === 0) {
      const cout = calculerCout({
        idEquipement: "REM",
        detection: 0,
        attente: 0,
        reparation: differe.rep,
        remise: differe.rem,
        nbTechniciens: techniciensInternes(mode),
        intervenant: "interne",
        horsOuverture: true,
        pieces: [],
        rebuts: 0,
      });
      solderMode(p, mode.id_mode);
      appliquerEffetCuratif(p, mode);
      pousserEvenement(p, {
        mode,
        type: "corrective_differee",
        action: "reglage",
        provisoire: false,
        hors: true,
        debut: null,
        tbf: null,
        detection: 0,
        attente: 0,
        reparation: differe.rep,
        remise: differe.rem,
        intervenant: "interne",
        pieces: [],
        rebuts: 0,
        cout,
        rechute: false,
        tronque: false,
      });
      p.recit.push({
        tour: p.tour,
        heure: null,
        texte: `Samedi — curatif différé réalisé (${mode.designation}), hors ouverture, coût direct ${formatEuros(cout.coutDirect)}. Il ne compte ni dans N, ni dans ΣTA, ni dans le MTTR.`,
      });
      continue;
    }
    const ref = differe.piecesImposees?.[0]?.ref ?? pieceCorrective(mode.id_mode);
    const qte = differe.piecesImposees?.[0]?.quantite ?? quantiteCorrective(mode.id_mode);
    if (quantiteStock(p, ref) < qte) {
      p.recit.push({
        tour: p.tour,
        heure: null,
        texte: `Samedi — curatif différé de ${mode.designation} annulé : ${ref} manque au magasin. La panne revient ${regleDepannage(mode).reapparition_apres_h} h d'ouverture après la fin du dépannage.`,
      });
      continue;
    }
    const pieces = consommer(p, ref, qte);
    const cout = calculerCout({
      idEquipement: "REM",
      detection: 0,
      attente: 0,
      reparation: differe.rep,
      remise: differe.rem,
      nbTechniciens: techniciensInternes(mode),
      intervenant: "interne",
      horsOuverture: true,
      pieces,
      rebuts: 0,
    });
    solderMode(p, mode.id_mode);
    appliquerEffetCuratif(p, mode);
    pousserEvenement(p, {
      mode,
      type: "corrective_differee",
      action: "remplacement",
      provisoire: false,
      hors: true,
      debut: null,
      tbf: null,
      detection: 0,
      attente: 0,
      reparation: differe.rep,
      remise: differe.rem,
      intervenant: "interne",
      pieces,
      rebuts: 0,
      cout,
      rechute: false,
      tronque: false,
    });
    p.recit.push({
      tour: p.tour,
      heure: null,
      texte: `Samedi — curatif différé réalisé (${mode.designation}), hors ouverture, coût direct ${formatEuros(cout.coutDirect)}. Il ne compte ni dans N, ni dans ΣTA, ni dans le MTTR.`,
    });
  }
  const valeur = round2(p.stock.reduce((s, lot) => s + lot.qte * lot.prixUnitaire, 0));
  const possession = round2(valeur * tauxPossessionSemaine());
  p.possessionCumulee = round2(p.possessionCumulee + possession);
  p.cloturee = true;
  if (possession > 0) {
    p.recit.push({
      tour: p.tour,
      heure: null,
      texte: `Possession du stock cette semaine : ${formatEuros(possession)} (valeur ${formatEuros(valeur)}).`,
    });
  }
}

function appliquerEffetCuratif(p: Partie, mode: ModeDefaillance): void {
  if (mode.effet_correctif === "renouvellement") {
    p.age[mode.id_mode] = 0;
    const tirage = tirageRenouvellement(p.rng, mode);
    p.rng = tirage.state;
    p.prochainAge[mode.id_mode] = tirage.age;
    return;
  }
  const tirage = tirageReparationMinimale(p.rng, mode, p.age[mode.id_mode]);
  p.rng = tirage.state;
  p.prochainAge[mode.id_mode] = tirage.age;
}

function creerBilan(p: Partie): BilanTour {
  const tr = p.tour * heuresParSemaine();
  const ind = indicateursEquipement(p.evenements, "REM", tr);
  const champs: ChampBilan[] = [];
  if (ind.N > 0 && ind.MTBF !== null && ind.MTTR !== null) {
    champs.push(nouveauChamp("mtbf", "MTBF (h)", ind.MTBF));
    champs.push(nouveauChamp("mttr", "MTTR (h)", ind.MTTR));
  }
  champs.push(nouveauChamp("ao", "Ao — disponibilité opérationnelle (%)", ind.Ao));
  return {
    tour: p.tour,
    tr,
    n: ind.N,
    sommeTA: ind.sommeTA,
    sommeReparation: ind.sommeReparation,
    champs,
  };
}

function commandesReference(p: Partie): LigneCommande[] {
  const lignes: LigneCommande[] = [];
  for (const piece of piecesNiveau1()) {
    const cible = piece.stock_mini;
    const dispo = quantiteStock(p, piece.ref) + quantiteEnCommande(p, piece.ref);
    const manque = Math.max(0, cible - dispo);
    if (manque > 0) lignes.push({ ref: piece.ref, qte: Math.min(6, manque), delai: "standard" });
  }
  return lignes;
}

function pieceCorrective(modeId: string): string {
  const ref = modeParId(modeId).pieces_corrective[0];
  if (!ref) throw new Error(`Pas de pièce corrective pour ${modeId}`);
  return ref;
}

function techniciensInternes(mode: ModeDefaillance): number {
  const besoin = mode.mttr_actif_h >= 10 ? 2 : 1;
  return Math.min(NIVEAU_1.nbTechniciens, besoin);
}

function prixMoyenDisponible(p: Partie, ref: string, qte: number): number {
  let reste = qte;
  let total = 0;
  for (const lot of p.stock) {
    if (lot.ref !== ref || lot.qte <= 0 || reste <= 0) continue;
    const prend = Math.min(lot.qte, reste);
    total += prend * lot.prixUnitaire;
    reste -= prend;
  }
  if (reste > 0 || qte === 0) return pieceParRef(ref).prix_unitaire_eur;
  return round4(total / qte);
}

function consommer(p: Partie, ref: string, qte: number): PieceFacturee[] {
  const prix = prixMoyenDisponible(p, ref, qte);
  let reste = qte;
  for (const lot of p.stock) {
    if (lot.ref !== ref || lot.qte <= 0 || reste <= 0) continue;
    const prend = Math.min(lot.qte, reste);
    lot.qte -= prend;
    reste -= prend;
  }
  if (reste > 0) throw new Error(`Stock ${ref} insuffisant au moment de consommer`);
  return [{ ref, quantite: qte, prixUnitaire: prix }];
}

interface ChiffrageBrut {
  detection: number;
  attente: number;
  reparation: number;
  remise: number;
  pieces: PieceFacturee[];
  rebuts: number;
  intervenant: "interne" | "sous_traitance";
  depuisStock: boolean;
  hors: boolean;
  debut: number;
  effetApplique: boolean;
}

function chiffrer(p: Partie, brut: ChiffrageBrut): DevisIntervention {
  const coupe = tronquer(brut.detection, brut.attente, brut.reparation, brut.remise, brut.debut, horizonHeures());
  const pieceArrivee = coupe.attente + EPS >= brut.attente;
  const reparationFaite = pieceArrivee && coupe.reparation + EPS >= brut.reparation;
  const pieces = pieceArrivee ? brut.pieces : [];
  const rebuts = reparationFaite ? brut.rebuts : 0;
  const mode = p.panne ? modeParId(p.panne.modeId) : modeParId("REM-M1");
  const cout = calculerCout({
    idEquipement: "REM",
    detection: coupe.detection,
    attente: coupe.attente,
    reparation: coupe.reparation,
    remise: coupe.remise,
    nbTechniciens: brut.intervenant === "interne" ? techniciensInternes(mode) : 0,
    intervenant: brut.intervenant,
    horsOuverture: brut.hors,
    pieces,
    rebuts,
  });
  return {
    erreur: null,
    detection: coupe.detection,
    attente: coupe.attente,
    reparation: coupe.reparation,
    remise: coupe.remise,
    pieces,
    rebuts,
    depuisStock: brut.depuisStock && pieceArrivee,
    cout,
    tronque: coupe.tronque,
    effetApplique: brut.effetApplique && reparationFaite,
  };
}

function tronquer(
  detection: number,
  attente: number,
  reparation: number,
  remise: number,
  debut: number,
  horizon: number,
): { detection: number; attente: number; reparation: number; remise: number; tronque: boolean } {
  let reste = Math.max(0, horizon - debut);
  const prendre = (valeur: number) => {
    const retenu = Math.min(valeur, Math.max(0, reste));
    reste = round4(reste - retenu);
    return round4(retenu);
  };
  const out = {
    detection: prendre(detection),
    attente: prendre(attente),
    reparation: prendre(reparation),
    remise: prendre(remise),
  };
  const plein = Math.abs(detection + attente + reparation + remise - (out.detection + out.attente + out.reparation + out.remise)) < 1e-4;
  return { ...out, tronque: !plein };
}

function devisVide(erreur: string): DevisIntervention {
  return {
    erreur,
    detection: 0,
    attente: 0,
    reparation: 0,
    remise: 0,
    pieces: [],
    rebuts: 0,
    depuisStock: false,
    cout: null,
    tronque: false,
    effetApplique: false,
  };
}

interface PousserArgs {
  mode: ModeDefaillance;
  type: EvenementPartie["type_maintenance"];
  action: EvenementPartie["action"];
  provisoire: boolean;
  hors: boolean;
  debut: number | null;
  tbf: number | null;
  detection: number;
  attente: number;
  reparation: number;
  remise: number;
  intervenant: "interne" | "sous_traitance";
  pieces: PieceFacturee[];
  rebuts: number;
  cout: DetailCout;
  rechute: boolean;
  tronque: boolean;
}

function pousserEvenement(p: Partie, args: PousserArgs): void {
  p.compteurEvenement += 1;
  const ev: EvenementPartie = {
    id_evenement: identifiant("PA", p.compteurEvenement),
    id_equipement: "REM",
    id_sous_ensemble: args.mode.id_sous_ensemble,
    id_mode_defaillance: args.mode.id_mode,
    description: args.mode.designation,
    type_maintenance: args.type,
    action: args.action,
    reparation_provisoire: args.provisoire,
    hors_temps_ouverture: args.hors,
    debut_arret_h_ouverture: args.debut,
    tbf_precedent_h: args.tbf,
    duree_detection_h: args.detection,
    duree_attente_logistique_h: args.attente,
    duree_reparation_active_h: args.reparation,
    duree_remise_en_service_h: args.remise,
    duree_arret_totale_h: args.cout.ta,
    nb_techniciens: args.intervenant === "interne" ? techniciensInternes(args.mode) : 0,
    intervenant: args.intervenant,
    heures_main_oeuvre_h: args.cout.heuresMainOeuvre,
    pieces: args.pieces.map((x) => ({ ref: x.ref, quantite: x.quantite, prix_unitaire_eur: x.prixUnitaire })),
    cout_pieces_eur: args.cout.coutPieces,
    cout_main_oeuvre_eur: args.cout.coutMainOeuvre,
    cout_sous_traitance_eur: args.cout.coutSousTraitance,
    cout_direct_eur: args.cout.coutDirect,
    penalite_arret_eur_par_h: args.cout.penaliteHoraire,
    cout_arret_production_eur: args.cout.coutArret,
    nb_rebuts_bouteilles: args.rebuts,
    cout_rebuts_eur: args.cout.coutRebuts,
    cout_indirect_eur: args.cout.coutIndirect,
    cout_total_eur: args.cout.coutTotal,
    tour: p.tour,
    rechute: args.rechute,
    tronque: args.tronque,
  };
  p.evenements.push(ev);
}

function pousserEvenementForfait(
  p: Partie,
  args: { mode: ModeDefaillance; pieces: PieceFacturee[]; coutPieces: number; coutMo: number; coutDirect: number; texte: string },
): void {
  p.compteurEvenement += 1;
  p.evenements.push({
    id_evenement: identifiant("PA", p.compteurEvenement),
    id_equipement: "REM",
    id_sous_ensemble: args.mode.id_sous_ensemble,
    id_mode_defaillance: args.mode.id_mode,
    description: args.mode.designation,
    type_maintenance: "preventive_systematique",
    action: "remplacement",
    reparation_provisoire: false,
    hors_temps_ouverture: true,
    debut_arret_h_ouverture: null,
    tbf_precedent_h: null,
    duree_detection_h: 0,
    duree_attente_logistique_h: 0,
    duree_reparation_active_h: politiqueRemM1().duree_h,
    duree_remise_en_service_h: 0,
    duree_arret_totale_h: politiqueRemM1().duree_h,
    nb_techniciens: politiqueRemM1().nb_techniciens,
    intervenant: "interne",
    heures_main_oeuvre_h: politiqueRemM1().duree_h * politiqueRemM1().nb_techniciens,
    pieces: args.pieces.map((x) => ({ ref: x.ref, quantite: x.quantite, prix_unitaire_eur: x.prixUnitaire })),
    cout_pieces_eur: args.coutPieces,
    cout_main_oeuvre_eur: args.coutMo,
    cout_sous_traitance_eur: 0,
    cout_direct_eur: args.coutDirect,
    penalite_arret_eur_par_h: 0,
    cout_arret_production_eur: 0,
    nb_rebuts_bouteilles: 0,
    cout_rebuts_eur: 0,
    cout_indirect_eur: 0,
    cout_total_eur: args.coutDirect,
    tour: p.tour,
    rechute: false,
    tronque: false,
  });
  p.recit.push({ tour: p.tour, heure: null, texte: args.texte });
}

function livrer(p: Partie): void {
  for (const commande of p.commandes) {
    if (commande.livree || commande.heureArrivee > p.heure + EPS) continue;
    commande.livree = true;
    const deja = p.stock.find((lot) => lot.ref === commande.ref && Math.abs(lot.prixUnitaire - commande.prixUnitaire) < 1e-6);
    if (deja) deja.qte += commande.qte;
    else p.stock.push({ ref: commande.ref, qte: commande.qte, prixUnitaire: commande.prixUnitaire });
    p.recit.push({
      tour: p.tour,
      heure: commande.heureArrivee,
      texte: `${quand(commande.heureArrivee)} — livraison ${commande.qte} × ${commande.ref} (${commande.delai === "express" ? "express" : "délai standard"}).`,
    });
  }
}

function prochaineLivraison(p: Partie): number | null {
  let meilleure: number | null = null;
  for (const commande of p.commandes) {
    if (commande.livree || commande.heureArrivee <= p.heure + EPS) continue;
    if (meilleure === null || commande.heureArrivee < meilleure) meilleure = commande.heureArrivee;
  }
  return meilleure;
}

function nouveauChamp(id: ChampBilan["id"], libelle: string, attendu: number): ChampBilan {
  return {
    id,
    libelle,
    attendu,
    essais: 0,
    resolu: false,
    correctionAffichee: false,
    valeurSaisie: null,
    dernierMessage: null,
  };
}

function identifiant(prefixe: string, n: number): string {
  return `${prefixe}-${String(n).padStart(4, "0")}`;
}

function quand(heure: number): string {
  return libelleHoraire(heure, heuresParSemaine());
}

function formatHeuresCourtes(h: number): string {
  return `${round4(h)} h`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
