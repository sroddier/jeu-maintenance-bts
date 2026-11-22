import narratif from "../../data/narratif.json";

export interface Personnage {
  id: string;
  nom: string;
  role: string;
  portrait: string;
  repliques: readonly string[];
  competences_modes: readonly string[];
}

export interface EcranIntro {
  ordre: number;
  id_equipement: string | null;
  titre: string;
  guide: string;
  image: string;
  texte: readonly string[];
  fait_cle: string;
  duree_s: number;
}

export interface ReactionTexte {
  id: string;
  famille: string;
  personnage: string;
  niveaux: string;
  condition: string;
  replique: string;
  cooldown: string;
}

export interface Blague {
  id: string;
  phase: string;
  texte: string;
}

/** Texte et image seulement. Les chiffres vivent dans usine.json, clé evenements.liste. */
export interface EvenementTexte {
  id_evenement: string;
  nom: string;
  personnage: string;
  image: string;
}

export interface PalierColere {
  palier: number;
  seuil_h: number;
}

export const personnages = narratif.personnages as readonly Personnage[];
export const ecransIntro = narratif.intro.ecrans as readonly EcranIntro[];
export const boutonPasser = narratif.intro.bouton_passer;
export const introPassable = narratif.intro.passable;
export const reactions = narratif.reactions.liste as readonly ReactionTexte[];
export const paliersColere = narratif.reactions.paliers_colere_h as readonly PalierColere[];
export const objectifAo = narratif.reactions.objectif_ao_goulot as Readonly<Record<string, number>>;
export const blagues = narratif.blagues as readonly Blague[];
export const blaguePersonnage = narratif.blagues_personnages.par_phase as Readonly<Record<string, string>>;
export const evenementsTexte = narratif.evenements.liste as readonly EvenementTexte[];

export function personnageParId(id: string): Personnage | undefined {
  return personnages.find((personnage) => personnage.id === id);
}

export function reactionParId(id: string): ReactionTexte | undefined {
  return reactions.find((reaction) => reaction.id === id);
}

export function evenementParId(id: string): EvenementTexte | undefined {
  return evenementsTexte.find((evenement) => evenement.id_evenement === id);
}

export function blaguesDe(phase: string): Blague[] {
  return blagues.filter((blague) => blague.phase === phase);
}

/** Objectif d'Ao du goulot, en %. Lu dans le narratif (seuils de félicitation), pas dans usine.json. */
export function objectifAoPct(niveau: number): number {
  const ratio = objectifAo[String(niveau)] ?? objectifAo["1"] ?? 0.92;
  return ratio * 100;
}

export function seuilColere(palier: number): number | undefined {
  return paliersColere.find((entree) => entree.palier === palier)?.seuil_h;
}
