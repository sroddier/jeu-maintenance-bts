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
3. **Intervenir.** Pour chaque panne : réparation curative ou dépannage provisoire ; interne ou sous-traitance ; pièce prise au magasin, en express ou en délai standard. Les coûts et les délais viennent de `data/usine.json`.
4. **Bilan.** Calculatrice en main : MTBF, MTTR et Do (disponibilité opérationnelle). La première erreur donne un indice, la deuxième affiche la correction. Tolérance : ±0,05 h et ±0,05 point. La virgule et le point sont acceptés.

Le dépannage provisoire ne supprime pas la défaillance. Un curatif différé le samedi (pièce en stock, hors ouverture) l'évite. Sinon la panne revient le lundi.

En fin de partie : score sur 100, étoiles à 60 / 75 / 90, note sur 20 = score ÷ 5 arrondie au demi-point. Export CSV pour le professeur (séparateur `;`). La partie en cours est reprise via le navigateur (`localStorage`) après un rafraîchissement.

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

`usine.json` prime sur le GDD lorsqu'ils diffèrent. Les valeurs de game design absentes du fichier (8 tours, 2 techniciens, budget affiché de 15 000 €, poids du score) restent celles du GDD, provisoires, et sont regroupées dans `src/sim/niveau1.ts`.

- **Do saisi par l'élève.** La consigne du prototype demande MTBF, MTTR et Do (disponibilité opérationnelle). Dans le cadrage métier, cette disponibilité est l'**Ao** : `(Tr − ΣTA) / Tr`. Ce n'est pas le Do du TRS (`Tf / Tr`, 75 % sur l'exercice de 10 semaines). L'aide de l'écran le dit. Les tests vérifient les deux nombres et ne les confondent pas. Le MDT n'est pas saisi ; il est cité dans la correction quand le MTTR est confondu avec lui.
- **REM-M3** (motoréducteur) n'est pas joué au niveau 1.
- **Générateur.** Le GDD impose mulberry32. L'historique simulé de l'expert a été produit avec le PCG64 de NumPy : une même graine ne rejoue pas ce fichier bit à bit. Les indicateurs calculés sur un historique donné, eux, collent à `reference/scripts/resultats.json`.
- **Attente si la pièce est en stock : 0,25 h**, comme le GDD et `donnees.py`. Dans l'historique d'exercice construit à la main, certaines pannes stockées ont une attente de 0 h (EX-0004, EX-0016). Le recalcul des coûts reprend l'attente écrite dans l'historique ; le jeu, lui, applique 0,25 h.
- **Quantité et rebuts.** `usine.json` ne dit pas combien de pièces ni de rebuts par panne. Le jeu suit l'exercice et `donnees.py` : 2 kits P-REM-01 et 1 200 rebuts pour une fuite de joint ; 1 sonde et 600 rebuts pour REM-M2. Le dépannage provisoire, absent des données, coûte 0,5 h + 0,25 h et 200 rebuts, et tient jusqu'au samedi.
- **Préventif.** Le forfait `cout_eur` (1 000 €) est facturé tel quel. Avec les données actuelles il est égal au kit (600 €) plus 8 h × 50 €. Un test casse si ce lien change.
- **Score.** Poids du niveau 1 : disponibilité 50 (les 30 de l'Ao plus les 20 du TRS, réaffectés comme le dit le GDD), coût 25, justesse 25. La courbe de disponibilité vaut 0 à 70 %, 40 à l'objectif de 92 %, 50 à partir de 98 %. Le coût vaut 25 points s'il ne dépasse pas la politique de référence (curatif interne, express seulement en rupture, commandes standard jusqu'au stock mini), et 0 s'il atteint le double. Le budget de 15 000 € est affiché et n'est pas un plafond de note : une seule attente de sonde dépasse déjà ce montant via les 1 200 €/h d'arrêt.
- **Sous-traitance.** L'attente est le maximum entre le délai de pièce et les 4 h d'arrivée. Avec deux techniciens et une seule machine, l'interne est en général plus court et moins cher. Les deux options restent chiffrées avant confirmation.
- **Hors de ce prototype.** Serveur, deux tentatives notées, classement, événements spéciaux, ligne complète, TRS. L'export CSV tient lieu de secours professeur.

## Publication

Le workflow `.github/workflows/pages.yml` construit le site et le publie avec `actions/deploy-pages` à chaque push sur `main`, ou à la main (`workflow_dispatch`). Dans les réglages du dépôt, la source GitHub Pages doit être « GitHub Actions ». Le site est alors servi sous `/jeu-maintenance-bts/`.
