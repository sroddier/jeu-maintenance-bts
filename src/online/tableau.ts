import { jourParis } from "./dates";

export interface LigneTableau {
  id: string;
  createdAt: string;
  pseudo: string;
  seed: string;
  niveau: number;
  score: number;
  ao: number;
  etoiles: number;
  pctCalculsJustes: number;
  versionJeu: string;
}

export type ColonneTri =
  | "pseudo"
  | "seed"
  | "niveau"
  | "score"
  | "ao"
  | "etoiles"
  | "pctCalculsJustes"
  | "createdAt";

export interface FiltreTableau {
  pseudo: string;
  debut: string;
  fin: string;
}

export interface TriTableau {
  colonne: ColonneTri;
  sens: "asc" | "desc";
}

export function sensInitial(colonne: ColonneTri): "asc" | "desc" {
  return colonne === "pseudo" || colonne === "seed" ? "asc" : "desc";
}

export function filtrerEtTrier(
  lignes: readonly LigneTableau[],
  filtre: FiltreTableau,
  tri: TriTableau,
): LigneTableau[] {
  const cherche = plier(filtre.pseudo.trim());
  const garde = lignes.filter((ligne) => {
    if (cherche && !plier(ligne.pseudo).includes(cherche)) return false;
    const jour = jourParis(ligne.createdAt);
    if (filtre.debut && (!jour || jour < filtre.debut)) return false;
    if (filtre.fin && (!jour || jour > filtre.fin)) return false;
    return true;
  });
  const sens = tri.sens === "asc" ? 1 : -1;
  return [...garde].sort((a, b) => {
    const ecart = comparer(a, b, tri.colonne);
    if (ecart !== 0) return ecart * sens;
    return a.id.localeCompare(b.id);
  });
}

export function ligneDepuisApi(row: Record<string, unknown>): LigneTableau | null {
  const id = texte(row.id);
  const createdAt = texte(row.created_at);
  const pseudo = texte(row.pseudo);
  const seed = texte(row.seed);
  if (!id || !createdAt || !pseudo) return null;
  const niveau = nombre(row.niveau);
  const score = nombre(row.score);
  const ao = nombre(row.ao);
  const etoiles = nombre(row.etoiles);
  const pct = nombre(row.pct_calculs_justes);
  if (niveau === null || score === null || ao === null || etoiles === null || pct === null) return null;
  return {
    id,
    createdAt,
    pseudo,
    seed,
    niveau,
    score,
    ao,
    etoiles,
    pctCalculsJustes: pct,
    versionJeu: texte(row.version_jeu),
  };
}

function comparer(a: LigneTableau, b: LigneTableau, colonne: ColonneTri): number {
  const va = a[colonne];
  const vb = b[colonne];
  if (typeof va === "number" && typeof vb === "number") return va - vb;
  return String(va).localeCompare(String(vb), "fr", { numeric: true, sensitivity: "base" });
}

function plier(valeur: string): string {
  return valeur.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("fr-FR");
}

function texte(valeur: unknown): string {
  return typeof valeur === "string" ? valeur : "";
}

function nombre(valeur: unknown): number | null {
  if (typeof valeur === "number" && Number.isFinite(valeur)) return valeur;
  if (typeof valeur === "string" && valeur.trim() !== "") {
    const n = Number(valeur);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
