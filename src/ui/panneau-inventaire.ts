import type { Partie } from "../sim/partie";
import { etatDepuisPartie, htmlPanneau, lignesPieces, type OngletInventaire } from "./inventaire";
import "./inventaire.css";

let fond: HTMLElement | null = null;
let onglet: OngletInventaire = "pieces";
let lirePartie: (() => Partie | null) | null = null;
let focusRetour: HTMLElement | null = null;
let ecoute = false;

/** Ouvre le panneau. Ne lit que l'état courant : aucun appel au moteur. */
export function ouvrirInventaire(lire: () => Partie | null, depuis?: HTMLElement | null): void {
  lirePartie = lire;
  focusRetour = depuis ?? null;
  if (!fond) {
    onglet = "pieces";
    fond = document.createElement("div");
    fond.className = "inventaire-fond";
    fond.addEventListener("click", onClic);
    document.body.append(fond);
  }
  assurerEcoute();
  document.body.classList.add("inventaire-ouvert");
  peindre("dialogue");
}

export function fermerInventaire(): void {
  document.body.classList.remove("inventaire-ouvert");
  fond?.remove();
  fond = null;
  retirerEcoute();
  if (focusRetour?.isConnected) focusRetour.focus();
  focusRetour = null;
}

function peindre(focus: "dialogue" | "onglet"): void {
  if (!fond || !lirePartie) return;
  const partie = lirePartie();
  const lignes = lignesPieces(undefined, partie ? etatDepuisPartie(partie) : null);
  fond.innerHTML = htmlPanneau(onglet, lignes, partie !== null);
  const cible =
    focus === "onglet"
      ? fond.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')
      : fond.querySelector<HTMLElement>(".inventaire-panneau");
  cible?.focus();
}

function onClic(event: MouseEvent): void {
  const cible = event.target;
  if (!(cible instanceof Element) || !fond) return;
  if (cible === fond) {
    fermerInventaire();
    return;
  }
  const action = cible.closest<HTMLElement>("[data-inventaire]")?.dataset.inventaire;
  if (action === "fermer") {
    fermerInventaire();
    return;
  }
  if (action !== "onglet") return;
  const id = cible.closest<HTMLElement>("[data-onglet]")?.dataset.onglet;
  if (id !== "pieces" && id !== "outillage" && id !== "epi") return;
  if (id === onglet) return;
  onglet = id;
  peindre("onglet");
}

function onEchap(event: KeyboardEvent): void {
  if (event.key !== "Escape" || !fond) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  fermerInventaire();
}

function assurerEcoute(): void {
  if (ecoute) return;
  ecoute = true;
  document.addEventListener("keydown", onEchap, true);
}

function retirerEcoute(): void {
  if (!ecoute) return;
  ecoute = false;
  document.removeEventListener("keydown", onEchap, true);
}
