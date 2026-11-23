import type { Session } from "@supabase/supabase-js";
import { EMAIL_PROF } from "../online/config";
import { exporterCsvProf, nombreFr } from "../online/csv";
import { formaterDateParis, jourParis } from "../online/dates";
import {
  MESSAGE_SANS_DROIT_COMPTE,
  messageConnexion,
  messageLecture,
  messageSuppression,
} from "../online/erreurs";
import { clientProf } from "../online/supabase";
import {
  filtrerEtTrier,
  ligneDepuisApi,
  sensInitial,
  type ColonneTri,
  type LigneTableau,
  type TriTableau,
} from "../online/tableau";
import "../ui/style.css";
import "./prof.css";

type Etat =
  | { nom: "chargement" }
  | { nom: "connexion"; email: string; erreur: string; enCours: boolean }
  | { nom: "interdit"; email: string }
  | {
      nom: "tableau";
      email: string;
      lignes: LigneTableau[];
      erreur: string;
      info: string;
      filtrePseudo: string;
      debut: string;
      fin: string;
      tri: TriTableau;
      confirmationId: string | null;
      chargement: boolean;
    };

const COLONNES: Array<{ id: ColonneTri; libelle: string; numerique?: boolean }> = [
  { id: "pseudo", libelle: "Prénom" },
  { id: "seed", libelle: "Graine" },
  { id: "niveau", libelle: "Niveau", numerique: true },
  { id: "score", libelle: "Score", numerique: true },
  { id: "ao", libelle: "Ao", numerique: true },
  { id: "etoiles", libelle: "Étoiles", numerique: true },
  { id: "pctCalculsJustes", libelle: "% calculs justes", numerique: true },
  { id: "createdAt", libelle: "Date (Paris)" },
];

let racine: HTMLElement;
let etat: Etat = { nom: "chargement" };
let jeton = 0;

const app = document.querySelector("#app");
if (!app) throw new Error("Point de montage introuvable");
racine = app as HTMLElement;
racine.addEventListener("submit", onSubmit);
racine.addEventListener("click", onClick);
racine.addEventListener("input", onInput);
dessiner();
void demarrer();

async function demarrer(): Promise<void> {
  const { data, error } = await clientProf().auth.getSession();
  if (error || !data.session) {
    etat = { nom: "connexion", email: "", erreur: "", enCours: false };
    dessiner();
    return;
  }
  await ouvrirSession(data.session);
}

async function ouvrirSession(session: Session): Promise<void> {
  const email = session.user.email ?? "";
  if (email.toLowerCase() !== EMAIL_PROF) {
    etat = { nom: "interdit", email };
    dessiner();
    return;
  }
  etat = {
    nom: "tableau",
    email,
    lignes: [],
    erreur: "",
    info: "",
    filtrePseudo: "",
    debut: "",
    fin: "",
    tri: { colonne: "createdAt", sens: "desc" },
    confirmationId: null,
    chargement: true,
  };
  dessiner();
  await charger();
}

async function charger(): Promise<void> {
  if (etat.nom !== "tableau") return;
  const courant = ++jeton;
  etat.chargement = true;
  dessiner();
  const { data, error } = await clientProf()
    .from("resultats")
    .select("id, created_at, pseudo, seed, niveau, score, ao, etoiles, pct_calculs_justes, version_jeu")
    .order("created_at", { ascending: false });
  if (courant !== jeton || etat.nom !== "tableau") return;
  etat.chargement = false;
  if (error) {
    etat.erreur = messageLecture(error);
    etat.lignes = [];
  } else {
    etat.erreur = "";
    const brut = (data ?? []) as Record<string, unknown>[];
    etat.lignes = brut.flatMap((row) => {
      const ligne = ligneDepuisApi(row);
      return ligne ? [ligne] : [];
    });
    etat.info = "Liste à jour.";
  }
  dessiner();
}

function dessiner(): void {
  racine.innerHTML = page();
}

function page(): string {
  return `${bandeau()}${corps()}`;
}

function bandeau(): string {
  return `<header class="bandeau"><div class="bandeau-interne">
    <p class="kicker">Boissons des Calanques · niveau 1</p>
    <h1>Espace prof</h1>
    <p class="lien-retour"><a href="${esc(import.meta.env.BASE_URL)}">Retour au jeu</a></p>
  </div></header>`;
}

function corps(): string {
  if (etat.nom === "chargement") return `<main class="page"><p class="muted">Chargement…</p></main>`;
  if (etat.nom === "connexion") return pageConnexion();
  if (etat.nom === "interdit") return pageInterdit();
  return pageTableau();
}

function pageConnexion(): string {
  if (etat.nom !== "connexion") return "";
  return `<main class="page"><section class="carte">
    <h2>Connexion</h2>
    <p>Entre l'adresse et le mot de passe du compte professeur.</p>
    ${etat.erreur ? `<p class="alerte rouge" role="alert">${esc(etat.erreur)}</p>` : ""}
    <form data-form="connexion" novalidate>
      <div class="champ"><label>Adresse e-mail
        <input type="email" name="email" autocomplete="username" required value="${esc(etat.email)}">
      </label></div>
      <div class="champ"><label>Mot de passe
        <input type="password" name="motdepasse" autocomplete="current-password" required>
      </label></div>
      <div class="actions"><button type="submit" ${etat.enCours ? "disabled" : ""}>Se connecter</button></div>
    </form>
    <p class="muted">Le compte est créé dans Supabase. Il n'y a pas d'inscription sur cette page.</p>
  </section></main>`;
}

function pageInterdit(): string {
  if (etat.nom !== "interdit") return "";
  return `<main class="page"><section class="carte">
    <h2>Connexion</h2>
    <p class="alerte rouge" role="alert">${esc(MESSAGE_SANS_DROIT_COMPTE)}</p>
    <p class="muted">Compte utilisé : ${esc(etat.email || "inconnu")}</p>
    <div class="actions"><button type="button" data-action="deconnexion">Se déconnecter</button></div>
  </section></main>`;
}

function pageTableau(): string {
  if (etat.nom !== "tableau") return "";
  const bornesInversees = etat.debut !== "" && etat.fin !== "" && etat.debut > etat.fin;
  return `<main class="page"><section class="carte">
    <div class="barre-prof">
      <h2>Résultats</h2>
      <div class="actions">
        <button type="button" data-action="actualiser" ${etat.chargement ? "disabled" : ""}>Actualiser</button>
        <button type="button" class="secondaire" data-action="exporter">Exporter en CSV</button>
        <button type="button" class="secondaire" data-action="deconnexion">Se déconnecter</button>
      </div>
    </div>
    <p class="muted">Connecté avec ${esc(etat.email)}. Heures affichées à Paris. ${esc(etat.info)}</p>
    <p class="muted">Cette version enregistre le score calculé par le jeu de l'élève. Elle ne le recalcule pas.</p>
    ${etat.erreur ? `<p class="alerte rouge" role="alert">${esc(etat.erreur)}</p>` : ""}
    ${bornesInversees ? `<p class="alerte">La date de début est après la date de fin.</p>` : ""}
    <form data-form="filtres" class="filtres" novalidate>
      <div class="champ"><label>Filtrer par prénom
        <input type="search" name="pseudo" value="${esc(etat.filtrePseudo)}" placeholder="Karim B.">
      </label></div>
      <div class="champ"><label>Du
        <input type="date" name="debut" value="${esc(etat.debut)}">
      </label></div>
      <div class="champ"><label>Au
        <input type="date" name="fin" value="${esc(etat.fin)}">
      </label></div>
    </form>
    <p id="compte-resultats" class="muted">${esc(texteCompte())}</p>
    <div class="table-wrap"><table>
      <thead><tr>${enteteHtml()}<th></th></tr></thead>
      <tbody id="corps-resultats">${corpsHtml()}</tbody>
    </table></div>
  </section></main>`;
}

function enteteHtml(): string {
  return COLONNES.map((colonne) => {
    const classe = colonne.numerique ? "num" : "";
    return `<th class="${classe}" aria-sort="${ariaTri(colonne.id)}"><button type="button" class="tri" data-action="trier" data-colonne="${colonne.id}">${esc(colonne.libelle)}${marque(colonne.id)}</button></th>`;
  }).join("");
}

function corpsHtml(): string {
  if (etat.nom !== "tableau") return "";
  const lignes = lignesAffichees();
  if (etat.chargement && etat.lignes.length === 0) {
    return `<tr><td colspan="9">Chargement des résultats…</td></tr>`;
  }
  if (lignes.length === 0) {
    const vide = etat.lignes.length === 0 ? "Aucun résultat pour l'instant." : "Aucun résultat pour ce filtre.";
    return `<tr><td colspan="9">${vide}</td></tr>`;
  }
  return lignes.map(ligneHtml).join("");
}

function ligneHtml(ligne: LigneTableau): string {
  const confirmation = etat.nom === "tableau" && etat.confirmationId === ligne.id;
  const bouton = confirmation
    ? ""
    : `<button type="button" class="danger compact" data-action="demander" data-id="${esc(ligne.id)}">Supprimer</button>`;
  const suite = confirmation
    ? `<tr class="confirmation"><td colspan="9">Supprimer le résultat de ${esc(ligne.pseudo)} (graine ${esc(ligne.seed)}) ? Cette action est définitive.
        <div class="actions">
          <button type="button" class="danger compact" data-action="confirmer" data-id="${esc(ligne.id)}">Confirmer la suppression</button>
          <button type="button" class="secondaire compact" data-action="annuler">Annuler</button>
        </div></td></tr>`
    : "";
  return `<tr>
    <td>${esc(ligne.pseudo)}</td>
    <td>${esc(ligne.seed)}</td>
    <td class="num">${ligne.niveau}</td>
    <td class="num">${esc(nombreFr(ligne.score, 1))}</td>
    <td class="num">${esc(nombreFr(ligne.ao, 2))} %</td>
    <td class="num" aria-label="${ligne.etoiles} étoiles sur 3">${etoilesVisuelles(ligne.etoiles)}</td>
    <td class="num">${esc(nombreFr(ligne.pctCalculsJustes, 0))} %</td>
    <td>${esc(formaterDateParis(ligne.createdAt))}</td>
    <td>${bouton}</td>
  </tr>${suite}`;
}

function texteCompte(): string {
  if (etat.nom !== "tableau") return "";
  const n = lignesAffichees().length;
  const total = etat.lignes.length;
  if (etat.chargement && total === 0) return "";
  if (n === total) return `${total} résultat${total > 1 ? "s" : ""}.`;
  return `${n} résultat${n > 1 ? "s" : ""} affiché${n > 1 ? "s" : ""} sur ${total}.`;
}

function lignesAffichees(): LigneTableau[] {
  if (etat.nom !== "tableau") return [];
  return filtrerEtTrier(etat.lignes, { pseudo: etat.filtrePseudo, debut: etat.debut, fin: etat.fin }, etat.tri);
}

function ariaTri(colonne: ColonneTri): "none" | "ascending" | "descending" {
  if (etat.nom !== "tableau" || etat.tri.colonne !== colonne) return "none";
  return etat.tri.sens === "asc" ? "ascending" : "descending";
}

function marque(colonne: ColonneTri): string {
  if (etat.nom !== "tableau" || etat.tri.colonne !== colonne) return "";
  return etat.tri.sens === "asc" ? " ▲" : " ▼";
}

function etoilesVisuelles(n: number): string {
  const v = Math.max(0, Math.min(3, Math.round(n)));
  return "★★★".slice(0, v) + "☆☆☆".slice(0, 3 - v);
}

async function onSubmit(event: Event): Promise<void> {
  const form = (event.target as HTMLElement).closest("form");
  if (!form) return;
  event.preventDefault();
  if (form.dataset.form !== "connexion" || etat.nom !== "connexion") return;
  const data = new FormData(form);
  const email = String(data.get("email") ?? "").trim();
  const motDePasse = String(data.get("motdepasse") ?? "");
  if (!email || !motDePasse) {
    etat.erreur = "L'adresse et le mot de passe sont obligatoires.";
    etat.email = email;
    dessiner();
    return;
  }
  etat.enCours = true;
  etat.erreur = "";
  etat.email = email;
  dessiner();
  const { data: session, error } = await clientProf().auth.signInWithPassword({
    email,
    password: motDePasse,
  });
  if (error || !session.session) {
    etat = {
      nom: "connexion",
      email,
      erreur: messageConnexion(error ?? { message: "connexion" }),
      enCours: false,
    };
    dessiner();
    return;
  }
  await ouvrirSession(session.session);
}

function onInput(event: Event): void {
  if (etat.nom !== "tableau") return;
  const input = event.target as HTMLInputElement;
  if (input.name === "pseudo") etat.filtrePseudo = input.value;
  else if (input.name === "debut") etat.debut = input.value;
  else if (input.name === "fin") etat.fin = input.value;
  else return;
  const corpsTableau = racine.querySelector("#corps-resultats");
  if (corpsTableau) corpsTableau.innerHTML = corpsHtml();
  const compte = racine.querySelector("#compte-resultats");
  if (compte) compte.textContent = texteCompte();
}

function onClick(event: Event): void {
  const bouton = (event.target as HTMLElement).closest<HTMLElement>("[data-action]");
  if (!bouton) return;
  const action = bouton.dataset.action;
  if (action === "deconnexion") {
    void deconnecter();
    return;
  }
  if (etat.nom !== "tableau") return;
  if (action === "actualiser") {
    etat.info = "";
    etat.confirmationId = null;
    void charger();
    return;
  }
  if (action === "exporter") {
    telecharger(lignesAffichees());
    return;
  }
  if (action === "trier") {
    const colonne = bouton.dataset.colonne as ColonneTri | undefined;
    if (!colonne || !COLONNES.some((item) => item.id === colonne)) return;
    if (etat.tri.colonne === colonne) etat.tri = { colonne, sens: etat.tri.sens === "asc" ? "desc" : "asc" };
    else etat.tri = { colonne, sens: sensInitial(colonne) };
    dessiner();
    return;
  }
  if (action === "demander") {
    etat.confirmationId = bouton.dataset.id ?? null;
    dessiner();
    return;
  }
  if (action === "annuler") {
    etat.confirmationId = null;
    dessiner();
    return;
  }
  if (action === "confirmer" && bouton.dataset.id) void supprimer(bouton.dataset.id);
}

async function supprimer(id: string): Promise<void> {
  if (etat.nom !== "tableau") return;
  const { data, error } = await clientProf().from("resultats").delete().eq("id", id).select("id");
  if (etat.nom !== "tableau") return;
  if (error) {
    etat.erreur = messageSuppression(error);
    etat.confirmationId = null;
    dessiner();
    return;
  }
  const supprimes = data ?? [];
  if (supprimes.length === 0) {
    etat.erreur = "La ligne n'a pas été supprimée.";
  } else {
    etat.erreur = "";
    etat.info = "Résultat supprimé.";
    etat.lignes = etat.lignes.filter((ligne) => ligne.id !== id);
  }
  etat.confirmationId = null;
  dessiner();
}

async function deconnecter(): Promise<void> {
  await clientProf().auth.signOut();
  etat = { nom: "connexion", email: "", erreur: "", enCours: false };
  dessiner();
}

function telecharger(lignes: readonly LigneTableau[]): void {
  const csv = exporterCsvProf(
    lignes.map((ligne) => ({
      pseudo: ligne.pseudo,
      seed: ligne.seed,
      niveau: ligne.niveau,
      score: ligne.score,
      ao: ligne.ao,
      etoiles: ligne.etoiles,
      pctCalculsJustes: ligne.pctCalculsJustes,
      dateParis: formaterDateParis(ligne.createdAt),
    })),
  );
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const lien = document.createElement("a");
  lien.href = URL.createObjectURL(blob);
  const jour = jourParis(new Date().toISOString()).replaceAll("-", "");
  lien.download = `resultats-classement-${jour}.csv`;
  lien.click();
  URL.revokeObjectURL(lien.href);
}

function esc(valeur: string): string {
  return valeur.replace(/[&<>"']/g, (caractere) => {
    const codes: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return codes[caractere] ?? caractere;
  });
}
