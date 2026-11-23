import { VERSION_JEU } from "./config";
import { normaliserPseudo, pseudoValide } from "./pseudo";

/** Ce que le jeu connaît à la fin de la partie. Le module ne recalcule rien. */
export interface LigneResultat {
  id: string;
  pseudo: string;
  seed: string;
  niveau: number;
  score: number;
  ao: number;
  etoiles: number;
  pctCalculsJustes: number;
  versionJeu: string;
}

/** Colonnes envoyées. created_at reste vide : le serveur met l'heure. */
export interface LigneSql {
  id: string;
  pseudo: string;
  seed: string;
  niveau: number;
  score: number;
  ao: number;
  etoiles: number;
  pct_calculs_justes: number;
  version_jeu: string;
}

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function ligneSql(ligne: LigneResultat): LigneSql {
  return {
    id: ligne.id,
    pseudo: ligne.pseudo,
    seed: ligne.seed,
    niveau: ligne.niveau,
    score: ligne.score,
    ao: ligne.ao,
    etoiles: ligne.etoiles,
    pct_calculs_justes: ligne.pctCalculsJustes,
    version_jeu: ligne.versionJeu,
  };
}

export function ligneValide(ligne: LigneResultat): boolean {
  return (
    UUID.test(ligne.id) &&
    pseudoValide(ligne.pseudo) &&
    ligne.pseudo === normaliserPseudo(ligne.pseudo) &&
    seedValide(ligne.seed) &&
    Number.isInteger(ligne.niveau) &&
    ligne.niveau >= 1 &&
    ligne.niveau <= 6 &&
    dansBorne(ligne.score) &&
    dansBorne(ligne.ao) &&
    Number.isInteger(ligne.etoiles) &&
    ligne.etoiles >= 0 &&
    ligne.etoiles <= 3 &&
    dansBorne(ligne.pctCalculsJustes) &&
    /^[0-9A-Za-z.+_-]{1,32}$/.test(ligne.versionJeu)
  );
}

export function nombreEnvoi(n: number): number | null {
  if (!Number.isFinite(n)) return null;
  if (n < 0 && n >= -1e-6) return 0;
  if (n > 100 && n <= 100 + 1e-6) return 100;
  if (n < 0 || n > 100) return null;
  return n;
}

export function versionCourante(): string {
  return VERSION_JEU;
}

function dansBorne(n: number): boolean {
  return nombreEnvoi(n) === n;
}

function seedValide(seed: string): boolean {
  return seed.length >= 1 && seed.length <= 80 && seed === seed.trim() && !/[\u0000-\u001F\u007F]/.test(seed);
}
