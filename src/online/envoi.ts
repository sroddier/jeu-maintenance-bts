import { dejaEnvoye, lireFile, lireIdsEnvoyes, marquerEnvoye, mettreEnFile, retirerDeLaFile } from "./file";
import { ligneValide, type LigneResultat } from "./ligne";
import type { Stockage } from "./stockage";

export interface ErreurEnvoi {
  code?: string;
  message: string;
}

export interface ClientResultats {
  inserer(ligne: LigneResultat): Promise<ErreurEnvoi | null>;
}

export type ResultatDepot = "envoye" | "en_attente" | "refuse";

/** Violations de contrainte : renvoyer la même ligne ne réussira pas. */
const CODES_REFUS = new Set(["23514", "23502", "22P02", "22003", "22001"]);

let chaine: Promise<void> = Promise.resolve();

function enSerie<T>(action: () => Promise<T>): Promise<T> {
  const resultat = chaine.then(action, action);
  chaine = resultat.then(
    () => undefined,
    () => undefined,
  );
  return resultat;
}

/**
 * Ajoute la ligne à la file, puis tente d'envoyer tout ce qui attend.
 * Le même id n'est inséré qu'une fois : un succès ou une clé déjà présente
 * retire la ligne.
 */
export function deposerResultat(
  ligne: LigneResultat,
  client: ClientResultats,
  stockage: Stockage,
): Promise<ResultatDepot> {
  return enSerie(async () => {
    if (!ligneValide(ligne)) return "refuse";
    if (!dejaEnvoye(stockage, ligne.id)) mettreEnFile(stockage, ligne);
    await envoyerTout(client, stockage);
    if (dejaEnvoye(stockage, ligne.id)) return "envoye";
    if (!lireFile(stockage).some((entree) => entree.id === ligne.id)) return "refuse";
    return "en_attente";
  });
}

/** Rejoue la file au chargement de la page ou à la fin de partie suivante. */
export function renvoyerFile(
  client: ClientResultats,
  stockage: Stockage,
): Promise<{ envoyes: string[]; enAttente: string[] }> {
  return enSerie(async () => {
    const avant = new Set(lireIdsEnvoyes(stockage));
    await envoyerTout(client, stockage);
    const envoyes = lireIdsEnvoyes(stockage).filter((id) => !avant.has(id));
    return { envoyes, enAttente: lireFile(stockage).map((entree) => entree.id) };
  });
}

async function envoyerTout(client: ClientResultats, stockage: Stockage): Promise<void> {
  const file = lireFile(stockage);
  for (const ligne of file) {
    if (dejaEnvoye(stockage, ligne.id)) {
      retirerDeLaFile(stockage, ligne.id);
      continue;
    }
    let erreur: ErreurEnvoi | null;
    try {
      erreur = await client.inserer(ligne);
    } catch (incident) {
      erreur = { message: incident instanceof Error ? incident.message : "réseau" };
    }
    if (!erreur || erreur.code === "23505") {
      marquerEnvoye(stockage, ligne.id);
      continue;
    }
    if (erreur.code && CODES_REFUS.has(erreur.code)) {
      retirerDeLaFile(stockage, ligne.id);
    }
  }
}
