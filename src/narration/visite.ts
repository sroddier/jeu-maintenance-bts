import type { EvenementSpecial } from "../sim/types";
import { usine } from "../sim/usine";
import { evenementParId } from "./contenu";
import { tirageCanal } from "./prng";

/**
 * Lit `usine.json` → `evenements.liste`.
 * Seuls les événements sans effet chiffré sont affichés. E01 à E07 restent dans les données
 * et ne sont pas appliqués : leur moteur viendra plus tard.
 * Au niveau 1, la liste ne retient que E08 (cosmétique, PRNG séparé).
 */
export function evenementsAffichables(niveau: number, source = usine): EvenementSpecial[] {
  return source.evenements.liste.filter(
    (evenement) => evenement.niveaux.includes(niveau) && evenement.effet_numerique === false,
  );
}

export function idsEvenementsAffiches(niveau: number): string[] {
  return evenementsAffichables(niveau).map((evenement) => evenement.id_evenement);
}

export function carteVisiteClient(
  seedSimulation: number,
  tour: number,
  nbTours: number,
  niveau: number,
): { id_evenement: string; nom: string; personnage: string; image: string; semaine: number } | null {
  const evenement = evenementsAffichables(niveau).find((item) => item.parametres.prng_separe === true);
  if (!evenement || evenement.max_par_partie === 0 || nbTours < 1) return null;
  const passage = tirageCanal(seedSimulation, `${evenement.id_evenement}:passage`);
  if (passage.valeur >= evenement.probabilite) return null;
  const quand = tirageCanal(seedSimulation, `${evenement.id_evenement}:semaine`);
  const semaine = 1 + Math.min(nbTours - 1, Math.floor(quand.valeur * nbTours));
  if (tour !== semaine) return null;
  const texte = evenementParId(evenement.id_evenement);
  if (!texte) return null;
  return {
    id_evenement: evenement.id_evenement,
    nom: texte.nom,
    personnage: texte.personnage,
    image: texte.image,
    semaine,
  };
}
