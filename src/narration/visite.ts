import { evenementParId } from "./contenu";
import { semaineVisiteClient } from "./prng";

/**
 * E08, visite client. Cosmétique : aucun effet, aucun tirage du PRNG de simulation.
 * E01 à E07 ne sont pas joués : leurs paramètres chiffrés arriveront dans usine.json
 * (`evenements.liste`) et leurs effets feront l'objet d'une PR ultérieure.
 * Au niveau 1, E08 est la seule carte possible.
 */
export function idsEvenementsAffiches(niveau: number): readonly string[] {
  if (niveau < 1) return [];
  return ["E08"];
}

export function carteVisiteClient(
  seedSimulation: number,
  tour: number,
  nbTours: number,
  niveau: number,
): { id_evenement: "E08"; nom: string; personnage: string; image: string; semaine: number } | null {
  if (!idsEvenementsAffiches(niveau).includes("E08")) return null;
  const semaine = semaineVisiteClient(seedSimulation, nbTours);
  if (tour !== semaine) return null;
  const texte = evenementParId("E08");
  if (!texte) return null;
  return {
    id_evenement: "E08",
    nom: texte.nom,
    personnage: texte.personnage,
    image: texte.image,
    semaine,
  };
}
