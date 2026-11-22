import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/**
 * Convertit les PNG et JPG déposés dans assets-src/ en WebP redimensionnés
 * dans public/assets/img/. Le nom de fichier doit correspondre à narratif.json
 * (intro-01-souffleuse.png → intro-01-souffleuse.webp).
 * Les silhouettes SVG restent le repli tant que le fichier final n'est pas là.
 */
const source = path.resolve("assets-src");
const destination = path.resolve("public/assets/img");
const extensions = new Set([".png", ".jpg", ".jpeg"]);

function largeurMax(nom) {
  if (nom.startsWith("portrait-")) return 512;
  if (nom.startsWith("evt-")) return 800;
  return 1920;
}

async function lister(dossier) {
  let entrees;
  try {
    entrees = await readdir(dossier, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === "ENOENT") return [];
    throw error;
  }
  const fichiers = [];
  for (const entree of entrees) {
    const complet = path.join(dossier, entree.name);
    if (entree.isDirectory()) fichiers.push(...(await lister(complet)));
    else if (extensions.has(path.extname(entree.name).toLowerCase())) fichiers.push(complet);
  }
  return fichiers;
}

const fichiers = await lister(source);
if (fichiers.length === 0) {
  console.log("assets-src/ ne contient pas encore de PNG ou de JPG.");
  process.exit(0);
}
await mkdir(destination, { recursive: true });
for (const fichier of fichiers) {
  const base = path.basename(fichier, path.extname(fichier));
  const sortie = path.join(destination, `${base}.webp`);
  await sharp(fichier)
    .resize({ width: largeurMax(base), withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(sortie);
  console.log(`${path.relative(source, fichier)} → ${path.relative(".", sortie)}`);
}
