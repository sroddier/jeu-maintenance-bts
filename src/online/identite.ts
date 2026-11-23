import { CLE_ID_PARTIE, CLE_PSEUDO, type Stockage } from "./stockage";
import { normaliserPseudo, pseudoValide } from "./pseudo";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function lirePseudo(stockage: Stockage): string {
  const valeur = stockage.getItem(CLE_PSEUDO) ?? "";
  return pseudoValide(valeur) ? normaliserPseudo(valeur) : "";
}

export function memoriserPseudo(stockage: Stockage, pseudo: string): void {
  const normalise = normaliserPseudo(pseudo);
  if (!pseudoValide(normalise)) return;
  stockage.setItem(CLE_PSEUDO, normalise);
}

/** Nouvel identifiant à chaque partie. Il sert à ne pas envoyer deux fois la même. */
export function nouvelIdPartie(stockage: Stockage): string {
  const id = crypto.randomUUID();
  stockage.setItem(CLE_ID_PARTIE, id);
  return id;
}

export function idPartieCourante(stockage: Stockage): string {
  const existant = stockage.getItem(CLE_ID_PARTIE) ?? "";
  if (UUID.test(existant)) return existant;
  return nouvelIdPartie(stockage);
}
