import { ligneValide, type LigneResultat } from "./ligne";
import { CLE_ENVOYES, CLE_FILE, type Stockage } from "./stockage";

const MAX_FILE = 100;
const MAX_ENVOYES = 200;

export function lireFile(stockage: Stockage): LigneResultat[] {
  return lireTableau(stockage, CLE_FILE).flatMap((valeur) => {
    const ligne = normaliserLigne(valeur);
    return ligne ? [ligne] : [];
  });
}

export function mettreEnFile(stockage: Stockage, ligne: LigneResultat): void {
  if (!ligneValide(ligne) || dejaEnvoye(stockage, ligne.id)) return;
  const file = lireFile(stockage);
  if (file.some((entree) => entree.id === ligne.id)) return;
  ecrireJson(stockage, CLE_FILE, [...file, ligne].slice(-MAX_FILE));
}

export function retirerDeLaFile(stockage: Stockage, id: string): void {
  const file = lireFile(stockage).filter((entree) => entree.id !== id);
  ecrireJson(stockage, CLE_FILE, file);
}

export function dejaEnvoye(stockage: Stockage, id: string): boolean {
  return lireEnvoyes(stockage).includes(id);
}

export function lireIdsEnvoyes(stockage: Stockage): string[] {
  return lireEnvoyes(stockage);
}

export function marquerEnvoye(stockage: Stockage, id: string): void {
  const ids = lireEnvoyes(stockage).filter((connu) => connu !== id);
  ids.push(id);
  ecrireJson(stockage, CLE_ENVOYES, ids.slice(-MAX_ENVOYES));
  retirerDeLaFile(stockage, id);
}

function lireEnvoyes(stockage: Stockage): string[] {
  return lireTableau(stockage, CLE_ENVOYES).filter((valeur): valeur is string => typeof valeur === "string");
}

function lireTableau(stockage: Stockage, cle: string): unknown[] {
  try {
    const brut = stockage.getItem(cle);
    if (!brut) return [];
    const lu = JSON.parse(brut) as unknown;
    return Array.isArray(lu) ? lu : [];
  } catch {
    return [];
  }
}

function ecrireJson(stockage: Stockage, cle: string, valeur: unknown): void {
  stockage.setItem(cle, JSON.stringify(valeur));
}

function normaliserLigne(valeur: unknown): LigneResultat | null {
  if (!valeur || typeof valeur !== "object") return null;
  const ligne = valeur as Partial<LigneResultat>;
  const candidat: LigneResultat = {
    id: String(ligne.id ?? ""),
    pseudo: String(ligne.pseudo ?? ""),
    seed: String(ligne.seed ?? ""),
    niveau: Number(ligne.niveau),
    score: Number(ligne.score),
    ao: Number(ligne.ao),
    etoiles: Number(ligne.etoiles),
    pctCalculsJustes: Number(ligne.pctCalculsJustes),
    versionJeu: String(ligne.versionJeu ?? ""),
  };
  return ligneValide(candidat) ? candidat : null;
}
