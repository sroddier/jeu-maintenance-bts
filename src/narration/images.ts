import narratif from "../../data/narratif.json";

export interface SlotImage {
  fichier: string;
  usage: string;
  taille: string;
  ratio: string;
  width: number;
  height: number;
}

export function joindreBase(base: string, chemin: string): string {
  const prefix = base.endsWith("/") ? base : `${base}/`;
  return `${prefix}${chemin.replace(/^\/+/, "")}`;
}

export function urlPublic(chemin: string): string {
  return joindreBase(import.meta.env.BASE_URL || "/", chemin);
}

/** Le WebP généré porte le même nom que la source, quelle que soit l'extension citée. */
export function cheminWebp(fichier: string): string {
  return fichier.replace(/\.(webp|png|jpe?g)$/i, ".webp");
}

/** Silhouette de repli, même nom. */
export function cheminSvg(fichier: string): string {
  return fichier.replace(/\.(webp|png|jpe?g)$/i, ".svg");
}

export function lireTaille(taille: string): { width: number; height: number } {
  const match = /(\d+)\s*[×x]\s*(\d+)/.exec(taille);
  if (!match) throw new Error(`Taille d'image illisible : ${taille}`);
  return { width: Number(match[1]), height: Number(match[2]) };
}

export function slotsImages(): SlotImage[] {
  return narratif.images.map((image) => {
    const { width, height } = lireTaille(image.taille);
    return { fichier: image.fichier, usage: image.usage, taille: image.taille, ratio: image.ratio, width, height };
  });
}

export function slotParFichier(fichier: string): SlotImage | undefined {
  return slotsImages().find((slot) => slot.fichier === fichier);
}

const PHASES: Record<string, string> = {
  planifier: "assets/img/phase-planifier.webp",
  evenements: "assets/img/phase-evenements.webp",
  intervenir: "assets/img/phase-intervenir.webp",
  bilan: "assets/img/phase-bilan.webp",
};

export function imageDePhase(phase: string): string | null {
  return PHASES[phase] ?? null;
}

export const IMAGE_TITRE = "assets/img/titre-ligne-l1.webp";
export const IMAGE_CHARGEMENT = "assets/img/chargement.webp";
export const IMAGE_GMAO = "assets/img/lieu-gmao.webp";
export const IMAGE_MAGASIN = "assets/img/lieu-magasin.webp";
export const IMAGE_BUREAU = "assets/img/lieu-bureau-directrice.webp";
export const PORTRAIT_FACHEE = "assets/img/portrait-directrice-fachee.png";
