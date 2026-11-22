import type { BilanTour } from "../sim/bilan";
import { contexteDepuisBilan } from "../sim/bilan";
import { exporterCsv, nomFichierCsv } from "../sim/csv";
import { bilanExerciceRemplisseuse, pannesRemplisseuseExercice } from "../sim/exercice";
import { formatEuros, formatHeures, formatNombre, formatPourcent, libelleHoraire } from "../sim/format";
import { NIVEAU_1, quantiteCorrective } from "../sim/niveau1";
import {
  appliquer,
  demarrer,
  devisIntervention,
  evaluerPartie,
  ligneArretee,
  preventifCetteSemaine,
  quantiteEnCommande,
  quantiteStock,
  type ChoixIntervention,
  type Decision,
  type Partie,
} from "../sim/partie";
import { OBJECTIF_DO_PCT } from "../sim/score";
import { evaluerSaisie } from "../sim/saisie";
import {
  heuresParSemaine,
  pieceParRef,
  piecesNiveau1,
  politiqueRemM1,
  remplisseuse,
  usine,
} from "../sim/usine";
import { habillerNarration, installerNarration } from "./narration";

const CLE = "jeu-maintenance-bts-niveau1";

type Ecran = "accueil" | "jeu" | "exercice";

interface Brouillon {
  nature: "palliatif" | "curatif";
  intervenant: "interne" | "sous_traitance";
  approvisionnement: "" | "stock" | "express" | "standard";
  curatifDiffere: boolean;
}

let racine: HTMLElement;
let ecran: Ecran = "accueil";
let partie: Partie | null = null;
let exercice: BilanTour | null = null;
let flash = "";
let brouillon: Brouillon = brouillonInitial();
let panneCle = "";

export function monter(element: HTMLElement): void {
  racine = element;
  racine.addEventListener("submit", onSubmit);
  racine.addEventListener("click", onClick);
  racine.addEventListener("change", onChange);
  const seed = seedDansUrl();
  if (seed) ecrireSeed(seed);
  installerNarration();
  dessiner();
}

function dessiner(): void {
  if (partie?.panne) {
    const cle = `${partie.tour}-${partie.panne.modeId}-${partie.panne.heure}`;
    if (cle !== panneCle) {
      panneCle = cle;
      brouillon = brouillonInitial();
    }
  }
  racine.innerHTML = page();
  habillerNarration(racine, partie, ecran);
}

function page(): string {
  return `${bandeau()}${ecran === "accueil" ? accueil() : ecran === "exercice" ? ecranExercice() : ecranJeu()}`;
}

function bandeau(): string {
  const seed = partie?.seedLabel || exerciceSeed() || seedDansUrl() || "—";
  return `<header class="bandeau"><div class="bandeau-interne">
    <p class="kicker">Boissons des Calanques · ligne L1 · niveau 1</p>
    <h1>Chef du service maintenance</h1>
    <p class="meta-bandeau">${esc(usine.organisation.produit)} · ${esc(usine.organisation.horaires)} · graine ${esc(seed)}</p>
  </div></header>`;
}

function accueil(): string {
  const sauvegarde = lireSauvegarde();
  const seed = seedDansUrl();
  return `<main class="page">
    <section class="carte">
      <h2>La remplisseuse tombe en panne</h2>
      <p>Tu diriges la maintenance de la remplisseuse, le goulot de la ligne. Huit semaines, deux techniciens. Chaque semaine : planifier, vivre les pannes, décider de l'intervention, puis calculer au brouillon le MTBF, le MTTR et la disponibilité opérationnelle.</p>
      <p class="muted">Usine fictive, construite pour le BTS Maintenance des systèmes. Les coûts et les lois viennent du fichier usine, pas d'un barème caché.</p>
      <form data-form="accueil">
        <div class="champ"><label>Pseudo <input name="pseudo" required maxlength="40" autocomplete="nickname" placeholder="ex. camille"></label></div>
        <div class="champ"><label>Graine de la partie <input name="seed" required value="${esc(seed)}" placeholder="ex. 2026"></label>
          <p class="muted">La même graine rejoue les mêmes pannes. Le professeur peut l'imposer dans l'adresse : <span>?seed=2026</span>.</p></div>
        <div class="actions"><button type="submit">Commencer la semaine 1</button></div>
      </form>
    </section>
    ${
      sauvegarde
        ? `<section class="carte"><h2>Partie en cours sur cet ordinateur</h2>
          <p>${esc(sauvegarde.pseudo)} · graine ${esc(sauvegarde.seedLabel)} · semaine ${sauvegarde.tour} · ${esc(sauvegarde.phase)}</p>
          <div class="actions">
            <button type="button" data-action="reprendre">Reprendre</button>
            <button type="button" class="secondaire" data-action="oublier">Effacer la sauvegarde</button>
          </div></section>`
        : ""
    }
    <section class="carte">
      <h2>S'entraîner sur l'historique d'exercice</h2>
      <p>Dix semaines déjà jouées, quatre pannes de remplisseuse, Tr = 800 h. Les indicateurs se calculent à la main, avec la même tolérance que dans la partie.</p>
      <button type="button" class="secondaire" data-action="exercice">Ouvrir l'exercice</button>
    </section>
  </main>`;
}

function ecranJeu(): string {
  if (!partie) return accueil();
  if (partie.phase === "termine") return bilanFinal();
  return `<main class="page">
    ${pas()}
    ${flash ? `<p class="alerte rouge">${esc(flash)}</p>` : ""}
    ${tableauDeBord()}
    ${zonePhase()}
  </main>`;
}

function pas(): string {
  const ordre = ["planifier", "evenements", "intervenir", "bilan"] as const;
  const libelles = ["1. Planifier", "2. Événements", "3. Intervenir", "4. Bilan"];
  const index = Math.max(0, ordre.indexOf(partie!.phase as (typeof ordre)[number]));
  return `<ol class="phases">${libelles
    .map((libelle, i) => `<li class="phase${i === index ? " active" : i < index ? " faite" : ""}">${libelle}</li>`)
    .join("")}<li class="phase">Semaine ${partie!.tour} / ${NIVEAU_1.nbTours}</li></ol>`;
}

function tableauDeBord(): string {
  const p = partie!;
  const arret = ligneArretee(p) || p.phase === "intervenir";
  const flux = ["SOU", "CON", "REM", "BOU", "ETI", "FAR"];
  const cout = coutEngage(p);
  return `<section class="carte">
    <div class="ligne-machines">${flux
      .map((id) => {
        const goulot = id === "REM";
        const classe = goulot ? `machine goulot${arret ? " arret" : ""}` : "machine hors";
        const etat = goulot ? (arret ? "arrêtée" : "en production") : "hors niveau 1";
        const cadence = goulot ? `<span>${formatNombre(remplisseuse().cadence_nominale_bouteilles_par_h, 0)} b/h</span>` : "";
        return `<div class="${classe}"><strong>${esc(nomCourt(id))}</strong><span>${etat}</span>${cadence}</div>`;
      })
      .join("")}</div>
    <div class="chiffres" style="margin-top:12px">
      <div class="chiffre"><b>${NIVEAU_1.nbTechniciens}</b><span>techniciens internes, ${formatEuros(usine.couts.taux_main_oeuvre_eur_par_h)}/h</span></div>
      <div class="chiffre"><b>${formatEuros(cout)}</b><span>coût engagé · budget provisoire ${formatEuros(NIVEAU_1.budgetEur)}</span></div>
      <div class="chiffre"><b>${formatEuros(remplisseuse().penalite_arret_eur_par_h)}</b><span>par heure d'arrêt de ligne</span></div>
      <div class="chiffre"><b>${formatHeures(p.tour * heuresParSemaine())}</b><span>temps requis en fin de cette semaine</span></div>
    </div>
  </section>`;
}

function zonePhase(): string {
  const p = partie!;
  if (p.phase === "planifier") return phasePlanifier();
  if (p.phase === "evenements") return phaseEvenements();
  if (p.phase === "intervenir") return phaseIntervenir();
  return phaseBilan();
}

function phasePlanifier(): string {
  const p = partie!;
  const politique = politiqueRemM1();
  const alerte = ligneArretee(p)
    ? `<p class="alerte rouge">La ligne est encore arrêtée au début de la semaine. Le planning ne la remet pas en route : l'intervention déjà décidée suit son cours.</p>`
    : "";
  const preventif = preventifCetteSemaine(p.tour)
    ? `<p class="alerte">Samedi : préventif imposé, non modifiable. ${esc(politique.action)}. Coût forfaitaire ${formatEuros(politique.cout_eur)}, hors ouverture, si le kit est en stock.</p>`
    : `<p class="muted">Pas de préventif samedi cette semaine. Le remplacement des 24 joints revient toutes les ${politique.periode_semaines} semaines.</p>`;
  const lignes = piecesNiveau1()
    .map((piece) => {
      const stock = quantiteStock(p, piece.ref);
      const encours = quantiteEnCommande(p, piece.ref);
      return `<tr>
        <td><strong>${esc(piece.ref)}</strong><br><span class="muted">${esc(piece.designation)}</span></td>
        <td class="num">${stock}</td>
        <td class="num">${piece.stock_mini}</td>
        <td class="num">${formatEuros(piece.prix_unitaire_eur)}</td>
        <td class="num">${encours}</td>
        <td><input name="qte-${esc(piece.ref)}" type="number" min="0" max="20" step="1" value="0" inputmode="numeric" aria-label="Quantité ${esc(piece.ref)}"></td>
        <td><select name="delai-${esc(piece.ref)}" aria-label="Délai ${esc(piece.ref)}">
          <option value="standard">Standard (${piece.delai_standard_semaines} sem.)</option>
          <option value="express">Express (${formatHeures(usine.couts.delai_express_h)}, +${formatNombre(usine.couts.majoration_express_pct, 0)} %)</option>
        </select></td>
      </tr>`;
    })
    .join("");
  return `<section class="carte"><h2>Planifier la semaine ${p.tour}</h2>
    ${alerte}${preventif}
    <p>Les deux techniciens restent sur la remplisseuse. Tu peux commander des pièces : le délai standard est de ${pieceParRef("P-REM-01").delai_standard_semaines} semaines, l'express arrive en ${formatHeures(usine.couts.delai_express_h)} d'ouverture.</p>
    <form data-form="planning"><div class="table-wrap"><table>
      <thead><tr><th>Pièce</th><th class="num">Stock</th><th class="num">Mini</th><th class="num">Prix</th><th class="num">En commande</th><th>Qté</th><th>Délai</th></tr></thead>
      <tbody>${lignes}</tbody>
    </table></div>
    <div class="actions"><button type="submit">Valider le planning</button></div></form>
    ${aide()}
  </section>${historique(false)}`;
}

function phaseEvenements(): string {
  const p = partie!;
  const suite = p.suite === "intervenir" ? "Décider de l'intervention" : "Passer au bilan";
  return `<section class="carte"><h2>Semaine ${p.tour} — événements</h2>
    ${barre(p)}
    <ul class="recit">${p.recit
      .filter((l) => l.tour === p.tour)
      .map((l) => `<li>${esc(l.texte)}</li>`)
      .join("")}</ul>
    <div class="actions"><button type="button" data-action="lire">${suite}</button></div>
  </section>`;
}

function phaseIntervenir(): string {
  const p = partie!;
  const panne = p.panne;
  if (!panne) return `<section class="carte"><p>Pas de panne en cours.</p></section>`;
  const mode = remplisseuse().modes.find((m) => m.id_mode === panne.modeId)!;
  const ref = mode.pieces_corrective[0] ?? "";
  const qte = quantiteCorrective(mode.id_mode);
  const stock = ref ? quantiteStock(p, ref) : 0;
  const devis = brouillon.nature === "palliatif" || brouillon.approvisionnement ? devisCourant(p) : null;
  const standardPossible = panne.heure + delaiStandard(ref) < horizon();
  const titreInterne = "Interne · " + formatEuros(usine.couts.taux_main_oeuvre_eur_par_h) + "/h";
  const titreExterne =
    "Sous-traitance · " +
    formatEuros(usine.couts.sous_traitance_eur_par_h) +
    "/h + " +
    formatEuros(usine.couts.sous_traitance_deplacement_eur);
  const detailExterne =
    "Arrivée en " + formatHeures(usine.couts.sous_traitance_delai_arrivee_h) + ", en plus de l'attente de pièce.";
  const suiteFormulaire = brouillon.nature === "curatif" ? blocPiece(ref, qte, stock, standardPossible) : blocPalliatif();
  const bouton = devis && !devis.erreur ? "" : "disabled";
  return `<section class="grille deux">
    <div class="carte">
      <h2>${panne.rechute ? "La panne revient" : "Panne en cours"}</h2>
      <p><strong>${esc(mode.designation)}</strong> · ${esc(mode.id_mode)}<br>
      ${esc(libelleHoraire(panne.heure, heuresParSemaine()))} · détection : ${esc(mode.mode_detection)}</p>
      <p>Détection constatée : ${formatHeures(panne.detection)}. Réparation curative estimée : ${formatHeures(panne.reparation)}. Remise en service estimée : ${formatHeures(panne.remise)}.</p>
      <p>Pièce ${esc(ref)} · besoin ${qte} · en stock ${stock}. ${esc(pieceParRef(ref).designation)}.</p>
      <form data-form="intervention">
        <fieldset><legend>Action</legend>
          ${radio("nature", "curatif", "Réparation curative", "La pièce est changée. L'effet dépend du mode : la sonde repart à neuf, un joint fuyard ne remet pas les 24 vannes à neuf.")}
          ${radio("nature", "palliatif", "Dépannage provisoire", "0,5 h de réparation, pas de pièce. La panne n'est pas éliminée : sans curatif samedi, elle revient lundi.")}
        </fieldset>
        <fieldset><legend>Qui intervient ?</legend>
          ${radio("intervenant", "interne", titreInterne, "Un technicien sur place, dès que la pièce est là.")}
          ${radio("intervenant", "sous_traitance", titreExterne, detailExterne)}
        </fieldset>
        ${suiteFormulaire}
        <div class="actions"><button type="submit" ${bouton}>Confirmer l'intervention</button></div>
      </form>
    </div>
    <aside class="carte devis">
      <h3>Conséquence chiffrée</h3>
      ${texteDevis(devis)}
      ${aide()}
    </aside>
  </section>`;
}

function blocPiece(ref: string, qte: number, stock: number, standardPossible: boolean): string {
  const titreStock = "Prendre au magasin · attente " + formatHeures(0.25);
  const detailStock = stock >= qte ? stock + " disponible(s)." : "Stock insuffisant.";
  const titreExpress =
    "Commande express · " + formatHeures(usine.couts.delai_express_h) + ", +" + formatNombre(usine.couts.majoration_express_pct, 0) + " %";
  const titreStandard = "Délai standard · " + pieceParRef(ref).delai_standard_semaines + " semaines";
  const detailStandard = standardPossible ? "La ligne reste arrêtée jusqu'à la livraison." : "Ce délai dépasse la fin de la partie.";
  return `<fieldset><legend>Pièce</legend>
    ${radio("approvisionnement", "stock", titreStock, detailStock, stock < qte)}
    ${radio("approvisionnement", "express", titreExpress, "La ligne reste arrêtée pendant la livraison.")}
    ${radio("approvisionnement", "standard", titreStandard, detailStandard, !standardPossible)}
  </fieldset>`;
}

function blocPalliatif(): string {
  const coche = brouillon.curatifDiffere ? "checked" : "";
  const taux = formatEuros(usine.couts.taux_main_oeuvre_heures_sup_eur_par_h);
  return `<fieldset><legend>Après le dépannage</legend>
    <label class="ligne"><input type="checkbox" name="curatifDiffere" ${coche}> Planifier le curatif samedi (hors ouverture, ${taux}/h, sans arrêt de ligne). Il faut la pièce en stock samedi.</label>
  </fieldset>`;
}

function texteDevis(devis: ReturnType<typeof devisCourant>): string {
  if (!devis) return `<p class="muted">Choisis une action et une pièce pour voir l'attente, le coût direct et le coût d'arrêt.</p>`;
  if (devis.erreur) return `<p class="alerte">${esc(devis.erreur)}</p>`;
  if (!devis.cout) return `<p class="muted">Devis indisponible.</p>`;
  return blocDevis(devis.cout.ta, devis.cout.coutDirect, devis.cout.coutArret, devis.cout.coutTotal, devis.tronque);
}

function phaseBilan(): string {
  const p = partie!;
  const bilan = p.bilan;
  if (!bilan) return "";
  const fini = bilan.champs.every((c) => c.resolu);
  const champs = bilan.champs
    .map((champ) => {
      const message = champ.dernierMessage
        ? `<p class="${champ.correctionAffichee ? "alerte" : champ.resolu ? "ok" : "alerte"}">${esc(champ.dernierMessage)}</p>`
        : "";
      if (champ.resolu) return `<div class="champ"><strong>${esc(champ.libelle)}</strong>${message}</div>`;
      return `<div class="champ"><label>${esc(champ.libelle)}
        <input name="${champ.id}" inputmode="decimal" autocomplete="off" required></label>${message}</div>`;
    })
    .join("");
  return `<section class="carte"><h2>Bilan de la semaine ${bilan.tour}</h2>
    <p>Temps requis Tr = ${formatHeures(bilan.tr)}. Pannes correctives pendant l'ouverture : N = ${bilan.n}. ΣTA = ${formatHeures(bilan.sommeTA)}. Σ réparations actives = ${formatHeures(bilan.sommeReparation)}.</p>
    ${bilan.n === 0 ? `<p class="ok">Aucune panne pendant l'ouverture : MTBF et MTTR ne sont pas définis. Do = 100 % tant que ΣTA = 0.</p>` : ""}
    <p class="muted">Do = (Tr − ΣTA) / Tr × 100. Au niveau 1 c'est la disponibilité opérationnelle de la remplisseuse (notée aussi Ao). Le Do du TRS, qui retire en plus les changements de format, est au programme du niveau 2.</p>
    ${
      fini
        ? `${champs}<div class="actions"><button type="button" data-action="tour-suivant">${p.tour >= NIVEAU_1.nbTours ? "Voir la note" : "Semaine suivante"}</button></div>`
        : `<form data-form="saisie">${champs}<div class="actions"><button type="submit">Vérifier</button></div></form>`
    }
    ${aide()}
  </section>${historique(true)}`;
}

function bilanFinal(): string {
  const p = partie!;
  const evaluation = evaluerPartie(p);
  const s = evaluation.synthese;
  const score = evaluation.score;
  const etoiles = "★★★".slice(0, score.etoiles) + "☆☆☆".slice(0, 3 - score.etoiles);
  return `<main class="page"><section class="carte">
    <p class="kicker">Fin de partie · graine ${esc(p.seedLabel)}</p>
    <p class="etoiles" aria-label="${score.etoiles} étoiles sur 3">${etoiles}</p>
    <p class="note">${formatNombre(score.note20, 1)} <span style="font-size:1rem">/ 20</span></p>
    <p>Score ${formatNombre(score.total, 1)} / 100. Disponibilité ${formatNombre(score.pointsDo, 1)} pts · coût ${formatNombre(score.pointsCout, 1)} pts · calculs ${formatNombre(score.pointsJustesse, 1)} pts.</p>
    <p>${score.objectifDo ? `Disponibilité ${formatPourcent(s.indicateurs.Ao)} : l'objectif de ${OBJECTIF_DO_PCT} % est atteint.` : `Disponibilité ${formatPourcent(s.indicateurs.Ao)} : l'objectif de ${OBJECTIF_DO_PCT} % n'est pas atteint.`} ${score.passage ? "Le palier de passage est atteint sur cette tentative." : `Le palier de passage demande en plus au moins 2 étoiles et 70 % de calculs justes (ici ${formatNombre(score.justesseRatio * 100, 0)} %).`}</p>
    <div class="chiffres">
      <div class="chiffre"><b>${s.indicateurs.MTBF === null ? "—" : formatHeures(s.indicateurs.MTBF)}</b><span>MTBF</span></div>
      <div class="chiffre"><b>${s.indicateurs.MTTR === null ? "—" : formatHeures(s.indicateurs.MTTR)}</b><span>MTTR</span></div>
      <div class="chiffre"><b>${s.indicateurs.MDT === null ? "—" : formatHeures(s.indicateurs.MDT)}</b><span>MDT</span></div>
      <div class="chiffre"><b>${formatPourcent(s.indicateurs.Ao)}</b><span>Do</span></div>
      <div class="chiffre"><b>${formatEuros(s.coutGlobal)}</b><span>coût global</span></div>
      <div class="chiffre"><b>${formatEuros(evaluation.reference.coutGlobal)}</b><span>coût de la politique de référence</span></div>
    </div>
    <p class="muted">Coût direct ${formatEuros(s.coutDirect)}, indirect ${formatEuros(s.coutIndirect)}, possession du stock ${formatEuros(s.possession)}. La note de classe (meilleure de deux tentatives) attend le serveur : ici, l'export sert au professeur.</p>
    <div class="actions">
      <button type="button" data-action="export">Exporter le CSV</button>
      <button type="button" class="secondaire" data-action="rejouer">Rejouer cette graine</button>
      <button type="button" class="secondaire" data-action="accueil">Autre partie</button>
    </div>
  </section>${historique(true)}</main>`;
}

function ecranExercice(): string {
  if (!exercice) exercice = bilanExerciceRemplisseuse();
  const bilan = exercice;
  const fini = bilan.champs.every((c) => c.resolu);
  const lignes = pannesRemplisseuseExercice()
    .map(
      (ev) => `<tr>
      <td>${esc(ev.id_evenement)}</td><td>${esc(ev.id_mode_defaillance)}</td>
      <td class="num">${formatNombre(ev.duree_detection_h, 2)}</td>
      <td class="num">${formatNombre(ev.duree_attente_logistique_h, 2)}</td>
      <td class="num">${formatNombre(ev.duree_reparation_active_h, 2)}</td>
      <td class="num">${formatNombre(ev.duree_remise_en_service_h, 2)}</td>
      <td class="num">${formatNombre(ev.duree_arret_totale_h, 2)}</td></tr>`,
    )
    .join("");
  const champs = bilan.champs
    .map((champ) => {
      const message = champ.dernierMessage
        ? `<p class="${champ.correctionAffichee ? "alerte" : champ.resolu ? "ok" : "alerte"}">${esc(champ.dernierMessage)}</p>`
        : "";
      if (champ.resolu) return `<div class="champ"><strong>${esc(champ.libelle)}</strong>${message}</div>`;
      return `<div class="champ"><label>${esc(champ.libelle)}<input name="${champ.id}" inputmode="decimal" required></label>${message}</div>`;
    })
    .join("");
  return `<main class="page"><section class="carte">
    <h2>Exercice — remplisseuse, 10 semaines</h2>
    <p>Tr = ${formatHeures(bilan.tr)}. N = ${bilan.n}. Les préventifs du samedi sont hors ouverture : ils ne comptent pas dans ΣTA.</p>
    <div class="table-wrap"><table>
      <thead><tr><th>Panne</th><th>Mode</th><th class="num">Détection</th><th class="num">Attente</th><th class="num">Réparation</th><th class="num">Remise</th><th class="num">TA</th></tr></thead>
      <tbody>${lignes}</tbody>
      <tfoot><tr><th colspan="2">Totaux</th><td class="num" colspan="4"></td><td class="num">${formatNombre(bilan.sommeTA, 2)}</td></tr></tfoot>
    </table></div>
    <p class="muted">Σ réparations actives = ${formatHeures(bilan.sommeReparation)}. MTBF = (Tr − ΣTA) / N. MTTR = Σ réparations / N. Do = (Tr − ΣTA) / Tr × 100.</p>
    ${fini ? champs : `<form data-form="exercice">${champs}<div class="actions"><button type="submit">Vérifier</button></div></form>`}
    <div class="actions"><button type="button" class="secondaire" data-action="accueil">Retour à l'accueil</button></div>
  </section></main>`;
}

function historique(ouvert: boolean): string {
  const p = partie;
  if (!p || p.evenements.length === 0) return "";
  const h = heuresParSemaine();
  const lignes = p.evenements
    .map((ev) => {
      if (ev.hors_temps_ouverture) {
        return `<tr class="hors-ligne"><td>${ev.tour}</td><td>samedi</td><td>${esc(ev.description)}</td><td colspan="5">hors ouverture · ${esc(ev.type_maintenance.replaceAll("_", " "))} · ${formatEuros(ev.cout_total_eur)}</td></tr>`;
      }
      return `<tr>
        <td>${ev.tour}</td>
        <td>${esc(ev.debut_arret_h_ouverture === null ? "—" : libelleHoraire(ev.debut_arret_h_ouverture, h))}</td>
        <td>${esc(ev.description)}${ev.reparation_provisoire ? " · palliatif" : ""}${ev.rechute ? " · rechute" : ""}</td>
        <td class="num">${formatNombre(ev.duree_detection_h, 2)}</td>
        <td class="num">${formatNombre(ev.duree_attente_logistique_h, 2)}</td>
        <td class="num">${formatNombre(ev.duree_reparation_active_h, 2)}</td>
        <td class="num">${formatNombre(ev.duree_remise_en_service_h, 2)}</td>
        <td class="num">${formatNombre(ev.duree_arret_totale_h, 2)}</td>
      </tr>`;
    })
    .join("");
  return `<details class="carte" ${ouvert ? "open" : ""}><summary><h2 style="display:inline">Historique GMAO</h2></summary>
    <div class="table-wrap"><table>
      <thead><tr><th>Sem.</th><th>Quand</th><th>Mode</th><th class="num">Dét.</th><th class="num">Att.</th><th class="num">Rép.</th><th class="num">Rem.</th><th class="num">TA</th></tr></thead>
      <tbody>${lignes}</tbody>
    </table></div>
    <p class="muted">ΣTBF = Tr − ΣTA. Le dernier intervalle, entre la dernière remise en service et la fin de la période, compte dans ΣTBF. Les samedis ne comptent pas dans TA.</p>
  </details>`;
}

function aide(): string {
  return `<details class="aide"><summary>Rappel des formules (usage BTS)</summary>
    <p>TA = détection + attente logistique + réparation active + remise en service. ΣTBF = Tr − ΣTA.</p>
    <p>MTBF = ΣTBF / N. MTTR = Σ réparations actives / N. MDT = ΣTA / N.</p>
    <p>Do = (Tr − ΣTA) / Tr. Ai = MTBF / (MTBF + MTTR). L'écart entre Ai et Do, c'est la logistique.</p>
    <p class="muted">La norme NF EN 13306 appelle MTBF le temps moyen entre défaillances, arrêts compris. En BTS, MTBF désigne le temps moyen de bon fonctionnement.</p>
  </details>`;
}

function barre(p: Partie): string {
  const h = heuresParSemaine();
  const debut = p.semaineDebut;
  const segments = p.evenements
    .filter((ev) => !ev.hors_temps_ouverture && ev.debut_arret_h_ouverture !== null)
    .map((ev) => {
      const a = Math.max(debut, ev.debut_arret_h_ouverture ?? 0);
      const b = Math.min(debut + h, (ev.debut_arret_h_ouverture ?? 0) + ev.duree_arret_totale_h);
      if (b <= a) return "";
      const left = ((a - debut) / h) * 100;
      const width = ((b - a) / h) * 100;
      return `<i style="left:${left}%;width:${width}%"></i>`;
    })
    .join("");
  return `<div class="barre" aria-hidden="true">${segments}</div>
    <div class="jours"><span>lundi</span><span>mardi</span><span>mercredi</span><span>jeudi</span><span>vendredi</span></div>`;
}

function blocDevis(ta: number, direct: number, arret: number, total: number, tronque: boolean): string {
  return `<p>Temps d'arrêt <strong>${formatHeures(ta)}</strong></p>
    <p>Coût direct ${formatEuros(direct)} · arrêt de ligne ${formatEuros(arret)}</p>
    <p>Total de cette intervention <strong>${formatEuros(total)}</strong></p>
    ${tronque ? `<p class="muted">L'arrêt est coupé à la fin des 8 semaines : seules les heures encore dans la partie sont comptées.</p>` : ""}`;
}

function radio(nom: string, valeur: string, titre: string, detail: string, desactive = false): string {
  const courant = (brouillon as unknown as Record<string, string>)[nom];
  return `<label class="ligne"><input type="radio" name="${nom}" value="${valeur}" ${courant === valeur ? "checked" : ""} ${desactive ? "disabled" : ""}>
    <span><strong>${titre}</strong><br><span class="muted">${detail}</span></span></label>`;
}

function onSubmit(event: Event): void {
  const form = (event.target as HTMLElement).closest("form");
  if (!form) return;
  event.preventDefault();
  const data = new FormData(form);
  if (form.dataset.form === "accueil") {
    const pseudo = String(data.get("pseudo") ?? "").trim();
    const seed = String(data.get("seed") ?? "").trim();
    if (!pseudo || !seed) {
      flash = "Le pseudo et la graine sont obligatoires.";
      dessiner();
      return;
    }
    flash = "";
    ecrireSeed(seed);
    partie = demarrer(seed, pseudo);
    ecran = "jeu";
    sauver();
    dessiner();
    return;
  }
  if (!partie) return;
  if (form.dataset.form === "planning") {
    const commandes = piecesNiveau1().map((piece) => ({
      ref: piece.ref,
      qte: Number(data.get(`qte-${piece.ref}`) ?? 0),
      delai: (data.get(`delai-${piece.ref}`) === "express" ? "express" : "standard") as "express" | "standard",
    }));
    agir({ type: "planning", commandes });
    return;
  }
  if (form.dataset.form === "intervention") {
    lireBrouillon(form);
    if (!brouillonComplet()) {
      flash = "Choisis l'approvisionnement de la pièce.";
      dessiner();
      return;
    }
    agir({ type: "intervention", choix: choixDepuisBrouillon() });
    return;
  }
  if (form.dataset.form === "saisie" && partie.bilan) {
    const valeurs: Record<string, string> = {};
    for (const champ of partie.bilan.champs) {
      if (!champ.resolu) valeurs[champ.id] = String(data.get(champ.id) ?? "");
    }
    agir({ type: "saisie", valeurs });
    return;
  }
  if (form.dataset.form === "exercice" && exercice) {
    const valeurs: Record<string, string> = {};
    for (const champ of exercice.champs) if (!champ.resolu) valeurs[champ.id] = String(data.get(champ.id) ?? "");
    soumettreExercice(valeurs);
  }
}

function onClick(event: Event): void {
  const bouton = (event.target as HTMLElement).closest<HTMLElement>("[data-action]");
  if (!bouton) return;
  const action = bouton.dataset.action;
  if (action === "lire" && partie) agir({ type: "lire" });
  if (action === "tour-suivant" && partie) agir({ type: "tour-suivant" });
  if (action === "exercice") {
    exercice = bilanExerciceRemplisseuse();
    ecran = "exercice";
    flash = "";
    dessiner();
  }
  if (action === "accueil") {
    ecran = "accueil";
    flash = "";
    dessiner();
  }
  if (action === "reprendre") {
    const sauve = lireSauvegarde();
    if (!sauve) return;
    partie = sauve;
    ecran = "jeu";
    ecrireSeed(sauve.seedLabel);
    dessiner();
  }
  if (action === "oublier") {
    localStorage.removeItem(CLE);
    dessiner();
  }
  if (action === "export" && partie) telecharger();
  if (action === "rejouer" && partie) {
    const seed = partie.seedLabel;
    const pseudo = partie.pseudo;
    partie = demarrer(seed, pseudo);
    ecran = "jeu";
    sauver();
    dessiner();
  }
}

function onChange(event: Event): void {
  const form = (event.target as HTMLElement).closest("form");
  if (!form || form.dataset.form !== "intervention") return;
  lireBrouillon(form);
  flash = "";
  dessiner();
}

function agir(decision: Decision): void {
  if (!partie) return;
  const suivante = appliquer(partie, decision);
  if (suivante.erreur) {
    flash = suivante.erreur;
    dessiner();
    return;
  }
  flash = "";
  partie = suivante;
  sauver();
  dessiner();
}

function soumettreExercice(valeurs: Record<string, string>): void {
  if (!exercice) return;
  const ctx = contexteDepuisBilan(exercice);
  for (const champ of exercice.champs) {
    if (champ.resolu || !(champ.id in valeurs)) continue;
    const resultat = evaluerSaisie(champ.id, valeurs[champ.id] ?? "", ctx);
    champ.valeurSaisie = resultat.valeur;
    if (resultat.ok) {
      champ.resolu = true;
      champ.correctionAffichee = false;
      champ.dernierMessage = resultat.indice;
    } else {
      champ.essais += 1;
      champ.resolu = champ.essais >= 2;
      champ.correctionAffichee = champ.essais >= 2;
      champ.dernierMessage = champ.essais >= 2 ? resultat.correction : resultat.indice;
    }
  }
  dessiner();
}

function lireBrouillon(form: HTMLFormElement): void {
  const data = new FormData(form);
  const nature = data.get("nature");
  const intervenant = data.get("intervenant");
  const appro = data.get("approvisionnement");
  brouillon = {
    nature: nature === "palliatif" ? "palliatif" : "curatif",
    intervenant: intervenant === "sous_traitance" ? "sous_traitance" : "interne",
    approvisionnement: appro === "stock" || appro === "express" || appro === "standard" ? appro : "",
    curatifDiffere: data.get("curatifDiffere") === "on",
  };
}

function brouillonComplet(): boolean {
  return brouillon.nature === "palliatif" || brouillon.approvisionnement !== "";
}

function choixDepuisBrouillon(): ChoixIntervention {
  return {
    nature: brouillon.nature,
    intervenant: brouillon.intervenant,
    approvisionnement: brouillon.approvisionnement || "express",
    curatifDiffere: brouillon.curatifDiffere,
  };
}

function devisCourant(p: Partie) {
  if (brouillon.nature === "curatif" && !brouillon.approvisionnement) return null;
  return devisIntervention(p, choixDepuisBrouillon());
}

function telecharger(): void {
  if (!partie) return;
  const csv = exporterCsv(partie);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const lien = document.createElement("a");
  lien.href = URL.createObjectURL(blob);
  lien.download = nomFichierCsv(partie.pseudo, partie.seedLabel);
  lien.click();
  URL.revokeObjectURL(lien.href);
}

function sauver(): void {
  if (!partie) return;
  try {
    localStorage.setItem(CLE, JSON.stringify(partie));
  } catch {
    /* navigation privée : la partie continue sans sauvegarde */
  }
}

function lireSauvegarde(): Partie | null {
  try {
    const brut = localStorage.getItem(CLE);
    if (!brut) return null;
    const lu = JSON.parse(brut) as Partie;
    if (lu.version !== 1 || !lu.seedLabel || !lu.phase) return null;
    return lu;
  } catch {
    return null;
  }
}

function coutEngage(p: Partie): number {
  const total = p.evenements.reduce((s, ev) => s + ev.cout_total_eur, 0) + p.possessionCumulee;
  return Math.round(total * 100) / 100;
}

function horizon(): number {
  return NIVEAU_1.nbTours * heuresParSemaine();
}

function delaiStandard(ref: string): number {
  return pieceParRef(ref).delai_standard_semaines * heuresParSemaine();
}

function seedDansUrl(): string {
  return new URLSearchParams(location.search).get("seed")?.trim() ?? "";
}

function ecrireSeed(seed: string): void {
  const url = new URL(location.href);
  url.searchParams.set("seed", seed);
  history.replaceState(null, "", url);
}

function exerciceSeed(): string {
  return ecran === "exercice" ? "exercice" : "";
}

function brouillonInitial(): Brouillon {
  return { nature: "curatif", intervenant: "interne", approvisionnement: "", curatifDiffere: false };
}

function nomCourt(id: string): string {
  const designation = usine.equipements.find((eq) => eq.id_equipement === id)?.designation ?? id;
  return designation.split(/[\s(]/)[0] || id;
}

function esc(valeur: string): string {
  return valeur.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}
