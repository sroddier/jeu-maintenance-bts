import { formatEuros, formatNombre } from "../sim/format";
import { quantiteEnCommande, quantiteStock, type Partie } from "../sim/partie";
import type { Piece, Usine } from "../sim/types";
import { usine } from "../sim/usine";

export type OngletInventaire = "pieces" | "outillage" | "epi";

/** Stock et commandes déjà présents dans la partie. Absent = référence non suivie. */
export interface EtatStockInventaire {
  stocks: ReadonlyMap<string, number>;
  commandes: ReadonlyMap<string, number>;
  detailsCommandes?: ReadonlyMap<string, string>;
}

export interface LignePieceInventaire {
  ref: string;
  designation: string;
  prixUnitaireEur: number;
  /**
   * Au niveau 1, `surcharges_niveau_1.delai_semaines_toutes_pieces` s'il est chargé.
   * Sinon `delai_semaines`, puis `delai_standard_semaines`.
   */
  delaiSemaines: number | null;
  stock: number;
  stockMini: number;
  /** null si la partie ne suit pas les commandes de cette référence. */
  enCommande: number | null;
  detailCommandes: string | null;
  /** « partie » si le stock vient de l'état, « initial » s'il est lu dans usine.json. */
  origineStock: "partie" | "initial";
  sousOuAuMini: boolean;
  /** Texte affiché avec la couleur. null si le stock est au-dessus du mini. */
  alerte: string | null;
}

export interface LigneOutillage {
  nom: string;
  detail: string;
  disponible: boolean;
  mention: string;
}

export interface ListeEpi {
  hygiene: readonly string[];
  autres: readonly string[];
  habilitation: string;
}

/** Liste informative du niveau 1. Pas d'achat, pas d'effet chiffré. */
export const OUTILLAGE: readonly LigneOutillage[] = [
  { nom: "Outillage courant", detail: "fourni", disponible: true, mention: "disponible" },
  { nom: "Clé dynamométrique", detail: "", disponible: true, mention: "disponible" },
  { nom: "Vérificateur d'absence de tension (VAT)", detail: "", disponible: true, mention: "disponible" },
  { nom: "Console de paramétrage", detail: "", disponible: true, mention: "disponible" },
  { nom: "Palan", detail: "", disponible: true, mention: "disponible" },
  { nom: "Kit de consignation", detail: "", disponible: true, mention: "disponible" },
  {
    nom: "Outillage de confort",
    detail: "extracteur, outil de vanne, jauge, dérive-chaîne",
    disponible: true,
    mention: "disponible",
  },
  {
    nom: "Analyseur vibratoire",
    detail: "",
    disponible: false,
    mention: "disponible à partir du niveau 3",
  },
];

/** Liste informative. Pas de table d'exigences par mode. */
export const EPI: ListeEpi = {
  hygiene: ["Charlotte", "Blouse ou combinaison", "Chaussures de sécurité", "Cache-barbe si barbe"],
  autres: ["Gants anti-coupure (lames, boucheuse)", "Protection auditive près des machines en marche"],
  habilitation: "L'habilitation électrique est requise pour les interventions électriques.",
};

export function alerteStock(stock: number, stockMini: number): string | null {
  if (stock < stockMini) return "Sous le stock mini";
  if (stock === stockMini) return "Au stock mini";
  return null;
}

/** Les références de la source, dans l'ordre du fichier. Aucune valeur du GDD. */
export function lignesPieces(
  source: Usine = usine,
  etat: EtatStockInventaire | null = null,
  niveau = 1,
): LignePieceInventaire[] {
  const surcharge = niveau === 1 ? lireSurchargeNiveau1(source) : null;
  return source.pieces.map((piece) => lignePiece(piece, etat, surcharge));
}

export function etatDepuisPartie(partie: Partie): EtatStockInventaire {
  const refs = new Set<string>();
  for (const lot of partie.stock) refs.add(lot.ref);
  for (const commande of partie.commandes) refs.add(commande.ref);
  const stocks = new Map<string, number>();
  const commandes = new Map<string, number>();
  const detailsCommandes = new Map<string, string>();
  for (const ref of refs) {
    stocks.set(ref, quantiteStock(partie, ref));
    commandes.set(ref, quantiteEnCommande(partie, ref));
    const detail = detailCommandes(partie, ref);
    if (detail) detailsCommandes.set(ref, detail);
  }
  return { stocks, commandes, detailsCommandes };
}

export function htmlPanneau(onglet: OngletInventaire, lignes: LignePieceInventaire[], enPartie: boolean): string {
  return `<div class="inventaire-panneau" role="dialog" aria-modal="true" aria-labelledby="inventaire-titre" tabindex="-1">
    <div class="inventaire-entete">
      <div>
        <h2 id="inventaire-titre">Inventaire</h2>
        <p class="muted">Consultation seule. Rien n'est commandé, la partie ne change pas.</p>
      </div>
      <button type="button" class="inventaire-fermer" data-inventaire="fermer">Fermer</button>
    </div>
    <div class="inventaire-onglets" role="tablist" aria-label="Rubriques de l'inventaire">
      ${ongletBouton("pieces", "Pièces", onglet)}
      ${ongletBouton("outillage", "Outillage", onglet)}
      ${ongletBouton("epi", "EPI", onglet)}
    </div>
    <div class="inventaire-corps" role="tabpanel" id="panneau-${onglet}" aria-labelledby="onglet-${onglet}">
      ${corps(onglet, lignes, enPartie)}
    </div>
  </div>`;
}

export function htmlPieces(lignes: LignePieceInventaire[], enPartie: boolean): string {
  const contexte = enPartie
    ? "Partie en cours : stock actuel et commandes déjà passées. Les références non suivies restent au stock initial de l'usine."
    : "Hors partie : stock initial lu dans les données de l'usine. Aucune commande en cours.";
  return `<p class="inventaire-contexte">${esc(contexte)}</p>
    <div class="inventaire-table"><table>
      <thead><tr>
        <th>Référence</th><th>Désignation</th><th class="num">Prix</th><th class="num">Délai standard</th>
        <th class="num">Stock</th><th class="num">Stock mini</th><th class="num">En commande</th>
      </tr></thead>
      <tbody>${lignes.map((ligne) => ligneTableau(ligne, enPartie)).join("")}</tbody>
    </table></div>
    <div class="piece-cartes">${lignes.map((ligne) => ligneCarte(ligne, enPartie)).join("")}</div>`;
}

/** Outils lus dans `outillages[]` s'il est chargé, sinon la liste statique du niveau 1. */
export function lignesOutillage(source: Usine = usine, niveau = 1): readonly LigneOutillage[] {
  const surcharge = niveau === 1 ? lireSurchargeNiveau1(source) : null;
  const toutDisponible = surcharge?.outillageToutDisponible === true;
  return lireOutillages(source, niveau, toutDisponible) ?? debloquerListe(OUTILLAGE, toutDisponible);
}

/** Hygiène lue dans `organisation.epi_hygiene_base` si le champ est chargé. Le reste reste la liste statique. */
export function listeEpi(source: Usine = usine): ListeEpi {
  return {
    hygiene: lireHygiene(source) ?? EPI.hygiene,
    autres: EPI.autres,
    habilitation: EPI.habilitation,
  };
}

export function htmlOutillage(source: Usine = usine): string {
  return `<p class="inventaire-contexte">Liste informative du niveau 1. Rien ne s'achète ici.</p>
    <ul class="liste-inventaire">${lignesOutillage(source).map((ligne) => {
      const classe = ligne.disponible ? "outil" : "outil plus-tard";
      const detail = ligne.detail ? `<span class="outil-detail">${esc(ligne.detail)}</span>` : "";
      return `<li class="${classe}">
        <span class="outil-nom"><strong>${esc(ligne.nom)}</strong>${detail}</span>
        <span class="outil-etat">${esc(ligne.mention)}</span>
      </li>`;
    }).join("")}</ul>`;
}

export function htmlEpi(source: Usine = usine): string {
  const epi = listeEpi(source);
  return `<p class="inventaire-contexte">Liste informative. Le niveau 1 ne contrôle pas le port de ces équipements.</p>
    <h3>EPI d'hygiène, portés partout</h3>
    <ul class="liste-inventaire liste-epi">${epi.hygiene.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>
    <h3>Autres EPI</h3>
    <ul class="liste-inventaire liste-epi">${epi.autres.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>
    <p class="inventaire-habilitation">${esc(epi.habilitation)}</p>`;
}

function lignePiece(
  piece: Piece,
  etat: EtatStockInventaire | null,
  surcharge: SurchargeNiveau1 | null,
): LignePieceInventaire {
  const suivi = etat?.stocks.has(piece.ref) ?? false;
  const stock = suivi ? etat!.stocks.get(piece.ref)! : piece.stock_initial;
  const enCommande = etat?.commandes.has(piece.ref) ? etat.commandes.get(piece.ref)! : null;
  const detail = etat?.detailsCommandes?.get(piece.ref) ?? null;
  const stockMini = surcharge?.stockMini?.get(piece.ref) ?? piece.stock_mini;
  const alerte = alerteStock(stock, stockMini);
  return {
    ref: piece.ref,
    designation: piece.designation,
    prixUnitaireEur: piece.prix_unitaire_eur,
    delaiSemaines: surcharge?.delaiToutesPieces ?? lireDelaiSemaines(piece),
    stock,
    stockMini,
    enCommande,
    detailCommandes: detail,
    origineStock: suivi ? "partie" : "initial",
    sousOuAuMini: alerte !== null,
    alerte,
  };
}

function detailCommandes(partie: Partie, ref: string): string {
  const ouvertes = partie.commandes.filter((commande) => commande.ref === ref && !commande.livree);
  if (ouvertes.length === 0) return "";
  let standard = 0;
  let express = 0;
  for (const commande of ouvertes) {
    if (commande.delai === "express") express += commande.qte;
    else standard += commande.qte;
  }
  const morceaux: string[] = [];
  if (standard > 0) morceaux.push(`${standard} délai standard`);
  if (express > 0) morceaux.push(`${express} express`);
  return morceaux.join(" + ");
}

function corps(onglet: OngletInventaire, lignes: LignePieceInventaire[], enPartie: boolean): string {
  if (onglet === "outillage") return htmlOutillage();
  if (onglet === "epi") return htmlEpi();
  return htmlPieces(lignes, enPartie);
}

interface SurchargeNiveau1 {
  delaiToutesPieces: number | null;
  stockMini: ReadonlyMap<string, number>;
  outillageToutDisponible: boolean;
}

function lireSurchargeNiveau1(source: Usine): SurchargeNiveau1 | null {
  const bloc = (source.organisation as { surcharges_niveau_1?: unknown } | undefined)?.surcharges_niveau_1;
  if (!bloc || typeof bloc !== "object") return null;
  const brut = bloc as {
    delai_semaines_toutes_pieces?: unknown;
    stock_mini?: unknown;
    outillage_tout_disponible?: unknown;
  };
  const stockMini = new Map<string, number>();
  if (brut.stock_mini && typeof brut.stock_mini === "object" && !Array.isArray(brut.stock_mini)) {
    for (const [ref, valeur] of Object.entries(brut.stock_mini)) {
      if (estNombre(valeur)) stockMini.set(ref, valeur);
    }
  }
  return {
    delaiToutesPieces: estNombre(brut.delai_semaines_toutes_pieces) ? brut.delai_semaines_toutes_pieces : null,
    stockMini,
    outillageToutDisponible: brut.outillage_tout_disponible === true,
  };
}

function lireDelaiSemaines(piece: Piece): number | null {
  const brut = piece as Piece & { delai_semaines?: unknown; delai_standard_semaines?: unknown };
  if (estNombre(brut.delai_semaines)) return brut.delai_semaines;
  if (estNombre(brut.delai_standard_semaines)) return brut.delai_standard_semaines;
  return null;
}

function lireOutillages(source: Usine, niveau: number, toutDisponible: boolean): LigneOutillage[] | null {
  const liste = (source as Usine & { outillages?: unknown }).outillages;
  if (!Array.isArray(liste)) return null;
  const lignes: LigneOutillage[] = [];
  for (const item of liste) {
    if (!item || typeof item !== "object") continue;
    const outil = item as {
      id_outil?: unknown;
      designation?: unknown;
      prix_eur?: unknown;
      disponible_au_depart?: unknown;
    };
    if (typeof outil.designation !== "string" || outil.designation.trim() === "") continue;
    if (typeof outil.disponible_au_depart !== "boolean") continue;
    const prix = estNombre(outil.prix_eur) ? formatEuros(outil.prix_eur) : "";
    const etat = etatOutil(outil, niveau, toutDisponible);
    lignes.push({ nom: outil.designation, detail: prix, ...etat });
  }
  return lignes.length > 0 ? lignes : null;
}

/** L'analyseur vibratoire s'achète au niveau 3. Un champ de déblocage du fichier prime sur cette règle. */
function etatOutil(
  outil: { id_outil?: unknown; designation?: unknown; disponible_au_depart?: unknown },
  niveau: number,
  toutDisponible: boolean,
): { disponible: boolean; mention: string } {
  const designation = typeof outil.designation === "string" ? outil.designation : "";
  const id = typeof outil.id_outil === "string" ? outil.id_outil : "";
  const niveauMin = lireNiveauMin(outil);
  if (niveauMin !== null && niveauMin > niveau) {
    return { disponible: false, mention: `disponible à partir du niveau ${niveauMin}` };
  }
  if (niveauMin === null && estAnalyseurVibratoire(designation, id) && niveau < 3) {
    return { disponible: false, mention: "disponible à partir du niveau 3" };
  }
  const disponible = toutDisponible || outil.disponible_au_depart === true;
  return { disponible, mention: disponible ? "disponible" : "non disponible au départ" };
}

function lireNiveauMin(outil: object): number | null {
  const brut = outil as {
    niveau_min?: unknown;
    niveau_disponible?: unknown;
    disponible_a_partir_du_niveau?: unknown;
  };
  for (const valeur of [brut.niveau_min, brut.niveau_disponible, brut.disponible_a_partir_du_niveau]) {
    if (estNombre(valeur)) return valeur;
  }
  return null;
}

function estAnalyseurVibratoire(designation: string, id: string): boolean {
  return id === "O-VIB" || designation.toLocaleLowerCase("fr").includes("analyseur vibratoire");
}

function debloquerListe(lignes: readonly LigneOutillage[], toutDisponible: boolean): readonly LigneOutillage[] {
  if (!toutDisponible) return lignes;
  return lignes.map((ligne) =>
    estAnalyseurVibratoire(ligne.nom, "") ? ligne : { ...ligne, disponible: true, mention: "disponible" },
  );
}

function lireHygiene(source: Usine): string[] | null {
  const liste = (source.organisation as { epi_hygiene_base?: unknown }).epi_hygiene_base;
  if (!Array.isArray(liste)) return null;
  const hygiene = liste.filter((item): item is string => typeof item === "string" && item.trim() !== "");
  return hygiene.length > 0 ? hygiene : null;
}

function estNombre(valeur: unknown): valeur is number {
  return typeof valeur === "number" && Number.isFinite(valeur);
}

function ongletBouton(id: OngletInventaire, libelle: string, courant: OngletInventaire): string {
  const choisi = id === courant;
  return `<button type="button" role="tab" id="onglet-${id}" data-inventaire="onglet" data-onglet="${id}" aria-selected="${choisi ? "true" : "false"}" aria-controls="panneau-${id}" tabindex="${choisi ? "0" : "-1"}">${libelle}</button>`;
}

function ligneTableau(ligne: LignePieceInventaire, enPartie: boolean): string {
  return `<tr class="${classePiece(ligne)}">
    <td><strong>${esc(ligne.ref)}</strong></td>
    <td>${esc(ligne.designation)}${badge(ligne)}</td>
    <td class="num">${esc(formatEuros(ligne.prixUnitaireEur))}</td>
    <td class="num">${esc(texteDelai(ligne.delaiSemaines))}</td>
    <td class="num">${celluleStock(ligne, enPartie)}</td>
    <td class="num">${ligne.stockMini}</td>
    <td class="num">${celluleCommande(ligne)}</td>
  </tr>`;
}

function ligneCarte(ligne: LignePieceInventaire, enPartie: boolean): string {
  return `<article class="piece-carte ${classePiece(ligne)}">
    <header class="piece-carte-entete"><strong>${esc(ligne.ref)}</strong>${badge(ligne)}</header>
    <p class="piece-designation">${esc(ligne.designation)}</p>
    <dl>
      <div><dt>Prix</dt><dd>${esc(formatEuros(ligne.prixUnitaireEur))}</dd></div>
      <div><dt>Délai standard</dt><dd>${esc(texteDelai(ligne.delaiSemaines))}</dd></div>
      <div><dt>Stock</dt><dd>${celluleStock(ligne, enPartie)}</dd></div>
      <div><dt>Stock mini</dt><dd>${ligne.stockMini}</dd></div>
      <div class="piece-large"><dt>En commande</dt><dd>${celluleCommande(ligne)}</dd></div>
    </dl>
  </article>`;
}

function classePiece(ligne: LignePieceInventaire): string {
  if (!ligne.alerte) return "";
  return ligne.stock < ligne.stockMini ? "piece-alerte piece-sous" : "piece-alerte piece-au-mini";
}

function badge(ligne: LignePieceInventaire): string {
  if (!ligne.alerte) return "";
  return `<span class="badge-alerte">${esc(ligne.alerte)}</span>`;
}

function celluleStock(ligne: LignePieceInventaire, enPartie: boolean): string {
  const origine = enPartie && ligne.origineStock === "initial" ? `<span class="piece-origine">stock initial</span>` : "";
  return `<span class="piece-valeur">${ligne.stock}</span>${origine}`;
}

function celluleCommande(ligne: LignePieceInventaire): string {
  if (ligne.enCommande === null) return `<span class="piece-valeur">—</span>`;
  const detail = ligne.detailCommandes ? `<span class="piece-origine">${esc(ligne.detailCommandes)}</span>` : "";
  return `<span class="piece-valeur">${ligne.enCommande}</span>${detail}`;
}

function texteDelai(semaines: number | null): string {
  if (semaines === null) return "—";
  const texte = formatNombre(semaines, 2);
  return Math.abs(semaines - 1) < 1e-9 ? `${texte} semaine` : `${texte} semaines`;
}

function esc(valeur: string): string {
  return valeur.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}
