/** Affichage français stable (sans dépendre de la locale ICU). */
export function formatNombre(n: number, decimales = 2): string {
  if (!Number.isFinite(n)) return "—";
  const facteur = 10 ** decimales;
  const arrondi = Math.round((n + Number.EPSILON) * facteur) / facteur;
  const negatif = arrondi < 0;
  const [entier, frac = ""] = Math.abs(arrondi).toFixed(decimales).split(".");
  const groupes = entier.replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");
  const reste = frac.replace(/0+$/, "");
  const texte = reste ? `${groupes},${reste}` : groupes;
  return negatif ? `-${texte}` : texte;
}

export function formatEuros(n: number): string {
  return `${formatNombre(n, 2)}\u00a0€`;
}

export function formatHeures(n: number): string {
  return `${formatNombre(n, 2)}\u00a0h`;
}

export function formatPourcent(n: number): string {
  return `${formatNombre(n, 2)}\u00a0%`;
}

const JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi"] as const;

/** Heure d'ouverture absolue → « mercredi 14 h 15 » (semaine 05:00–21:00, 16 h/jour). */
export function libelleHoraire(heureAbsolue: number, heuresSemaine: number): string {
  const dansSemaine = ((heureAbsolue % heuresSemaine) + heuresSemaine) % heuresSemaine;
  const jour = Math.min(JOURS.length - 1, Math.floor(dansSemaine / 16));
  const dansJour = dansSemaine - jour * 16;
  const minutes = Math.round(dansJour * 60);
  const hh = 5 + Math.floor(minutes / 60);
  const mm = minutes % 60;
  return `${JOURS[jour]} ${String(hh).padStart(2, "0")} h ${String(mm).padStart(2, "0")}`;
}
