# Chef du service maintenance — niveau 1

Prototype jouable d'un jeu sérieux pour le BTS Maintenance des systèmes (lycée Antonin Artaud, Marseille). L'élève dirige la maintenance de la **remplisseuse** de la ligne L1 de « Boissons des Calanques », une usine fictive.

Huit semaines, deux techniciens, deux modes de défaillance (fuite de joint, sonde de niveau). Tout se joue dans le navigateur, sans serveur.

## Lancer en local

```bash
npm install
npm run dev
```

Ouvrir [http://localhost:5173/jeu-maintenance-bts/](http://localhost:5173/jeu-maintenance-bts/). La base Vite est `/jeu-maintenance-bts/`, la même que sur GitHub Pages.

La graine de la partie se lit dans l'adresse. `?seed=2026` rejoue toujours le même scénario. Sans graine, celle saisie à l'accueil est écrite dans l'URL.

```bash
npm test        # Vitest
npm run build   # vérification TypeScript + build de production
npm run preview # sert le dossier dist
```

## Comment jouer

Une partie dure **8 tours**. Un tour est une semaine de **80 h d'ouverture** (lundi–vendredi, 05:00–21:00).

1. **Planifier.** Les deux techniciens sont sur la remplisseuse. Le remplacement des 24 joints est imposé toutes les 4 semaines, le samedi, s'il y a un kit en stock. On peut commander des pièces en délai standard (2 semaines) ou en express (16 h d'ouverture, +50 %).
2. **Événements.** La semaine se déroule. Les pannes sont tirées avec la graine (loi de Weibull pour les joints, loi exponentielle pour la sonde).
3. **Intervenir.** Pour chaque panne : réparation curative ou dépannage provisoire (si le mode l'autorise) ; interne ou sous-traitance ; pièce prise au magasin, en express ou en délai standard. Les coûts, les délais et la règle de dépannage viennent de `data/usine.json`.
4. **Bilan.** Calculatrice en main : MTBF, MTTR et Ao. Ao = (Tr − ΣTA) / Tr. La première erreur donne un indice, la deuxième affiche la correction. Tolérance : ±0,05 h et ±0,05 point. La virgule et le point sont acceptés.

Le dépannage provisoire ne remet pas le mode à neuf et ne consomme pas de pièce. La réparation active est la valeur figée du mode (1 h pour REM-M1). La détection et la remise en service restent celles de la panne. La même panne revient après 40 h d'ouverture. Un curatif différé le samedi (pièce en stock, hors ouverture, sans perte de production) annule cette réapparition : il n'entre pas dans N, ni dans ΣTA, ni dans le MTTR, mais ses coûts directs sont comptés. Une rechute est une nouvelle défaillance. Si `autorise` vaut faux (REM-M3, FAR-M1), le choix n'est pas proposé.

En fin de partie : score sur 100, étoiles à 60 / 75 / 90, note sur 20 = score ÷ 5 arrondie au demi-point. Le niveau 1 est réussi lorsque l'Ao est d'au moins 92 %, avec au moins 2 étoiles et au moins 70 % de calculs justes. Le bilan affiche « niveau réussi » ou « niveau non réussi », et le CSV reprend ce libellé. Export CSV pour le professeur (séparateur `;`). La partie en cours est reprise via le navigateur (`localStorage`) après un rafraîchissement.

L'écran d'accueil propose aussi l'**historique d'exercice** (10 semaines, corrigés de l'expert) pour s'entraîner au calcul.

## Structure

| Dossier | Rôle |
|---|---|
| `data/usine.json` | Source unique de vérité : équipements, modes, coûts, délais, stocks, politique. Chargé tel quel. |
| `reference/` | Cadrage métier, schémas, historiques et scripts Python de l'expert. Les tests s'y comparent. |
| `src/sim/` | Moteur pur, sans DOM. PRNG mulberry32, indicateurs, coûts, partie, score. Réutilisable plus tard pour un recalcul serveur. |
| `src/ui/` | Interface (TypeScript vanilla). |
| `tests/` | Vitest. |

Le score est isolé dans `src/sim/score.ts` : il ne lit ni le DOM ni le générateur aléatoire. `evaluerPartie` rejoue la graine avec une politique de référence pour la partie « coût ».

## Écarts et choix de conception

`usine.json` prime sur le GDD lorsqu'ils diffèrent. Les valeurs de game design absentes du fichier (8 tours, 2 techniciens, poids du score) restent celles du GDD, provisoires, et sont regroupées dans `src/sim/niveau1.ts`. Il n'y a pas de plafond de budget au niveau 1.

- **Ao saisi par l'élève.** Au niveau 1, l'indicateur de disponibilité est l'**Ao** : `(Tr − ΣTA) / Tr`. Le sigle Do est réservé au TRS du niveau 2 (`Tf / Tr`, 75 % sur l'exercice de 10 semaines). L'aide, la saisie, la correction et le CSV disent Ao. Les tests vérifient les deux nombres et ne les confondent pas. Le MDT n'est pas saisi ; il est cité dans la correction quand le MTTR est confondu avec lui.
- **REM-M3** (motoréducteur) n'est pas joué au niveau 1. Son dépannage provisoire est interdit dans les données, comme celui de FAR-M1 : le choix serait masqué.
- **Générateur.** Le GDD impose mulberry32. L'historique simulé de l'expert a été produit avec le PCG64 de NumPy : une même graine ne rejoue pas ce fichier bit à bit. Les indicateurs calculés sur un historique donné, eux, collent à `reference/scripts/resultats.json`.
- **Attente si la pièce est en stock : 0,25 h**, comme le GDD et `donnees.py`. L'historique d'exercice est affiché et noté tel quel, sans être régénéré. EX-0004 et EX-0016 gardent une attente de 0 h. EX-0002 et EX-0013 restent des dépannages provisoires à 0,5 h de réparation active (écart signalé dans le cadrage, données d'atelier conservées). EX-0201 et EX-0202 restent les curatifs différés du samedi, hors N, ΣTA et MTTR, avec leurs coûts directs.
- **Dépannage provisoire.** Chaque mode porte `depannage_provisoire` dans `usine.json` (durée active figée, aucune pièce, réapparition après 40 h d'ouverture, annulée par un curatif différé le samedi). Le moteur ne pose plus de durée par défaut. REM-M1 : 1 h de réparation active.
- **Champs chargés, pas encore exploités.** `evenements.liste`, la `specialite` de chaque mode, `depannage_provisoire.duree_reparation_active_hors_specialite_h`, `organisation.hors_specialite` (majoration ×1,25 de la réparation active) et `couts.taux_main_oeuvre_dimanche_eur_par_h` sont dans `usine.json` et passent le schéma. Le moteur du niveau 1 les ignore : aucun événement spécial n'est tiré, et la durée de dépannage reste la durée de spécialité. E04 (pièce livrée fausse), la liste canicule, le taux du dimanche et le volume de la commande urgente attendent encore la validation de Steph. Leur moteur fera l'objet d'une PR ultérieure.
- **Quantité et rebuts.** `usine.json` ne dit pas combien de pièces ni de rebuts par panne curative. Le jeu suit l'exercice et `donnees.py` : 2 kits P-REM-01 et 1 200 rebuts pour une fuite de joint ; 1 sonde et 600 rebuts pour REM-M2. Le dépannage provisoire ne consomme pas de pièce et ne compte pas de rebut.
- **Préventif.** Le forfait `cout_eur` (1 000 €) est facturé tel quel. Avec les données actuelles il est égal au kit (600 €) plus 8 h × 50 €. Un test casse si ce lien change.
- **Score et passage.** Poids du niveau 1 : Ao 50 (les 30 de l'Ao plus les 20 du TRS, réaffectés comme le dit le GDD), coût 25, justesse 25. La courbe d'Ao vaut 0 à 70 %, 40 à l'objectif de 92 %, 50 à partir de 98 %. Le coût vaut 25 points s'il ne dépasse pas la politique de référence (curatif interne, express seulement en rupture, commandes standard jusqu'au stock mini), et 0 s'il atteint le double. Le passage du niveau 1 exige Ao ≥ 92 %, au moins 2 étoiles et au moins 70 % de calculs justes. Pas de plafond de budget à ce niveau. Pour plus tard : le coût global devient un critère au niveau 5 (≤ 90 % de la partie de référence) et le budget devient un critère au niveau 6.
- **Sous-traitance.** L'attente est le maximum entre le délai de pièce et les 4 h d'arrivée. Avec deux techniciens et une seule machine, l'interne est en général plus court et moins cher. Les deux options restent chiffrées avant confirmation.
- **Hors de ce prototype.** Serveur, deux tentatives notées, classement, événements spéciaux (la liste est déjà dans les données), règle hors spécialité, taux du dimanche, ligne complète, TRS. L'export CSV tient lieu de secours professeur.

## Publication

Le workflow `.github/workflows/pages.yml` construit le site et le publie avec `actions/deploy-pages` à chaque push sur `main`, ou à la main (`workflow_dispatch`). Dans les réglages du dépôt, la source GitHub Pages doit être « GitHub Actions ». Le site est alors servi sous `/jeu-maintenance-bts/`.
