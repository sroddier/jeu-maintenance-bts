/** Petit morceau de localStorage, remplaçable dans les tests. */
export interface Stockage {
  getItem(cle: string): string | null;
  setItem(cle: string, valeur: string): void;
  removeItem(cle: string): void;
}

export const CLE_PSEUDO = "jeu-maintenance-bts-pseudo";
export const CLE_ID_PARTIE = "jeu-maintenance-bts-id-partie";
export const CLE_FILE = "jeu-maintenance-bts-file-resultats";
export const CLE_ENVOYES = "jeu-maintenance-bts-resultats-envoyes";

export function stockageNavigateur(): Stockage {
  return localStorage;
}

export function stockageMemoire(initial: Record<string, string> = {}): Stockage {
  const valeurs = new Map(Object.entries(initial));
  return {
    getItem(cle) {
      return valeurs.get(cle) ?? null;
    },
    setItem(cle, valeur) {
      valeurs.set(cle, valeur);
    },
    removeItem(cle) {
      valeurs.delete(cle);
    },
  };
}
