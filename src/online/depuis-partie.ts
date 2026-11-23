import { evaluerPartie, type Partie } from "../sim/partie";
import { ligneValide, nombreEnvoi, versionCourante, type LigneResultat } from "./ligne";
import { normaliserPseudo, pseudoValide } from "./pseudo";

/**
 * Lit le bilan déjà calculé par le jeu. N'appelle aucune règle de score
 * nouvelle : evaluerPartie reste la seule source.
 */
export function resultatDepuisPartie(partie: Partie, id: string): LigneResultat | null {
  if (partie.phase !== "termine") return null;
  if (!pseudoValide(partie.pseudo)) return null;
  const { synthese, score } = evaluerPartie(partie);
  const ao = nombreEnvoi(synthese.indicateurs.Ao);
  const total = nombreEnvoi(score.total);
  const pct = nombreEnvoi(score.justesseRatio * 100);
  if (ao === null || total === null || pct === null) return null;
  const ligne: LigneResultat = {
    id,
    pseudo: normaliserPseudo(partie.pseudo),
    seed: partie.seedLabel.trim(),
    niveau: 1,
    score: total,
    ao,
    etoiles: score.etoiles,
    pctCalculsJustes: pct,
    versionJeu: versionCourante(),
  };
  return ligneValide(ligne) ? ligne : null;
}
