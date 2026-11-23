/** Affichage et CSV en français, sans dépendre de la locale du poste. */

export function nombreFr(n: number, decimales = 2): string {
  if (!Number.isFinite(n)) return "";
  const facteur = 10 ** decimales;
  const arrondi = Math.round((n + Number.EPSILON) * facteur) / facteur;
  const negatif = arrondi < 0;
  const [entier, frac = ""] = Math.abs(arrondi).toFixed(decimales).split(".");
  const reste = frac.replace(/0+$/, "");
  const texte = reste ? `${entier},${reste}` : entier;
  return negatif ? `-${texte}` : texte;
}

export interface LigneCsv {
  pseudo: string;
  seed: string;
  niveau: number;
  score: number;
  ao: number;
  etoiles: number;
  pctCalculsJustes: number;
  dateParis: string;
}

const ENTETE = ["Prénom", "Graine", "Niveau", "Score", "Ao", "Étoiles", "% calculs justes", "Date (Paris)"];

/** Point-virgule, UTF-8 avec BOM, virgule décimale : Excel en français l'ouvre directement. */
export function exporterCsvProf(lignes: readonly LigneCsv[]): string {
  const corps = [ENTETE, ...lignes.map(versCellules)];
  return `\uFEFF${corps.map((ligne) => ligne.map(cellule).join(";")).join("\r\n")}\r\n`;
}

function versCellules(ligne: LigneCsv): string[] {
  return [
    ligne.pseudo,
    ligne.seed,
    String(ligne.niveau),
    nombreFr(ligne.score),
    nombreFr(ligne.ao),
    String(ligne.etoiles),
    nombreFr(ligne.pctCalculsJustes),
    ligne.dateParis,
  ];
}

function cellule(valeur: string): string {
  if (/[;"\r\n]/.test(valeur)) return `"${valeur.replace(/"/g, '""')}"`;
  return valeur;
}
