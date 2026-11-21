import { formatHeures, formatNombre, formatPourcent } from "./format";

export type IdChamp = "mtbf" | "mttr" | "ao";

export interface ContexteSaisie {
  tr: number;
  n: number;
  sommeTA: number;
  sommeReparation: number;
  mtbf: number | null;
  mttr: number | null;
  mdt: number | null;
  ai: number | null;
  /** Disponibilité opérationnelle en %. */
  dispo: number;
}

export interface EvaluationSaisie {
  ok: boolean;
  valeur: number | null;
  indice: string;
  correction: string;
}

const TOL_HEURE = 0.05;
const TOL_POINT = 0.05;

/** Accepte la virgule, le point, les espaces, et un suffixe h ou %. */
export function parserNombre(raw: string): number | null {
  const texte = raw
    .trim()
    .replace(/[\s\u00a0\u202f]/g, "")
    .replace(",", ".")
    .replace(/(h|%|€)$/i, "");
  if (!texte || !/^[-+]?\d+(\.\d+)?$/.test(texte)) return null;
  const n = Number(texte);
  return Number.isFinite(n) ? n : null;
}

export function evaluerSaisie(id: IdChamp, raw: string, ctx: ContexteSaisie): EvaluationSaisie {
  const attendu = valeurAttendue(id, ctx);
  const correction = messageCorrection(id, ctx);
  const valeur = parserNombre(raw);
  if (valeur === null) {
    return {
      ok: false,
      valeur: null,
      indice: "Saisis un nombre. La virgule et le point sont acceptés, l'unité est inutile.",
      correction,
    };
  }
  if (id === "ao" && valeur >= 0 && valeur <= 1.5 && ctx.dispo >= 2 && Math.abs(valeur * 100 - ctx.dispo) <= TOL_POINT) {
    return {
      ok: false,
      valeur,
      indice: `Tu as saisi une fraction. La disponibilité se saisit en pourcent : ${formatPourcent(ctx.dispo)} s'écrit ${formatNombre(ctx.dispo, 2)}, pas ${formatNombre(valeur, 2)}.`,
      correction,
    };
  }
  if (id !== "ao" && attendu !== null && valeur > attendu * 20 && Math.abs(valeur / 60 - attendu) <= 0.2) {
    return {
      ok: false,
      valeur,
      indice: "Les durées du jeu sont en heures, pas en minutes.",
      correction,
    };
  }
  const tol = id === "ao" ? TOL_POINT : TOL_HEURE;
  if (attendu !== null && Math.abs(valeur - attendu) <= tol + 1e-9) {
    return { ok: true, valeur, indice: "Juste.", correction };
  }
  return { ok: false, valeur, indice: indiceCible(id, valeur, ctx), correction };
}

function valeurAttendue(id: IdChamp, ctx: ContexteSaisie): number | null {
  if (id === "mtbf") return ctx.mtbf;
  if (id === "mttr") return ctx.mttr;
  return ctx.dispo;
}

function indiceCible(id: IdChamp, saisi: number, ctx: ContexteSaisie): string {
  if (id === "mtbf" && ctx.n > 0 && proche(saisi, ctx.tr / ctx.n, 0.15)) {
    return `Tu as fait Tr / N = ${formatHeures(ctx.tr)} / ${ctx.n}. Le MTBF utilise le temps de bon fonctionnement : ΣTBF = Tr − ΣTA, puis MTBF = ΣTBF / N.`;
  }
  if (id === "mttr" && ctx.mdt !== null && proche(saisi, ctx.mdt, 0.15)) {
    return "Cette valeur est le MDT : elle mélange détection, attente, réparation et remise en service. Le MTTR ne retient que la réparation active.";
  }
  if (id === "ao" && ctx.ai !== null && proche(saisi, ctx.ai, 0.2) && !proche(ctx.dispo, ctx.ai, TOL_POINT)) {
    return "Cette valeur est l'Ai, calculée avec le MTTR. L'Ao compte tout le temps d'arrêt : Ao = (Tr − ΣTA) / Tr.";
  }
  if (id === "ao" && proche(saisi, 100, 0.15) && !proche(ctx.dispo, 100, TOL_POINT)) {
    return "100 % voudrait dire qu'il n'y a pas eu d'arrêt. Retire ΣTA de Tr.";
  }
  if (id === "mtbf" && saisi > ctx.tr + TOL_HEURE) {
    return "Le MTBF ne peut pas dépasser Tr. ΣTBF = Tr − ΣTA est plus petit que Tr dès qu'il y a un arrêt.";
  }
  if (id === "ao" && saisi > 100 + TOL_POINT) {
    return "Une disponibilité ne dépasse pas 100 %.";
  }
  if (id === "mtbf") {
    return `ΣTBF = Tr − ΣTA = ${formatHeures(ctx.tr)} − ${formatHeures(ctx.sommeTA)}. Ensuite MTBF = ΣTBF / N, avec N = ${ctx.n}.`;
  }
  if (id === "mttr") {
    return `MTTR = Σ réparations actives / N = ${formatHeures(ctx.sommeReparation)} / ${ctx.n}. N'ajoute ni l'attente, ni la détection, ni la remise en service.`;
  }
  return `Ao = (Tr − ΣTA) / Tr × 100, avec Tr = ${formatHeures(ctx.tr)} et ΣTA = ${formatHeures(ctx.sommeTA)}.`;
}

function messageCorrection(id: IdChamp, ctx: ContexteSaisie): string {
  if (id === "mtbf" && ctx.mtbf !== null) {
    return `MTBF = (Tr − ΣTA) / N = (${formatNombre(ctx.tr, 2)} − ${formatNombre(ctx.sommeTA, 2)}) / ${ctx.n} = ${formatHeures(ctx.mtbf)}.`;
  }
  if (id === "mttr" && ctx.mttr !== null && ctx.mdt !== null) {
    return `MTTR = Σ réparations actives / N = ${formatNombre(ctx.sommeReparation, 2)} / ${ctx.n} = ${formatHeures(ctx.mttr)}. Pour comparer : MDT = ΣTA / N = ${formatHeures(ctx.mdt)}.`;
  }
  return `Ao = (Tr − ΣTA) / Tr × 100 = (${formatNombre(ctx.tr, 2)} − ${formatNombre(ctx.sommeTA, 2)}) / ${formatNombre(ctx.tr, 2)} × 100 = ${formatPourcent(ctx.dispo)}.`;
}

function proche(a: number, b: number, marge: number): boolean {
  return Math.abs(a - b) <= marge;
}
