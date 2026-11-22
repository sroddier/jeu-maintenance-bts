import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { readFileSync } from "node:fs";

const narratif = JSON.parse(readFileSync(new URL("../data/narratif.json", import.meta.url), "utf8"));
const sortie = path.resolve("public/assets/img");
await mkdir(sortie, { recursive: true });

function vue(ratio) {
  if (ratio === "1:1") return [100, 100];
  if (ratio === "4:5") return [80, 100];
  return [160, 90];
}

function escapeXml(valeur) {
  return valeur.replace(/[&<>]/g, (caractere) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[caractere]);
}

function dessin(nom, w, h) {
  const encre = "#16324a";
  const acier = "#8aa4b8";
  const eau = "#0e6b67";
  const orange = "#e07a2f";
  const verre = "#f3d7a1";
  if (nom.includes("portrait")) return portrait(nom, w, h, encre, eau, orange);
  if (nom.includes("souffleuse") || nom.includes("coupure")) return machine(w, h, eau, orange, encre, "four");
  if (nom.includes("convoyeur") || nom.includes("chargement") || nom.includes("titre")) return convoyeur(w, h, acier, verre, encre);
  if (nom.includes("remplisseuse") || nom.includes("visite")) return carrousel(w, h, acier, verre, eau);
  if (nom.includes("boucheuse")) return boucheuse(w, h, acier, orange, encre);
  if (nom.includes("etiqueteuse")) return etiqueteuse(w, h, acier, eau, encre);
  if (nom.includes("fardeleuse") || nom.includes("canicule")) return fardeleuse(w, h, acier, orange, encre);
  if (nom.includes("atelier") || nom.includes("planifier") || nom.includes("gmao")) return atelier(w, h, acier, eau, encre);
  if (nom.includes("magasin") || nom.includes("piece") || nom.includes("fournisseur")) return rayons(w, h, acier, eau, encre);
  if (nom.includes("bureau") || nom.includes("audit") || nom.includes("directrice")) return bureau(w, h, acier, eau, encre);
  if (nom.includes("evenement") || nom.includes("intervenir")) return intervention(w, h, acier, orange, eau, encre);
  if (nom.includes("bilan")) return bilan(w, h, acier, eau, encre);
  if (nom.includes("malade")) return atelier(w, h, acier, orange, encre);
  if (nom.includes("urgente")) return convoyeur(w, h, acier, orange, encre);
  return convoyeur(w, h, acier, verre, encre);
}

function portrait(nom, w, h, encre, eau, orange) {
  const cheveu = nom.includes("meca") ? orange : nom.includes("magasin") ? "#f4f7fb" : nom.includes("fournisseur") ? "#1c2430" : nom.includes("chef") ? "#6b4423" : "#9aa7b2";
  const blouse = nom.includes("magasin") ? "#8d97a1" : nom.includes("fournisseur") ? "#1f6b45" : nom.includes("tech") ? "#16324a" : "#f7f4ee";
  const sourcils = nom.includes("fachee")
    ? `<path d="M30 34 L46 40 M70 40 L54 34" stroke="${encre}" stroke-width="2" fill="none"/>`
    : `<path d="M32 38 H46 M54 38 H68" stroke="${encre}" stroke-width="1.6" fill="none"/>`;
  return `
    <circle cx="50" cy="42" r="22" fill="#f3d7c4"/>
    <path d="M28 40 Q50 16 72 40 Q66 24 50 22 Q34 24 28 40" fill="${cheveu}"/>
    <path d="M18 92 Q18 62 50 62 Q82 62 82 92 Z" fill="${blouse}"/>
    ${sourcils}
    <circle cx="40" cy="46" r="2" fill="${encre}"/>
    <circle cx="60" cy="46" r="2" fill="${encre}"/>
    ${nom.includes("chef") ? `<path d="M36 54 Q50 62 64 54 Q50 66 36 54" fill="#d8c4b0"/>` : `<path d="M44 56 Q50 60 56 56" stroke="${encre}" fill="none"/>`}
  `;
}

function machine(w, h, eau, orange, encre) {
  return `<rect x="18" y="28" width="70" height="36" rx="4" fill="${eau}"/><rect x="92" y="36" width="48" height="28" rx="14" fill="${encre}"/><circle cx="116" cy="50" r="8" fill="${orange}"/>`;
}
function convoyeur(w, h, acier, verre, encre) {
  return `<rect x="12" y="48" width="136" height="10" rx="5" fill="${acier}"/><rect x="28" y="30" width="12" height="22" rx="3" fill="${verre}"/><rect x="52" y="26" width="12" height="26" rx="3" fill="${verre}"/><rect x="76" y="30" width="12" height="22" rx="3" fill="${verre}"/><rect x="100" y="28" width="12" height="24" rx="3" fill="${verre}"/><circle cx="24" cy="62" r="6" fill="${encre}"/><circle cx="136" cy="62" r="6" fill="${encre}"/>`;
}
function carrousel(w, h, acier, verre, eau) {
  return `<circle cx="80" cy="46" r="28" fill="${acier}"/><circle cx="80" cy="46" r="16" fill="${eau}"/><circle cx="80" cy="22" r="5" fill="${verre}"/><circle cx="104" cy="46" r="5" fill="${verre}"/><circle cx="80" cy="70" r="5" fill="${verre}"/><circle cx="56" cy="46" r="5" fill="${verre}"/>`;
}
function boucheuse(w, h, acier, orange, encre) {
  return `<rect x="30" y="24" width="100" height="14" rx="3" fill="${encre}"/><rect x="46" y="38" width="10" height="18" fill="${acier}"/><rect x="75" y="38" width="10" height="18" fill="${acier}"/><rect x="104" y="38" width="10" height="18" fill="${acier}"/><circle cx="51" cy="64" r="6" fill="${orange}"/><circle cx="80" cy="64" r="6" fill="${orange}"/><circle cx="109" cy="64" r="6" fill="${orange}"/>`;
}
function etiqueteuse(w, h, acier, eau, encre) {
  return `<circle cx="40" cy="40" r="16" fill="${acier}"/><circle cx="40" cy="40" r="6" fill="${eau}"/><rect x="56" y="36" width="70" height="8" fill="${encre}"/><rect x="96" y="28" width="18" height="28" rx="2" fill="${eau}"/>`;
}
function fardeleuse(w, h, acier, orange, encre) {
  return `<rect x="24" y="34" width="112" height="28" rx="6" fill="${acier}"/><rect x="70" y="26" width="40" height="36" fill="${orange}" opacity="0.85"/><rect x="36" y="42" width="8" height="16" fill="${encre}"/><rect x="48" y="42" width="8" height="16" fill="${encre}"/>`;
}
function atelier(w, h, acier, eau, encre) {
  return `<rect x="20" y="40" width="120" height="16" fill="${acier}"/><rect x="28" y="24" width="28" height="16" fill="${eau}"/><rect x="104" y="22" width="8" height="18" fill="${encre}"/><rect x="116" y="28" width="8" height="12" fill="${encre}"/>`;
}
function rayons(w, h, acier, eau, encre) {
  return `<rect x="24" y="22" width="112" height="6" fill="${acier}"/><rect x="24" y="44" width="112" height="6" fill="${acier}"/><rect x="24" y="66" width="112" height="6" fill="${acier}"/><rect x="36" y="28" width="16" height="16" fill="${eau}"/><rect x="60" y="50" width="16" height="16" fill="${encre}"/>`;
}
function bureau(w, h, acier, eau, encre) {
  return `<rect x="28" y="18" width="104" height="40" rx="2" fill="${eau}" opacity="0.35"/><rect x="36" y="48" width="88" height="8" fill="${acier}"/><rect x="70" y="56" width="8" height="16" fill="${encre}"/>`;
}
function intervention(w, h, acier, orange, eau, encre) {
  return `<rect x="30" y="30" width="64" height="36" rx="4" fill="${acier}"/><path d="M104 28 L124 48 L116 56 L96 36 Z" fill="${orange}"/><circle cx="48" cy="48" r="6" fill="${eau}"/><rect x="40" y="22" width="8" height="14" fill="${encre}"/>`;
}
function bilan(w, h, acier, eau, encre) {
  return `<rect x="36" y="50" width="14" height="20" fill="${acier}"/><rect x="58" y="36" width="14" height="34" fill="${eau}"/><rect x="80" y="42" width="14" height="28" fill="${encre}"/><rect x="102" y="28" width="14" height="42" fill="${eau}"/>`;
}

for (const image of narratif.images) {
  const [w, h] = vue(image.ratio);
  const nom = path.basename(image.fichier).replace(/\.(webp|png)$/i, "");
  const contenu = nom.includes("portrait") ? portrait(nom, w, h, "#16324a", "#0e6b67", "#e07a2f") : `<g transform="scale(${w / 160} ${h / 90})">${dessin(nom, w, h)}</g>`;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img">
  <title>${escapeXml(image.usage)}</title>
  <rect width="${w}" height="${h}" fill="#d7efe9"/>
  ${contenu}
</svg>
`;
  await writeFile(path.join(sortie, `${nom}.svg`), svg);
  console.log(nom);
}
