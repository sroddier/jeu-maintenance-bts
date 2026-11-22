import { choisirBlague } from "../narration/blagues";
import { blagues, ecransIntro, boutonPasser, introPassable, personnageParId, type Blague } from "../narration/contenu";
import { cleEtat, lireEtat } from "../narration/etat";
import {
  IMAGE_BUREAU,
  IMAGE_CHARGEMENT,
  IMAGE_GMAO,
  IMAGE_MAGASIN,
  IMAGE_TITRE,
  cheminSvg,
  imageDePhase,
  slotParFichier,
  urlPublic,
} from "../narration/images";
import { graineDepuisTexte } from "../sim/prng";
import { evaluerReactions, memoireVide, personnageBlague, type MemoireReactions, type ReactionChoisie } from "../narration/reactions";
import { carteVisiteClient } from "../narration/visite";
import { NIVEAU_1 } from "../sim/niveau1";
import type { Partie } from "../sim/partie";
import "./narration.css";

const CLE_INTRO = "jeu-maintenance-bts-intro-vue";

interface Bulle {
  kind: "reaction" | "visite";
  cle: string;
  personnageId: string;
  replique: string;
  portrait: string;
  lieu: string | null;
  precision?: string;
}

let installe = false;
let pageIntro = 0;
let calque: HTMLElement | null = null;
let bulleEl: HTMLElement | null = null;
let bulleCle = "";
let introAuto = false;
let introBlague: Blague | null = null;
let memoire: MemoireReactions = memoireVide();
let blaguesVues: string[] = [];
let blagueEntrees: Record<string, string> = {};
let ancre = "";
let dejaQuitte = false;
let signature = "";
let file: ReactionChoisie[] = [];
let fileIndex = 0;
let visiteFermee = false;
let partieCourante: Partie | null = null;
let ecranCourant = "accueil";

export function installerNarration(): void {
  if (installe || typeof document === "undefined") return;
  installe = true;
  document.addEventListener("click", onClick);
  document.addEventListener("keydown", onKey);
}

export function habillerNarration(racine: HTMLElement, partie: Partie | null, ecran: string): void {
  partieCourante = partie;
  ecranCourant = ecran;
  poserBouton(racine);
  poserImages(racine, partie, ecran);
  poserAnecdotes(racine, partie, ecran);
  synchroniserBulles(partie, ecran);
  if (!introAuto) {
    introAuto = true;
    if (!introVue()) ouvrirIntro();
  }
}

function poserBouton(racine: HTMLElement): void {
  const bandeau = racine.querySelector(".bandeau-interne");
  if (!bandeau) return;
  const bouton = document.createElement("button");
  bouton.type = "button";
  bouton.className = "nar-revoir";
  bouton.dataset.narration = "revoir";
  bouton.textContent = "Revoir la visite";
  bandeau.append(bouton);
}

function poserImages(racine: HTMLElement, partie: Partie | null, ecran: string): void {
  const main = racine.querySelector("main.page");
  if (!main) return;
  if (ecran === "accueil") {
    main.prepend(creerVisuel(IMAGE_TITRE, "nar-phase"));
    return;
  }
  if (ecran !== "jeu" || !partie) return;
  const fichier = imageDePhase(partie.phase);
  if (fichier) {
    const figure = creerVisuel(fichier, "nar-phase");
    const phases = main.querySelector(".phases");
    if (phases) phases.insertAdjacentElement("afterend", figure);
    else main.prepend(figure);
  }
  const details = racine.querySelector("details");
  const tableau = details?.querySelector(".table-wrap");
  if (details && tableau) details.insertBefore(creerVisuel(IMAGE_GMAO, "nar-gmao"), tableau);
}

function poserAnecdotes(racine: HTMLElement, partie: Partie | null, ecran: string): void {
  if (ecran !== "jeu" || !partie) return;
  const main = racine.querySelector("main.page");
  if (!main) return;
  const ancreImage = main.querySelector(".nar-phase");
  const blague = blagueEntree(partie.seed, partie.phase, partie.tour);
  if (blague) {
    const bloc = creerAnecdote(blague, partie.phase);
    if (ancreImage) ancreImage.insertAdjacentElement("afterend", bloc);
    else main.prepend(bloc);
  }
  if (partie.phase === "evenements") {
    const chargement = blagueEntree(partie.seed, "chargement", partie.tour);
    if (chargement) {
      const bloc = creerAnecdote(chargement, "chargement");
      const visuel = creerVisuel(IMAGE_CHARGEMENT, "nar-chargement");
      const cible = main.querySelector(".nar-blague") ?? ancreImage;
      if (cible) cible.insertAdjacentElement("afterend", visuel);
      visuel.insertAdjacentElement("afterend", bloc);
    }
  }
}

function synchroniserBulles(partie: Partie | null, ecran: string): void {
  if (ecran !== "jeu" || !partie) {
    peindreBulle(null);
    return;
  }
  const depart = partie.journal.length === 0 && partie.tour === 1 && partie.phase === "planifier" && partie.panne === null;
  const clePartie = `${partie.seedLabel}::${partie.pseudo}`;
  if (clePartie !== ancre || (depart && dejaQuitte)) {
    ancre = clePartie;
    memoire = memoireVide();
    blaguesVues = [];
    blagueEntrees = {};
    dejaQuitte = false;
    signature = "";
    file = [];
    fileIndex = 0;
    visiteFermee = false;
  }
  if (!depart) dejaQuitte = true;
  const etat = lireEtat(partie);
  const sig = cleEtat(etat);
  if (sig !== signature) {
    signature = sig;
    const resultat = evaluerReactions(etat, memoire);
    memoire = resultat.memoire;
    const neuves = resultat.reactions.filter((reaction) => !file.some((item) => item.cle === reaction.cle));
    file.splice(fileIndex, 0, ...neuves);
  }
  const reaction = file[fileIndex];
  if (reaction) {
    peindreBulle(bulleReaction(reaction));
    return;
  }
  const visite = visiteFermee ? null : carteVisiteClient(partie.seed, partie.tour, NIVEAU_1.nbTours, 1);
  peindreBulle(visite ? bulleVisite(visite) : null);
}

function bulleReaction(reaction: ReactionChoisie): Bulle {
  const lieu = reaction.personnageId === "directrice" ? IMAGE_BUREAU : reaction.personnageId === "magasinier" ? IMAGE_MAGASIN : null;
  return {
    kind: "reaction",
    cle: reaction.cle,
    personnageId: reaction.personnageId,
    replique: reaction.replique,
    portrait: reaction.portrait,
    lieu,
    precision: reaction.precision,
  };
}

function bulleVisite(visite: { nom: string; personnage: string; image: string }): Bulle {
  const personnage = personnageParId(visite.personnage);
  return {
    kind: "visite",
    cle: "E08",
    personnageId: visite.personnage,
    replique: visite.nom,
    portrait: personnage?.portrait ?? "",
    lieu: visite.image,
  };
}

function blagueEntree(seed: number, phase: string, tour: number): Blague | null {
  const entree = `${tour}:${phase}`;
  const deja = blagueEntrees[entree];
  if (deja) return choisirDeja(deja);
  const resultat = choisirBlague(seed, phase, blaguesVues);
  blaguesVues = resultat.vues;
  if (!resultat.blague) return null;
  blagueEntrees[entree] = resultat.blague.id;
  return resultat.blague;
}

function choisirDeja(id: string): Blague | null {
  return blagues.find((blague) => blague.id === id) ?? null;
}

function creerAnecdote(blague: Blague, phase: string): HTMLElement {
  const bloc = document.createElement("aside");
  bloc.className = "nar-blague";
  bloc.dataset.narration = "blague";
  bloc.dataset.blague = blague.id;
  const personnageId = personnageBlague(phase);
  const personnage = personnageId ? personnageParId(personnageId) : undefined;
  if (personnage) {
    const portrait = document.createElement("img");
    portrait.className = "nar-blague-portrait";
    portrait.src = urlPublic(cheminSvg(personnage.portrait));
    portrait.width = 64;
    portrait.height = 64;
    portrait.alt = "";
    bloc.append(portrait);
  }
  const texte = document.createElement("p");
  const titre = document.createElement("span");
  titre.className = "nar-kicker";
  titre.textContent = personnage ? `${personnage.nom} · anecdote` : "Anecdote";
  const corps = document.createElement("span");
  corps.textContent = blague.texte;
  texte.append(titre, corps);
  bloc.append(texte);
  return bloc;
}

function creerVisuel(fichier: string, classe: string): HTMLElement {
  const slot = slotParFichier(fichier);
  const width = slot?.width ?? 1600;
  const height = slot?.height ?? 900;
  const usage = slot?.usage ?? "Illustration";
  const figure = document.createElement("figure");
  figure.className = `nar-visuel ${classe}`;
  figure.style.aspectRatio = `${width} / ${height}`;
  const silhouette = document.createElement("img");
  silhouette.className = "nar-silhouette";
  silhouette.src = urlPublic(cheminSvg(fichier));
  silhouette.alt = usage;
  silhouette.width = width;
  silhouette.height = height;
  const photo = document.createElement("img");
  photo.className = "nar-photo";
  photo.src = urlPublic(fichier);
  photo.alt = "";
  photo.width = width;
  photo.height = height;
  photo.loading = "lazy";
  photo.decoding = "async";
  photo.addEventListener("load", () => {
    if (photo.naturalWidth > 0) photo.classList.add("prete");
  });
  photo.addEventListener("error", () => photo.remove());
  const legende = document.createElement("figcaption");
  legende.textContent = usage;
  figure.append(silhouette, photo, legende);
  return figure;
}

function peindreBulle(bulle: Bulle | null): void {
  if (!bulle) {
    if (bulleEl) bulleEl.hidden = true;
    bulleCle = "";
    return;
  }
  if (!bulleEl) {
    bulleEl = document.createElement("aside");
    bulleEl.className = "nar-bulle";
    bulleEl.dataset.narration = "bulle";
    bulleEl.setAttribute("aria-live", "polite");
    document.body.append(bulleEl);
  }
  bulleEl.hidden = false;
  if (bulleCle === bulle.cle) return;
  bulleCle = bulle.cle;
  bulleEl.dataset.personnage = bulle.personnageId;
  bulleEl.replaceChildren();
  const personnage = personnageParId(bulle.personnageId);
  if (bulle.lieu) bulleEl.append(creerVisuel(bulle.lieu, "nar-bulle-lieu"));
  const corps = document.createElement("div");
  corps.className = "nar-bulle-corps";
  if (bulle.portrait) {
    const portrait = document.createElement("img");
    portrait.className = "nar-portrait";
    portrait.src = urlPublic(cheminSvg(bulle.portrait));
    portrait.width = 72;
    portrait.height = 72;
    portrait.alt = personnage?.nom ?? "";
    const photo = document.createElement("img");
    photo.className = "nar-portrait-photo";
    photo.src = urlPublic(bulle.portrait);
    photo.alt = "";
    photo.width = 72;
    photo.height = 72;
    photo.loading = "lazy";
    photo.addEventListener("load", () => photo.classList.add("prete"));
    photo.addEventListener("error", () => photo.remove());
    const cadre = document.createElement("span");
    cadre.className = "nar-portrait-cadre";
    cadre.append(portrait, photo);
    corps.append(cadre);
  }
  const mots = document.createElement("div");
  const nom = document.createElement("p");
  nom.className = "nar-nom";
  nom.textContent = personnage?.nom ?? "";
  const role = document.createElement("p");
  role.className = "nar-role";
  role.textContent = personnage?.role ?? "";
  const replique = document.createElement("p");
  replique.className = "nar-replique";
  replique.textContent = bulle.replique;
  mots.append(nom, role, replique);
  if (bulle.precision) {
    const precision = document.createElement("p");
    precision.className = "nar-precision";
    precision.textContent = bulle.precision;
    mots.append(precision);
  }
  corps.append(mots);
  const fermer = document.createElement("button");
  fermer.type = "button";
  fermer.className = "nar-fermer";
  fermer.dataset.narration = "fermer-bulle";
  fermer.setAttribute("aria-label", "Fermer la réplique");
  fermer.textContent = "×";
  bulleEl.append(corps, fermer);
}

function ouvrirIntro(): void {
  pageIntro = 0;
  if (!introBlague) {
    const tirage = choisirBlague(graineDepuisTexte(seedUrl() || "visite"), "intro", []);
    introBlague = tirage.blague;
  }
  if (!calque) {
    calque = document.createElement("div");
    calque.className = "nar-intro";
    calque.dataset.narration = "intro";
    document.body.append(calque);
  }
  calque.hidden = false;
  peindreIntro();
}

function peindreIntro(): void {
  if (!calque) return;
  const ecran = ecransIntro[pageIntro];
  if (!ecran) return;
  const guide = personnageParId(ecran.guide);
  calque.replaceChildren();
  const carte = document.createElement("div");
  carte.className = "nar-intro-carte";
  carte.setAttribute("role", "dialog");
  carte.setAttribute("aria-modal", "true");
  carte.setAttribute("aria-labelledby", "nar-intro-titre");
  carte.tabIndex = -1;
  carte.append(creerVisuel(ecran.image, "nar-intro-image"));
  const progression = document.createElement("p");
  progression.className = "nar-progression";
  progression.textContent = `${pageIntro + 1} / ${ecransIntro.length}`;
  const titre = document.createElement("h2");
  titre.id = "nar-intro-titre";
  titre.textContent = ecran.titre;
  carte.append(progression, titre);
  if (guide) {
    const qui = document.createElement("p");
    qui.className = "nar-guide";
    const portrait = document.createElement("img");
    portrait.src = urlPublic(cheminSvg(guide.portrait));
    portrait.width = 56;
    portrait.height = 56;
    portrait.alt = "";
    const nom = document.createElement("span");
    nom.textContent = `${guide.nom} · ${guide.role}`;
    qui.append(portrait, nom);
    carte.append(qui);
  }
  for (const paragraphe of ecran.texte) {
    const p = document.createElement("p");
    p.textContent = paragraphe;
    carte.append(p);
  }
  const fait = document.createElement("p");
  fait.className = "nar-fait";
  const label = document.createElement("span");
  label.className = "nar-kicker";
  label.textContent = "Fait clé";
  const corps = document.createElement("span");
  corps.textContent = ecran.fait_cle;
  fait.append(label, corps);
  carte.append(fait);
  if (introBlague && pageIntro === 0) {
    const note = document.createElement("p");
    note.className = "nar-blague nar-blague-intro";
    note.dataset.narration = "blague";
    note.dataset.blague = introBlague.id;
    note.textContent = introBlague.texte;
    carte.append(note);
  }
  const actions = document.createElement("div");
  actions.className = "nar-actions";
  const precedent = document.createElement("button");
  precedent.type = "button";
  precedent.className = "secondaire";
  precedent.dataset.narration = "intro-precedent";
  precedent.textContent = "Précédent";
  precedent.disabled = pageIntro === 0;
  const suivant = document.createElement("button");
  suivant.type = "button";
  suivant.dataset.narration = "intro-suivant";
  suivant.textContent = "Suivant";
  actions.append(precedent, suivant);
  if (introPassable) {
    const passer = document.createElement("button");
    passer.type = "button";
    passer.className = "secondaire";
    passer.dataset.narration = "intro-passer";
    passer.textContent = boutonPasser;
    actions.append(passer);
  }
  carte.append(actions);
  calque.append(carte);
  carte.focus();
}

function fermerIntro(): void {
  try {
    localStorage.setItem(CLE_INTRO, "1");
  } catch {
    /* navigation privée */
  }
  if (calque) calque.hidden = true;
}

function introVue(): boolean {
  try {
    return localStorage.getItem(CLE_INTRO) === "1";
  } catch {
    return false;
  }
}

function seedUrl(): string {
  return new URLSearchParams(location.search).get("seed")?.trim() ?? "";
}

function onClick(event: Event): void {
  const noeud = event.target;
  if (!(noeud instanceof Element)) return;
  const cible = noeud.closest<HTMLElement>("[data-narration]");
  if (!cible) return;
  const action = cible.dataset.narration;
  if (action === "revoir") ouvrirIntro();
  if (action === "intro-precedent" && pageIntro > 0) {
    pageIntro -= 1;
    peindreIntro();
  }
  if (action === "intro-suivant") {
    if (pageIntro < ecransIntro.length - 1) {
      pageIntro += 1;
      peindreIntro();
    } else fermerIntro();
  }
  if (action === "intro-passer") fermerIntro();
  if (action === "fermer-bulle") fermerBulle();
}

function onKey(event: KeyboardEvent): void {
  if (event.key !== "Escape") return;
  if (calque && !calque.hidden) {
    fermerIntro();
    return;
  }
  fermerBulle();
}

function fermerBulle(): void {
  if (!bulleEl || bulleEl.hidden) return;
  if (bulleEl.dataset.personnage && file[fileIndex] && bulleCle === file[fileIndex].cle) fileIndex += 1;
  else visiteFermee = true;
  bulleCle = "";
  synchroniserBulles(partieCourante, ecranCourant);
}
