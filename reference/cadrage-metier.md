# Cadrage métier — Serious game « Chef du service maintenance »

**BTS Maintenance des systèmes (MS), 1re et 2e année** · Lycée Antonin Artaud, Marseille · S. Roddier
Rédigé par l'Expert méthodes maintenance de l'équipe projet, le 21/11/2026. Version 1.0.

> **Statut des données.** L'usine « Boissons des Calanques », sa ligne L1, ses équipements, ses historiques et ses coûts sont **fictifs**. Ils ont été construits pour être réalistes (ordres de grandeur de l'agroalimentaire) et pour que **les calculs tombent juste à la calculatrice**. Tous les résultats chiffrés de ce document ont été recalculés en Python, avec une assertion d'exactitude pour chacun (scripts fournis).

**Fichiers livrés** (dossier `jeu-maintenance/`) :

| Fichier | Contenu |
|---|---|
| `cadrage-metier.md` | ce document |
| `usine.json` | usine, organisation, grille de coûts, pièces, 6 équipements et 13 modes de défaillance (paramètres de fiabilité) |
| `historique_pannes.csv` (+ `.json`) | **historique d'EXERCICE** : 10 semaines, construit à la main, déterministe, sommes rondes (28 lignes : 24 pannes + 4 interventions hors temps d'ouverture) |
| `historique_pannes_simule.csv` (+ `.json`) | **historique SIMULÉ pour le moteur de jeu** : 50 semaines, graine fixe 2026 (131 interventions). À ne pas utiliser pour les exercices notés |
| `schema_equipement.json`, `schema_historique.json` | schémas JSON (draft 2020-12) ; `usine.json` et les deux historiques sont validés |
| `scripts/donnees.py`, `scripts/schemas.py`, `scripts/calculs.py` | génération, validation, corrigés avec assertions (`scripts/resultats.json`) |

**Sommaire** : 1. Référentiel · 2. Progression en 6 niveaux · 3. L'usine fictive · 4. Les historiques · 5. Formules et terminologie · 6. Corrigés complets · 7. Arrondis et tolérances pour la notation · 8. Proposition de schéma JSON · 9. Points incertains · Annexes.

---

## 1. Référentiel BTS MS en vigueur (vérifié)

**Texte de référence** : arrêté du 24 janvier 2022 portant définition du BTS « Maintenance des systèmes » (options A systèmes de production, B systèmes énergétiques et fluidiques, C systèmes éoliens, D systèmes ascenseurs et élévateurs), JO n° 40 du 17/02/2022, **modifié par l'arrêté du 24 juin 2025**. L'annexe II b (référentiel de compétences) est en vigueur dans sa version du 01/01/2026 (Légifrance, consulté le 21/11/2026). Première session sous ce référentiel : 2024.

> ⚠️ Le référentiel de **2014** (codes C11 « Diagnostiquer les pannes », C21 « Analyser la fiabilité, la maintenabilité et la sécurité », C31 « Organiser la stratégie et la logistique de maintenance », etc.) a été **remplacé** par celui de 2022. Ses codes réutilisent les mêmes numéros avec d'autres intitulés : ne pas les mélanger. Ce document cite **uniquement les codes 2022**.

| Bloc (unité) | Code | Intitulé exact |
|---|---|---|
| Bloc 1 — Maintenance corrective (U5) | C11 | Appliquer le plan d'une démarche d'investigation |
| | C12 | Rétablir la fonction d'un bien |
| | C13 | Mettre en service et/ou à l'arrêt un bien |
| Bloc 2 — Maintenance préventive (U6) | C21 | Analyser les risques |
| | C22 | Mettre en œuvre les mesures de prévention adaptées |
| | C23 | Réaliser des opérations de maintenance préventive |
| | C24 | Communiquer par l'écrit |
| Bloc 3 — Maintenance améliorative (U7) | C31 | Définir des solutions d'amélioration |
| | C32 | Réaliser des travaux |
| | C33 | Communiquer oralement |
| Bloc 4 — Intégration d'un bien (U8) | C41 | Appréhender l'organisation fonctionnelle, structurelle et temporelle d'un bien |
| | C42 | Caractériser la chaîne de puissance et d'information |
| Bloc 5 — Organisation de la maintenance (U9) | C51 | Analyser les indicateurs de maintenance |
| | C52 | Définir l'organisation d'une activité |
| | C53 | Organiser l'activité de maintenance |

**Tâches du référentiel d'activités** utiles au jeu : T1-1 Diagnostiquer les pannes ; T1-2 Préparer les interventions ; T1-3 Effectuer les actions correctives ; T1-4 Remettre en service ; T2-1 Mettre en œuvre le plan de maintenance préventive ; T2-2 Exploiter les informations recueillies ; T2-3 Assurer la communication interne et externe du service maintenance ; T3-1 Proposer ou définir des axes d'amélioration ; T5-1 Définir la stratégie de maintenance ; T5-2 Mettre en place et/ou optimiser l'organisation des activités de maintenance ; T5-3 Définir et/ou planifier la maintenance.

**Savoirs associés** (intitulés de l'arrêté) : S9 Stratégie et organisation de la maintenance — S9.1 La fonction maintenance ; S9.2 Paramètres de la compétitivité du bien ; S9.3 Outils d'analyse de défaillance ; S9.4 Maintenance corrective ; S9.5 Maintenance préventive ; S9.6 Organisation et logistique de la maintenance ; S9.7 Externalisation des travaux ; S9.8 Qualité. Aussi S5.2 Approche fonctionnelle et temporelle, S7.5 Contrôle de la sûreté de fonctionnement, S3 Mathématiques.

**Critères d'évaluation de C51 (texte de l'arrêté)**, au cœur du jeu : « L'historique de maintenance est exploité, les données extraites sont triées et permettent la détermination des indicateurs ; la valeur de l'indicateur de disponibilité est déterminée ; la valeur de l'indicateur de fiabilité est déterminée ; la valeur de l'indicateur de maintenabilité est déterminée ; les différents coûts sont rigoureusement déterminés ; les sous-ensembles, les composants les plus pénalisants sont listés, hiérarchisés ; les propositions sont cohérentes par rapport aux indicateurs. »

> **Limite.** Le référentiel ne répartit pas les savoirs entre 1re et 2e année. La répartition ci-dessous est une **proposition pédagogique**. Le détail et les limites des savoirs S9 sont renvoyés par l'arrêté au guide d'accompagnement « Repères pour la formation du BTS MS », que je n'ai pas consulté : à vérifier par Steph (en particulier si Weibull et la période optimale y sont attendus et à quel niveau).

---

## 2. Progression en 6 niveaux

Alignée sur la boucle du GDD (1 tour = 1 semaine = 80 h d'ouverture ; phases Planifier / Événements / Intervenir / Bilan) et sur sa trame de niveaux 1 à 5. J'ajoute un **niveau 6 de synthèse**, pensé pour l'évaluation notée.

| Niv. | Titre | Année | Notions principales | Compétences (codes 2022) |
|---|---|---|---|---|
| 1 | Premier poste : la remplisseuse tombe en panne | 1re | correctif immédiat/différé, palliatif/curatif, TBF, TA, MTBF, MTTR, MDT | C11, C12, C13, C24, C51 |
| 2 | La ligne et son goulot | 1re | cadences, goulot, Ai/Ao, disponibilité d'une ligne en série, TRS = Do × Tp × Tq, coût d'arrêt | C41, C51 |
| 3 | Anticiper l'usure | 1re → 2e | lois exponentielle et Weibull, R(t), λ(t), MTBF de Weibull, préventif systématique / conditionnel / prévisionnel, stock mini | C21, C22, C23, C52 |
| 4 | Où agir d'abord ? | 2e | Pareto (N, temps d'arrêt, coûts), ABC du stock, ajustement de Weibull, choix de politique selon β | C51, C52 |
| 5 | Optimiser et maîtriser les risques | 2e | période optimale (2 modèles : réparation minimale, remplacement selon l'âge), AMDEC (C = F × G × D), coût global | C31, C51, C52, C53 |
| 6 | Bilan annuel du service | 2e | TRS/TRG/TRE, coûts directs et indirects, budget, compte rendu et soutenance | C24, C33, C51, C53 |

### Niveau 1 — Premier poste : la remplisseuse tombe en panne (1re année)
- **Objectifs** : distinguer une action **palliative** (dépannage, réparation provisoire) d'une action **curative** (réparation durable), et un correctif **immédiat** d'un correctif **différé**. Lire un historique GMAO, séparer temps de bon fonctionnement (TBF) et temps d'arrêt (TA), et calculer MTBF, MTTR et MDT.
- **Mécanique de jeu côté métier** : 1 machine (la remplisseuse, goulot), 2 techniciens. Le préventif « joints toutes les 4 semaines » est **imposé et non modifiable**. À chaque panne, le joueur choisit dépannage provisoire (rapide, la panne revient) ou réparation (plus long, durable). Le dépannage suit la règle du § 3.2 : réparation active = 40 % de celle du mode arrondie au ¼ h, sans pièce, et réapparition après 40 h d'ouverture sauf curatif différé le samedi. Il choisit aussi interne ou sous-traitance, et attente ou commande express de la pièce. En phase Bilan, il saisit MTBF, MTTR et MDT.
- **Compétences** : C11 (hypothèses de panne : choix guidé du sous-ensemble défaillant), C12 et C13 (rétablir, remettre en service), C24 (bon de travail renseigné dans la GMAO), C51 (indicateurs de fiabilité et de maintenabilité).
- **Critères d'évaluation** : indicateurs justes (tolérances, § 7) ; décomposition correcte du TA (détection, attente, réparation, remise en service) ; BT complet ; pas de dépannage provisoire laissé sans correctif différé.
- **Objectif chiffré / passage** : Ao de la remplisseuse ≥ 92 % sur la partie ; ≥ 2★ et ≥ 70 % de calculs justes (règle du GDD).

### Niveau 2 — La ligne et son goulot (1re année)
- **Objectifs** : identifier le **goulot** à partir des cadences nominales ; calculer Ai et Ao par machine, puis la disponibilité d'une ligne en série ; calculer le TRS (NF E60-182) ; chiffrer un coût d'arrêt.
- **Mécanique** : la ligne complète de 6 équipements, **en série sans accumulation** : tout arrêt arrête la ligne et coûte 1 200 €/h. Le joueur répartit 2 à 3 techniciens et découvre que les petites pannes fréquentes de l'étiqueteuse pèsent autant que les grosses pannes de la remplisseuse.
- **Compétences** : C41 (organisation fonctionnelle et structurelle de la ligne, modes de marche), C51.
- **Critères** : goulot identifié et justifié ; Ao, Ai et TRS justes ; l'élève explique l'écart entre Ai et Ao (logistique) et entre Do (TRS) et Ao (changements de format, arrêts induits).
- **Passage** : TRS de la ligne ≥ 65 % ; goulot correctement identifié du premier coup.

### Niveau 3 — Anticiper l'usure (fin de 1re ou début de 2e année)
- **Objectifs** : associer un mode de défaillance à une loi (β < 1 jeunesse, β = 1 aléatoire, β > 1 usure) ; calculer R(t), F(t), λ(t) et un MTBF de Weibull avec Γ donné ; choisir entre préventif **systématique**, **conditionnel** et **prévisionnel** ; calculer un stock mini (point de commande).
- **Mécanique** : le joueur peut programmer des remplacements systématiques (au tour), poser une **ronde de mesure** (vibrations du motoréducteur de la remplisseuse, allongement de la chaîne des convoyeurs) et fixer des seuils, et régler le stock mini de chaque pièce. Les accumulations entre machines deviennent actives (option du moteur : arrêts de moins de 10 min absorbés hors goulot).
- **Compétences** : C23 (opérations préventives, mesures exploitables), C21 et C22 (consignation avant intervention : question de sécurité à chaque BT préventif), C52 (type d'activité arrêté et justifié, pièces à tenir en stock).
- **Critères** : calculs de fiabilité justes ; politique cohérente avec β (pas de systématique sur β ≤ 1) ; seuils conditionnels compatibles avec l'intervalle P-F.
- **Passage** : Ao du goulot ≥ 93 % ; aucune rupture sur une pièce de classe A.

### Niveau 4 — Où agir d'abord ? (2e année)
- **Objectifs** : construire un Pareto (en nombre, en temps d'arrêt, en coût) et un classement ABC ; ajuster une loi de Weibull (papier d'Allan Plait ou régression à la calculatrice) ; en déduire la politique de maintenance par mode.
- **Mécanique** : GMAO complète ; en début de partie, le jeu fournit un historique et demande de classer machines et pièces. La justesse des classes A/B/C débloque des budgets d'amélioration.
- **Compétences** : C51 (« sous-ensembles et composants les plus pénalisants listés, hiérarchisés »), C52 (« choix des pièces de rechange à tenir en stock justifié »).
- **Critères** : classes exactes ; β et η dans la tolérance de lecture ; décision cohérente avec β.
- **Passage** : coût indirect des arrêts réduit d'au moins 20 % par rapport à la partie de référence « tout correctif ».

### Niveau 5 — Optimiser et maîtriser les risques (2e année)
- **Objectifs** : calculer une **période optimale** de remplacement préventif avec **les deux modèles** (réparation minimale : joints de la remplisseuse, T* = 150 h par formule ; remplacement selon l'âge : têtes de la boucheuse, tableau de C(T) sur 6 valeurs de T, minimum à 240 h), et savoir choisir le modèle selon l'effet de la réparation ; mener une **AMDEC** sur la remplisseuse (C = F × G × D), hiérarchiser et proposer des actions qui font baisser F, G ou D ; raisonner en **coût global**.
- **Mécanique** : le joueur règle la période de remplacement des joints de vannes (modèle A) et des têtes de vissage (modèle B, en tours), et voit la courbe du coût par heure comparée à la ligne « tout correctif » Cc/MTBF ; il cote 4 modes AMDEC et choisit des améliorations (contrôleur pondéral en ligne, capteur de vibration, etc.) avec leur coût et leur effet sur F, G ou D.
- **Compétences** : C31 (« le besoin est analysé, les données technico-économiques sont repérées ; le choix de la solution est pertinent et argumenté »), C51, C52, C53 (planification).
- **Critères** : T* (modèle A) et tableau de C(T) (modèle B) justes, avec le bon modèle choisi ; criticités justes ; actions qui ciblent les modes au-dessus du seuil ; coût global en baisse.
- **Passage** : coût global ≤ 90 % de la partie de référence ; ≥ 2★.

### Niveau 6 — Bilan annuel du service (2e année, synthèse notée)
- **Objectifs** : sur l'historique simulé d'un an, produire le bilan : indicateurs par machine, TRS/TRG/TRE, coûts directs et indirects, plan d'actions pour l'année suivante.
- **Mécanique** : partie longue (12 tours) avec tous les leviers, événements spéciaux actifs ; export du bilan (écrit) et présentation de 5 min (oral, hors jeu).
- **Compétences** : C24 (écrit), C33 (oral), C51, C53.
- **Critères** : critères C51 de l'arrêté (cités au § 1) ; cohérence des propositions avec les indicateurs ; respect du budget.
- **Passage** : fin de parcours ; note = meilleure de 2 tentatives (décision de Steph, GDD v0.1).

---

## 3. L'usine fictive : Boissons des Calanques, ligne L1

**Produit** : Boisson plate aux fruits, bouteille PET 1 L. **Horaires** : 2 postes × 8 h, du lundi au vendredi (lundi-vendredi 05:00-21:00), soit **80 h d'ouverture par semaine** (= 1 tour du jeu). Toutes les durées sont comptées en **heures d'ouverture** : une attente de pièce qui passe la nuit ne compte que les heures ouvrées.

**Flux** : Souffleuse → Convoyeurs → **Remplisseuse** → Boucheuse → Étiqueteuse → Convoyeurs → Fardeleuse.

### 3.1 Cadences et goulot

| Équipement | Cadence nominale (bouteilles/h) | Remarque |
|---|---|---|
| Souffleuse | 11 000 |  |
| Convoyeurs | 15 000 |  |
| Remplisseuse | 10 000 | **GOULOT** (cadence la plus faible) |
| Boucheuse | 11 500 |  |
| Étiqueteuse | 12 000 |  |
| Fardeleuse | 13 000 |  |

La cadence de la ligne est imposée par la **remplisseuse à 10 000 bouteilles/h**. Les autres machines sont volontairement surdimensionnées de 10 à 50 % (« courbe en V » classique des lignes d'embouteillage). L'écart de 1 000 bouteilles/h avec la machine suivante (souffleuse) rend le goulot immédiatement identifiable. Une heure de ligne perdue = 10 000 bouteilles × 0,12 € de marge sur coût variable = **1 200 €/h**.

### 3.2 Équipements, sous-ensembles et modes de défaillance

Le temps t des lois est le **temps de fonctionnement** du mode (âge). « Renouvellement » : après la réparation, le composant est remis à neuf (âge = 0). « Réparation minimale » : on répare une seule vanne sur 24 et l'ensemble garde son âge (voir § 5.6).

| Mode | Équipement / sous-ensemble | Défaillance | Loi | β | η (h) | γ (h) | MTBF théorique (h) | Effet du correctif | MTTR actif (h) | Pièce (prix) | Détection |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SOU-M1 | Souffleuse / SOU-FOUR | Claquage de lampe infrarouge | exponentielle (λ = 1/400 h⁻¹) | 1 | 400 | 0 | 400 | renouvellement | 1,5 | P-SOU-01 (60 €) | automatique (pyromètre) |
| SOU-M2 | Souffleuse / SOU-SOUF | Fuite / blocage de vanne haute pression | Weibull | 2 | 800 | 0 | 709 | renouvellement | 2,5 | P-SOU-02 (1 200 €) | opérateur (bouteilles mal formées) |
| CON-M1 | Convoyeurs / CON-CMD | Défaut de jeunesse après rénovation (variateur, carte E/S, paramétrage) | Weibull | 0,5 | 100 | 0 | 200 | renouvellement | 0,5 | P-CON-01 (450 €), P-CON-02 (600 €) | automatique (défaut variateur / défaut bus E/S) |
| CON-M2 | Convoyeurs / CON-MEC | Usure / allongement de chaîne | Weibull | 2 | 2 000 | 0 | 1 772,5 | renouvellement | 2 | P-CON-03 (200 €) | ronde (mesure d'allongement) |
| REM-M1 | Remplisseuse / REM-VAN | Fuite de joint de vanne (sous-remplissage) | Weibull | 3 | 300 | 0 | 267,9 | reparation minimale | 2,5 | P-REM-01 (25 €) | opérateur (fuite visible ; pas de contrôleur pondéral en ligne) |
| REM-M2 | Remplisseuse / REM-MES | Dérive / panne de sonde de niveau | exponentielle (λ = 1/600 h⁻¹) | 1 | 600 | 0 | 600 | renouvellement | 3 | P-REM-03 (450 €) | contrôle qualité (niveaux hors tolérance) |
| REM-M3 | Remplisseuse / REM-ENT | Défaillance du motoréducteur du carrousel | Weibull | 2 | 4 000 | 0 | 3 544,9 | renouvellement | 22 | P-REM-04 (5 750 €) | bruit / vibration (ronde) |
| BOU-M1 | Boucheuse / BOU-TET | Usure d'embrayage de tête de vissage (couple hors tolérance) | Weibull | 2 | 500 | 0 | 443,1 | renouvellement | 2 | P-BOU-01 (900 €) | contrôle de couple |
| BOU-M2 | Boucheuse / BOU-ALI | Bourrage de l'alimentation bouchons | exponentielle (λ = 1/1 000 h⁻¹) | 1 | 1 000 | 0 | 1 000 | renouvellement | 1 | — | automatique (détecteur de bourrage) |
| ETI-M1 | Étiqueteuse / ETI-DET | Défaut de cellule de détection d'étiquette | exponentielle (λ = 1/100 h⁻¹) | 1 | 100 | 0 | 100 | renouvellement | 0,75 | P-ETI-01 (180 €) | automatique (défaut machine) |
| ETI-M2 | Étiqueteuse / ETI-POS | Usure de la brosse de pose | Weibull | 2 | 1 000 | 0 | 886,2 | renouvellement | 1,5 | P-ETI-02 (120 €) | opérateur (étiquette mal posée) |
| FAR-M1 | Fardeleuse / FAR-FOUR | Rupture de résistance du four | exponentielle (λ = 1/1 000 h⁻¹) | 1 | 1 000 | 0 | 1 000 | renouvellement | 1,5 | P-FAR-01 (250 €) | automatique (température) |
| FAR-M2 | Fardeleuse / FAR-FILM | Émoussement de la lame de coupe | Weibull | 3 | 400 | 100 | 457,2 | renouvellement | 0,5 | P-FAR-02 (150 €) | opérateur (film mal coupé) |

Sous-ensembles : **Souffleuse** : SOU-FOUR Four de préchauffe infrarouge, SOU-SOUF Postes de soufflage (moules, vannes HP), SOU-TRF Transferts et roues étoiles ; **Convoyeurs** : CON-CMD Commande (automate, variateurs) — rénovée récemment, CON-MEC Chaînes et guides ; **Remplisseuse** : REM-VAN Vannes de remplissage (24), REM-MES Mesure de niveau / débitmètres, REM-ENT Entraînement du carrousel, REM-CUV Cuve produit et circuit NEP ; **Boucheuse** : BOU-TET Têtes de vissage, BOU-ALI Alimentation et orientation des bouchons ; **Étiqueteuse** : ETI-DET Détection et synchronisation, ETI-POS Groupe de pose (brosses, rouleau) ; **Fardeleuse** : FAR-FOUR Four de rétraction, FAR-FILM Dérouleur et coupe du film.

**Pourquoi ce mélange de β (justification pédagogique)** :
- **β < 1 (CON-M1, β = 0,5)** : convoyeurs rénovés récemment, défauts de jeunesse (paramétrage, carte E/S, variateur). Le taux de défaillance **décroît** : un remplacement systématique **remettrait une pièce neuve, donc plus fragile**. La bonne réponse est un **rodage surveillé** et une **amélioration** (C31 : fiabiliser le paramétrage), pas du systématique.
- **β = 1 (SOU-M1, REM-M2, BOU-M2, ETI-M1, FAR-M1)** : pannes aléatoires (électronique, lampes, bourrages). Le taux est **constant** : changer une pièce qui fonctionne ne réduit pas le risque. La bonne réponse est le **correctif bien organisé** (pièce en stock, détection rapide) ou le **conditionnel** si un signe avant-coureur existe.
- **β = 2 ou 3 (SOU-M2, REM-M1, REM-M3, BOU-M1, ETI-M2, FAR-M2, CON-M2)** : usure. Le **préventif systématique** devient rentable si Cp ≪ Cc (§ 6.8). Le **conditionnel** est préféré quand une grandeur mesurable annonce la panne (vibrations du motoréducteur REM-M3, allongement de chaîne CON-M2).
- **γ > 0 (FAR-M2, γ = 100 h)** : une lame neuve ne s'émousse pas avant 100 h de coupe (durée sans défaillance).

#### Dépannage provisoire (action palliative) : règle du jeu

Chaque mode porte un objet `depannage_provisoire` dans `usine.json`. Règle validée :
- **Durée de réparation active** = 40 % de la réparation active du mode (`mttr_actif_h`), **arrondie au ¼ h le plus proche**, avec un minimum de 0,25 h. Cette valeur est calculée une fois puis **figée** dans `duree_reparation_active_h`. La détection, l'attente logistique et la remise en service ne changent pas.
- **Aucune pièce** n'est consommée (`pieces = []`).
- **Pas de remise à neuf** : la panne **revient après 40 h d'ouverture** (`reapparition_apres_h`). Elle ne revient pas si la **réparation curative différée** est faite le samedi, hors temps d'ouverture et donc sans perte de production (`annule_par_curatif_differe = true`). Conséquence pour le joueur : un dépannage n'évite une nouvelle panne que s'il a lieu dans les 40 dernières heures d'ouverture de la semaine (2 jours d'ouverture sur 5). Plus tôt dans la semaine, il faut un curatif à chaud ou accepter la rechute.
- **Convention de comptage** : Une rechute après dépannage provisoire compte comme une nouvelle défaillance. C'est un nouvel événement de l'historique : N + 1, son TA s'ajoute à ΣTA et sa réparation active entre dans le MTTR. Son TBF est le temps de bon fonctionnement depuis la fin du dépannage, soit 40 h. Le dépannage provisoire lui-même est un événement à part entière, avec son TA et sa réparation active figée. Le curatif différé fait le samedi est hors temps d'ouverture : il ne compte ni dans N, ni dans ΣTA, ni dans le MTTR, mais ses coûts directs (pièces et main-d'œuvre en heures sup) comptent.
- *Justification pédagogique* : la machine a de nouveau perdu sa fonction requise (défaillance au sens de la NF EN 13306). Faire apparaître la rechute dans N et ΣTA, c'est montrer le vrai coût du palliatif sur le MTBF et l'Ao.

| Mode | Réparation active du mode (h) | 0,4 × MTTR (h) | **Dépannage figé (h)** | Autorisé |
|---|---|---|---|---|
| SOU-M1 | 1,5 | 0,6 | **0,5** | oui |
| SOU-M2 | 2,5 | 1 | **1** | oui |
| CON-M1 | 0,5 | 0,2 | **0,25** | oui |
| CON-M2 | 2 | 0,8 | **0,75** | oui |
| REM-M1 | 2,5 | 1 | **1** | oui |
| REM-M2 | 3 | 1,2 | **1,25** | oui |
| REM-M3 | 22 | 8,8 | **8,75** | non |
| BOU-M1 | 2 | 0,8 | **0,75** | oui |
| BOU-M2 | 1 | 0,4 | **0,5** | oui |
| ETI-M1 | 0,75 | 0,3 | **0,25** | oui |
| ETI-M2 | 1,5 | 0,6 | **0,5** | oui |
| FAR-M1 | 1,5 | 0,6 | **0,5** | non |
| FAR-M2 | 0,5 | 0,2 | **0,25** | oui |

**Modes sans palliatif (`autorise = false`)**, une ligne de justification chacun :
- **REM-M3** : Motoréducteur rompu : aucune action provisoire ne rétablit l'entraînement du carrousel, seul le remplacement le fait.
- **FAR-M1** : Résistance coupée : on ne la « dépanne » pas, et shunter ou neutraliser une protection du four serait dangereux. Seul le remplacement convient.

Le palliatif est **autorisé sur BOU-M2** (bourrage de la boucheuse), avec la règle standard (0,5 h, sans pièce, réapparition après 40 h) : c'est **la décision de Steph**.

Arrondi : au ¼ h le plus proche, une valeur à mi-chemin étant arrondie vers le haut (aucun mode n'est dans ce cas). Exemple : ETI-M1, 0,4 × 0,75 = 0,30 h → **0,25 h**. Contrôle automatique dans `scripts/schemas.py`.

### 3.3 Grille de coûts (définitive pour le jeu)

| Poste | Valeur | Justification |
|---|---|---|
| Main-d'œuvre interne | **40 €/h** | coût horaire chargé d'un technicien de maintenance (ordre de grandeur courant) ; nombre rond |
| Heures supplémentaires, samedi | **50 €/h** | + 25 % |
| Sous-traitance | **90 €/h + 150 € de déplacement**, arrivée en 4 h | valeurs du GDD conservées |
| Pièce en express | **+ 50 %**, livrée en 16 h d'ouverture (1 jour) | GDD |
| Pièce standard | délai 2 semaines (2 tours) | GDD |
| Possession du stock | 20 %/an de la valeur, soit 0,4 %/semaine (sur 50 semaines) | GDD |
| **Pénalité d'arrêt** | **1 200 €/h pour tout arrêt de la ligne** (niveaux 1–2 : ligne en série sans accumulation) | 10 000 b/h × 0,12 € de marge |
| Pénalité avec accumulations (niveaux ≥ 3, option) | goulot : 1 200 €/h ; autres machines : arrêts de moins de 10 min absorbés, au-delà 1 200 €/h | aligné sur le GDD v0.1 (tables tampons 10 min) |
| Rebut | **0,20 € par bouteille** (préforme, bouchon, étiquette, produit) | le « 5 € par pièce » du GDD v0 est irréaliste pour une bouteille d'1 L |

**Pièces de rechange** (prix HT fictifs, réalistes) :

| Réf. | Désignation | Prix unitaire (€) | Stock initial | Stock mini |
|---|---|---|---|---|
| P-SOU-01 | Lampe infrarouge four de préchauffe 1,5 kW | 60 | 6 | 2 |
| P-SOU-02 | Vanne haute pression de soufflage 40 bar | 1 200 | 1 | 1 |
| P-REM-01 | Kit joints pour 1 vanne de remplissage | 25 | 10 | 4 |
| P-REM-02 | Kit joints complet 24 vannes de remplissage | 600 | 1 | 1 |
| P-REM-03 | Sonde de niveau / débitmètre de vanne | 450 | 0 | 1 |
| P-REM-04 | Motoréducteur d'entraînement du carrousel | 5 750 | 0 | 0 |
| P-BOU-01 | Tête de vissage à embrayage magnétique | 900 | 1 | 1 |
| P-ETI-01 | Cellule photoélectrique de détection d'étiquette | 180 | 2 | 1 |
| P-ETI-02 | Brosse de pose d'étiquette | 120 | 2 | 1 |
| P-FAR-01 | Résistance du four de rétraction | 250 | 1 | 1 |
| P-FAR-02 | Lame de coupe du film | 150 | 2 | 1 |
| P-CON-01 | Variateur de vitesse 1,5 kW | 450 | 1 | 1 |
| P-CON-02 | Carte d'entrées/sorties déportée automate | 600 | 1 | 1 |
| P-CON-03 | Chaîne à palettes inox (lot de 1 m) | 200 | 2 | 1 |

**Politique initiale (situation de départ)** : remplacement systématique du kit complet de joints des 24 vannes (P-REM-02) **toutes les 4 semaines**, le samedi, hors temps d'ouverture : 7,5 h + 0,5 h de remise en service, 1 technicien en heures supplémentaires. Coût = 600 + 8 × 50 = **1 000 €**, sans perte de production. Tout le reste est en correctif.

---

## 4. Les historiques

### 4.1 Historique d'EXERCICE (`historique_pannes.csv`) — déterministe, construit à la main

Période : 10 semaines, du lundi 05/01/2026 au vendredi 13/03/2026 (fictif). **Temps requis de chaque machine Tr = 800 h**. Aucune panne n'en chevauche une autre (vérifié par script) : la ligne ne subit qu'une panne à la fois. Les 4 interventions **hors temps d'ouverture** (le samedi) ne réduisent pas le temps requis. Heures au format local (UTC+1).

| N° | Début d'arrêt | Machine | Mode | Type | Action | Détection | Attente | Réparation | Remise en service | **TA** | TBF précédent | Pièces | Coût direct (€) | Coût indirect (€) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| EX-0001 | 05/01 15:00 | CON | CON-M1 | correctif immédiat | réglage | 0,25 | 0 | 0,25 | 0,25 | **0,75** | 10 | — | 20 | 900 |
| EX-0002 | 06/01 19:00 | ETI | ETI-M1 | correctif immédiat | dépannage (provisoire) | 0,5 | 1,5 | 0,5 | 0,5 | **3** | 30 | — | 40 | 3 600 |
| EX-0003 | 08/01 17:00 | SOU | SOU-M1 | correctif immédiat | remplacement | 0,5 | 0,5 | 1,5 | 0,5 | **3** | 60 | P-SOU-01×1 | 140 | 3 600 |
| EX-0201 | 10/01 08:00 | ETI | ETI-M1 | correctif différé (hors ouverture) | remplacement | 0 | 0 | 0,5 | 0,5 | **1** | — | P-ETI-01×1 | 230 | 0 |
| EX-0004 | 13/01 09:00 | REM | REM-M1 | correctif immédiat | remplacement | 0,25 | 0 | 2,5 | 0,25 | **3** | 100 | P-REM-01×2 | 160 | 3 840 |
| EX-0005 | 15/01 07:00 | BOU | BOU-M1 | correctif immédiat | remplacement | 0,5 | 1 | 2 | 0,5 | **4** | 130 | P-BOU-01×1 | 1 000 | 4 800 |
| EX-0006 | 16/01 11:00 | ETI | ETI-M1 | correctif immédiat | remplacement | 0,5 | 3 | 1 | 0,5 | **5** | 117 | P-ETI-01×1 | 240 | 6 000 |
| EX-0007 | 21/01 13:00 | REM | REM-M2 | correctif immédiat | remplacement | 0,5 | 16 | 3 | 0,5 | **20** | 97 | P-REM-03×1 | 590 | 24 120 |
| EX-0008 | 23/01 11:00 | CON | CON-M1 | correctif immédiat | remplacement | 0,25 | 0 | 0,5 | 0,25 | **1** | 219,25 | P-CON-02×1 | 630 | 1 200 |
| EX-0009 | 27/01 09:00 | ETI | ETI-M2 | correctif immédiat | remplacement | 0,5 | 3,5 | 1,5 | 0,5 | **6** | 105 | P-ETI-02×1 | 200 | 7 200 |
| EX-0010 | 29/01 17:00 | SOU | SOU-M2 | correctif immédiat | remplacement | 0,5 | 1,5 | 2,5 | 0,5 | **5** | 237 | P-SOU-02×1 | 1 320 | 6 000 |
| EX-0101 | 31/01 06:00 | REM | REM-M1 | préventif systématique (hors ouverture) | remplacement | 0 | 0 | 7,5 | 0,5 | **8** | — | P-REM-02×1 | 1 000 | 0 |
| EX-0011 | 03/02 09:00 | ETI | ETI-M1 | correctif immédiat | remplacement | 0,5 | 6 | 1 | 0,5 | **8** | 74 | P-ETI-01×1 | 240 | 9 600 |
| EX-0012 | 05/02 17:00 | FAR | FAR-M2 | correctif immédiat | remplacement | 0,25 | 0 | 0,5 | 0,25 | **1** | 380 | P-FAR-02×1 | 180 | 1 200 |
| EX-0013 | 10/02 09:00 | ETI | ETI-M1 | correctif immédiat | dépannage (provisoire) | 0,5 | 2,5 | 0,5 | 0,5 | **4** | 72 | — | 40 | 4 800 |
| EX-0014 | 12/02 17:00 | SOU | SOU-M1 | correctif immédiat | remplacement | 0,5 | 0,5 | 1,5 | 0,5 | **3** | 155 | P-SOU-01×1 | 140 | 3 600 |
| EX-0202 | 14/02 08:00 | ETI | ETI-M1 | correctif différé (hors ouverture) | remplacement | 0 | 0 | 0,5 | 0,5 | **1** | — | P-ETI-01×1 | 230 | 0 |
| EX-0015 | 16/02 05:00 | CON | CON-M1 | correctif immédiat | réglage | 0,25 | 0 | 0,75 | 0,25 | **1,25** | 249 | — | 40 | 1 500 |
| EX-0016 | 17/02 09:00 | REM | REM-M1 | correctif immédiat | remplacement | 0,25 | 0 | 2,5 | 0,25 | **3** | 280 | P-REM-01×2 | 160 | 3 840 |
| EX-0017 | 23/02 05:00 | REM | REM-M3 | correctif immédiat | remplacement | 0,5 | 30 | 22 | 1,5 | **54** | 57 | P-REM-04×1 | 7 630 | 64 920 |
| EX-0018 | 26/02 17:00 | BOU | BOU-M2 | correctif immédiat | nettoyage (bourrage) | 0,5 | 2 | 1 | 0,5 | **4** | 486 | — | 60 | 4 800 |
| EX-0102 | 28/02 06:00 | REM | REM-M1 | préventif systématique (hors ouverture) | remplacement | 0 | 0 | 7,5 | 0,5 | **8** | — | P-REM-02×1 | 1 000 | 0 |
| EX-0019 | 02/03 05:00 | ETI | ETI-M1 | correctif immédiat | remplacement | 0,5 | 5 | 1 | 0,5 | **7** | 216 | P-ETI-01×1 | 240 | 8 400 |
| EX-0020 | 04/03 13:00 | SOU | SOU-M2 | correctif immédiat | remplacement | 0,5 | 1,5 | 2,5 | 0,5 | **5** | 217 | P-SOU-02×1 | 1 320 | 6 000 |
| EX-0021 | 05/03 17:00 | ETI | ETI-M2 | correctif immédiat | remplacement | 0,5 | 6,5 | 1,5 | 0,5 | **9** | 53 | P-ETI-02×1 | 200 | 10 800 |
| EX-0022 | 09/03 15:00 | FAR | FAR-M1 | correctif immédiat | remplacement | 0,5 | 0,5 | 1,5 | 0,5 | **3** | 349 | P-FAR-01×1 | 330 | 3 600 |
| EX-0023 | 11/03 13:00 | ETI | ETI-M1 | correctif immédiat | remplacement | 0,5 | 4 | 1 | 0,5 | **6** | 51 | P-ETI-01×1 | 240 | 7 200 |
| EX-0024 | 13/03 11:00 | CON | CON-M1 | correctif immédiat | réglage | 0,25 | 0 | 0,5 | 0,25 | **1** | 308,75 | — | 30 | 1 200 |

Durées en heures. Pour les interventions hors ouverture, la colonne TA donne la durée de l'intervention, qui n'est **pas** un arrêt de production. « TBF précédent » = temps de bon fonctionnement depuis la fin de l'arrêt précédent de la même machine (ou depuis le début de la période). Pour chaque machine, ΣTBF de la colonne + TBF final jusqu'à 800 h = 800 − ΣTA (vérifié par assertion).

**Sommes rondes par machine** : ΣTA = 80 / 48 / 16 / 8 / 4 / 4 h (REM / ETI / SOU / BOU / FAR / CON), total 160 h ; N = 4 / 8 / 4 / 2 / 2 / 4, total 24 pannes.

### 4.2 Historique SIMULÉ (`historique_pannes_simule.csv`) — pour le moteur de jeu uniquement

50 semaines d'ouverture (année 2025 fictive, fermeture du 04 au 15/08, jours fériés ignorés), soit 4 000 h, **graine 2026** (`numpy.random.default_rng`).
Modèle : chaque mode tire sa prochaine défaillance selon sa loi, et son âge ne progresse que pendant que la machine fonctionne. Les modes en renouvellement repartent à 0 après réparation. REM-M1 est en réparation minimale (processus de Poisson non homogène à loi puissance), avec un renouvellement à chaque préventif des 4 semaines. Réparation active : loi log-normale de moyenne égale au MTTR du mode (σ du logarithme = 0,5, arrondie au ¼ h). Attente : 0,25 h si la pièce est en stock, sinon 16 h (express), selon la probabilité de stock du mode.

**Vérification de cohérence avec les paramètres.**

*a) Moteur validé sur une très longue simulation* (graine 1, 50 000 semaines = 4 000 000 h) : écart entre la moyenne simulée des âges à la défaillance et le MTBF théorique γ + η·Γ(1+1/β), et entre le MTBF équipement simulé et le MTBF théorique (régime établi : 1/MTBF = Σ 1/MTBF_mode). Tolérance des assertions : 3 %.

| Mode | n | Âge moyen à la défaillance simulé (h) | Théorique (h) |
|---|---|---|---|
| SOU-M1 | 9 800 | 400,7 | 400,0 |
| SOU-M2 | 5 522 | 711,2 | 709,0 |
| REM-M2 | 6 349 | 594,7 | 600,0 |
| REM-M3 | 1 040 | 3 629,6 | 3 544,9 |
| BOU-M1 | 8 860 | 445,8 | 443,1 |
| BOU-M2 | 3 936 | 1 003,1 | 1 000,0 |
| ETI-M1 | 38 470 | 100,0 | 100,0 |
| ETI-M2 | 4 401 | 873,7 | 886,2 |
| FAR-M1 | 3 926 | 1 009,0 | 1 000,0 |
| FAR-M2 | 8 719 | 454,4 | 457,2 |
| CON-M1 | 19 564 | 200,6 | 200,0 |
| CON-M2 | 2 257 | 1 737,5 | 1 772,5 |
| REM-M1 (réparation minimale) | 12 807 défaillances | attendu Σ(a_k/η)^β = 12 882,8 sur 12 499 cycles | écart -0,6 % |

| Équipement | MTBF simulé, long terme (h) | MTBF théorique (h) | MTTR simulé (h) |
|---|---|---|---|
| Souffleuse | 256,3 | 255,7 | 1,85 |
| Convoyeurs | 179,8 | 179,7 | 0,66 |
| Remplisseuse | 187,0 | dépend de la période de préventif | 3,66 |
| Boucheuse | 308,7 | 307,1 | 1,69 |
| Étiqueteuse | 89,7 | 89,9 | 0,83 |
| Fardeleuse | 313,3 | 313,7 | 0,81 |

*b) Année de jeu (graine 2026, 4 000 h)* : petits échantillons, donc écarts aléatoires normaux. C'est bien d'en parler en classe : 4 pannes ne suffisent pas pour estimer un MTBF précis.

| Équipement | N pannes | MTBF (h) | MTTR (h) | MDT (h) | Ao (%) |
|---|---|---|---|---|---|
| Souffleuse | 18 | 218,2 | 1,93 | 4,03 | 98,19 |
| Convoyeurs | 20 | 197,1 | 0,94 | 2,90 | 98,55 |
| Remplisseuse | 22 | 171,3 | 3,02 | 10,55 | 94,20 |
| Boucheuse | 11 | 359,5 | 1,59 | 4,14 | 98,86 |
| Étiqueteuse | 36 | 107,3 | 0,77 | 3,79 | 96,59 |
| Fardeleuse | 12 | 331,5 | 0,71 | 1,88 | 99,44 |

Préventifs REM-M1 réalisés dans l'année : 12 ; défaillances REM-M1 : 13 (attendu 12,4). Les MTBF d'exercice (§ 6) sont cohérents avec ces valeurs : par exemple étiqueteuse 94 h contre 89,9 h théoriques, remplisseuse 180 h contre 187 h simulées sur le long terme avec la politique initiale.

---

## 5. Formules et terminologie (NF EN 13306:2018, FD X60-000, NF E60-182, IEC 60812)

### 5.1 Types de maintenance (NF EN 13306)
- **Maintenance préventive** : exécutée avant la défaillance pour réduire sa probabilité ou la dégradation. Elle comprend :
  - la **maintenance préventive systématique** (*predetermined maintenance*) : à intervalles fixes (temps, unités d'usage), sans contrôle préalable de l'état ;
  - la **maintenance conditionnelle** (*condition-based maintenance*) : déclenchée par la surveillance de l'état (mesure, seuil) ;
  - la **maintenance prévisionnelle** (*predictive maintenance*) : conditionnelle avec **extrapolation** de l'évolution de l'état pour prévoir l'intervention.
- **Maintenance corrective** : exécutée après détection d'une panne. Elle peut être **immédiate** (sans délai) ou **différée** (retardée selon des règles données).
- **Palliatif / curatif** : ce vocabulaire vient de l'ancienne norme française NF X60-010, toujours employée en BTS. Dépannage = action **provisoire** (palliatif) ; réparation = action **définitive** (curatif). La NF EN 13306 parle de « réparation » et de « réparation provisoire ». Dans le jeu, le champ `reparation_provisoire` vaut `true` pour un palliatif.
- **FD X60-000** (fascicule de documentation AFNOR, « Maintenance industrielle — Fonction maintenance ») : cadre de la fonction maintenance (organisation, niveaux de maintenance, documentation). Il sert ici pour le vocabulaire d'organisation (niveaux d'intervention et habilitations des techniciens, niveaux 1 à 3 du GDD), pas pour les formules.

### 5.2 Temps et moyennes : conventions retenues et nuances de la norme

| Symbole | Définition retenue dans le jeu | Terme NF EN 13306 / IEC 60050-192 |
|---|---|---|
| TBF | temps de bon fonctionnement entre deux défaillances (h) | *operating time between failures* (OTBF) |
| TA | temps d'arrêt d'une défaillance = détection + attente logistique + réparation active + remise en service | *down time* (pour une défaillance : temps jusqu'au rétablissement) |
| **MTBF** | **ΣTBF / N** = (Tr − ΣTA) / N | ⚠️ = **MOTBF** (*mean operating time between failures*) ≈ **MUT** |
| **MTTR** | **moyenne des durées de réparation active** = Σ(réparation active) / N | ⚠️ = **MRT** (*mean repair time*) dans la 13306 |
| **MDT** | ΣTA / N : temps moyen d'arrêt sur défaillance, attentes comprises | MDT (*mean down time*) ; en correctif ≈ MTTR au sens de la 13306 (*mean time to restoration*) |
| MUT | durée moyenne de disponibilité = MTBF au sens du jeu | MUT (*mean up time*) |
| MTTF | durée moyenne de fonctionnement **avant la (première) défaillance** d'un bien non réparable ou remis à neuf : MTTF = ∫₀^∞ R(t) dt | MTTF (*mean operating time to failure*) |

**Convention de comptage du dépannage provisoire (§ 3.2)** : Une rechute après dépannage provisoire compte comme une nouvelle défaillance. C'est un nouvel événement de l'historique : N + 1, son TA s'ajoute à ΣTA et sa réparation active entre dans le MTTR. Son TBF est le temps de bon fonctionnement depuis la fin du dépannage, soit 40 h. Le dépannage provisoire lui-même est un événement à part entière, avec son TA et sa réparation active figée. Le curatif différé fait le samedi est hors temps d'ouverture : il ne compte ni dans N, ni dans ΣTA, ni dans le MTTR, mais ses coûts directs (pièces et main-d'œuvre en heures sup) comptent.

*Justification pédagogique* : la machine a de nouveau perdu sa fonction requise (défaillance au sens de la NF EN 13306). Faire apparaître la rechute dans N et ΣTA, c'est montrer le vrai coût du palliatif sur le MTBF et l'Ao.

> **Nuances terminologiques importantes** (à afficher dans l'aide du jeu) :
> 1. Dans la NF EN 13306 et l'IEC 60050-192, **MTBF** (*mean time between failures*) désigne la moyenne des temps **entre** défaillances, **arrêts compris**, soit MTBF_norme = MUT + MDT. La moyenne des seuls temps de fonctionnement s'appelle **MOTBF**. L'usage scolaire et industriel français appelle « MTBF » ce que la norme appelle MOTBF. Le jeu garde l'usage BTS (MTBF = ΣTBF/N) et l'écrit dans l'aide.
> 2. Dans la NF EN 13306 et l'IEC 60050-192, **MTTR** signifie *mean time to restoration* (temps moyen **jusqu'au rétablissement**, attentes comprises). L'IEC note « mean time to repair » comme terme **déconseillé**. L'usage BTS appelle « MTTR » le temps moyen de **réparation active** (ce que la norme appelle MRT). Le jeu garde l'usage BTS (MTTR = réparation active) et appelle **MDT** le temps d'arrêt total moyen : le GDD fait déjà ce choix (« As-tu retiré le temps d'attente des pièces ? »).
> 3. Je n'ai pas eu accès au texte intégral payant de la NF EN 13306:2018 : les correspondances ci-dessus s'appuient sur l'IEC 60050-192 (en accès libre) et sur des extraits de l'EN 13306. Les intitulés français exacts sont à confirmer sur l'exemplaire AFNOR du lycée.

### 5.3 Disponibilité

La NF EN 13306 définit la disponibilité comme une **aptitude** (« être en état d'accomplir une fonction requise… »), sans formule imposée. Les formules ci-dessous sont les conventions usuelles en BTS :
- **Disponibilité intrinsèque** (propre au bien, hors logistique) : **Ai = MTBF / (MTBF + MTTR)**
- **Disponibilité opérationnelle** (logistique et attentes comprises) : **Ao = MUT / (MUT + MDT) = ΣTBF / (ΣTBF + ΣTA) = (Tr − ΣTA) / Tr**
- Variante « globale » (préventif compris dans le temps requis) : Ao,g = (Tr − ΣTA − ΣT_prév) / Tr. Dans le jeu, le préventif fait le samedi n'est pas dans Tr.
- **Ligne en série** : sans chevauchement de pannes et sans accumulation, A_ligne = (Tr − ΣTA de toutes les machines) / Tr. Le produit A1 × A2 × … × An est une **approximation** qui suppose les arrêts indépendants et superposables.
- ⚠️ Ne pas confondre Ao (indicateur de maintenance) avec **Do du TRS** (NF E60-182 : Do = Tf / Tr), qui retire aussi les changements de format, les réglages et les arrêts induits. Le GDD écrit « Do » pour les deux : dans le jeu, j'affiche **« Ao machine »** et **« Do (TRS) »**.

### 5.4 Fiabilité

- **R(t)** = probabilité de fonctionner sans défaillance sur [0 ; t] ; **F(t) = 1 − R(t)** ; **f(t) = dF/dt** ; **λ(t) = f(t) / R(t)** ; **MTTF = ∫₀^∞ R(t) dt**.
- **Loi exponentielle** (β = 1) : R(t) = e^(−λt) ; f(t) = λ e^(−λt) ; λ(t) = λ constant ; MTBF = 1/λ.
- **Loi de Weibull à 3 paramètres** (β forme, η échelle, γ position ; pour t ≥ γ) :
  - R(t) = exp[ −((t − γ)/η)^β ] ; F(t) = 1 − R(t)
  - f(t) = (β/η) · ((t − γ)/η)^(β−1) · exp[ −((t − γ)/η)^β ]
  - λ(t) = (β/η) · ((t − γ)/η)^(β−1) : décroissant si β < 1, constant si β = 1, croissant si β > 1
  - **MTBF = γ + η · Γ(1 + 1/β)** ; écart-type σ = η · √[Γ(1 + 2/β) − Γ²(1 + 1/β)]
  - Rappel : pour γ = 0 et β = 1, on retrouve l'exponentielle avec λ = 1/η.
- **Probabilité de panne dans un tour** (formule du GDD, juste) : P_panne = 1 − R(t+Δt)/R(t) = 1 − exp[ −(((t+Δt−γ)/η)^β − ((t−γ)/η)^β) ].

**Table de Γ(1 + 1/β) donnée aux élèves** (valeurs arrondies à 10⁻⁴) :

| β | Γ(1 + 1/β) |
|---|---|
| 0,5 | 2,0000 |
| 1 | 1,0000 |
| 1,5 | 0,9027 |
| 2 | 0,8862 |
| 2,5 | 0,8873 |
| 3 | 0,8930 |
| 3,5 | 0,8997 |
| 4 | 0,9064 |

### 5.5 Ajustement de Weibull (méthode BTS)
1. Classer les n TBF par ordre croissant : t₁ ≤ … ≤ tₙ.
2. Fréquence cumulée par les **rangs médians de Bernard** : F(tᵢ) = (i − 0,3)/(n + 0,4). Pour n > 50, on peut prendre i/(n + 1) ou i/n : à préciser dans la consigne.
3. Linéarisation : **Y = ln(ln(1/(1 − F)))** et **X = ln t**. Si γ = 0, Y = β·X − β·ln η, c'est une droite.
4. Lecture graphique sur papier d'Allan Plait (β lu sur l'échelle de pente, η à F = 63,2 %), ou régression linéaire à la calculatrice : **β = pente**, **η = exp(−ordonnée à l'origine / β)**.
5. Si les points dessinent une courbe et non une droite : chercher γ ≠ 0 (translation des t), ou soupçonner un mélange de modes.

### 5.6 Période optimale de préventif systématique

**Modèle A — remplacement périodique avec réparations minimales** (calculable à la calculatrice ; c'est le cas des joints des 24 vannes : réparer une vanne ne rajeunit pas l'ensemble). Défaillances attendues sur [0 ; T] : H(T) = (T/η)^β. Coût moyen par heure :

  **C(T) = [Cp + Cc · (T/η)^β] / T** ; dC/dT = 0 ⇒ **T* = η · [Cp / (Cc · (β − 1))]^(1/β)**, qui n'existe que si **β > 1**.

**Modèle B — remplacement selon l'âge** (le composant est **remis à neuf à chaque panne** ; on le remplace préventivement quand il atteint l'âge T, ou à la panne si elle survient avant) :

  **C(T) = [Cp · R(T) + Cc · F(T)] / ∫₀^T R(t) dt**

Numérateur : coût moyen d'un cycle (préventif avec la probabilité R(T), correctif avec la probabilité F(T)). Dénominateur : durée moyenne d'un cycle. L'intégrale n'a pas de primitive élémentaire pour β ≠ 1 (pour β = 2, elle s'écrit avec la fonction erf, hors programme). **À la calculatrice**, on donne aux élèves un **tableau de ∫₀^T R(t) dt** pour quelques T ronds (1 à 6 tours). Ils calculent R(T), puis C(T), et repèrent le minimum sur la grille. Variante sans tableau : méthode des trapèzes sur un tableau de R(t) tous les 40 h (écart inférieur à 0,15 %). Si T → ∞ : R → 0 et ∫R → MTBF, donc **C → Cc / MTBF** (coût du tout correctif). Le préventif n'est rentable que si min C(T) < Cc/MTBF.

**Quel modèle utiliser ?**

| | Modèle A — remplacement périodique et réparation minimale | Modèle B — remplacement selon l'âge |
|---|---|---|
| Hypothèse sur la panne | la réparation remet le bien en service **sans le rajeunir** (« aussi mauvais qu'avant ») : on répare 1 élément sur n | la réparation remet le composant **à neuf** (« aussi bon que neuf ») : on change la pièce défaillante |
| Exemple de l'usine | jeu de joints des 24 vannes (REM-M1) | tête de vissage de la boucheuse (BOU-M1) |
| Préventif | à dates fixes (tous les T), quoi qu'il arrive | à l'âge T ; une panne remet le compteur à zéro |
| Coût par heure | [Cp + Cc·(T/η)^β] / T | [Cp·R(T) + Cc·F(T)] / ∫₀^T R |
| Calcul | formule explicite de T* | tableau de C(T) sur une grille de T, avec un tableau de ∫R |
| Condition d'intérêt | β > 1 | β > 1 et min C(T) < Cc/MTBF |
| Limite T → ∞ | C → ∞ (les pannes s'accélèrent sans fin) | C → Cc/MTBF (tout correctif) |

Dans les deux cas : β ≤ 1 ⇒ aucun optimum, le systématique est inutile.

Dans les deux modèles, Cp = coût d'une intervention préventive (pièces + main-d'œuvre, et perte de production éventuelle) et Cc = coût complet d'une défaillance (direct + indirect). On ne fait du systématique que si **β > 1 et Cc > Cp** (en pratique Cc ≫ Cp).

### 5.7 Pareto et ABC
- Trier par valeur décroissante (nombre de pannes, temps d'arrêt, coût, valeur de consommation du stock), calculer les % et les % cumulés.
- **Seuils (convention, pas une norme)** : classe A jusqu'à **80 %** du cumul, B de 80 à **95 %**, C au-delà. Une autre convention courante est 70/20/10 %. La « loi des 80/20 » est une observation empirique, pas une règle : ici, la classe A regroupe 2 machines sur 6 (33 %).
- **Règle d'appartenance retenue (à afficher)** : un élément est en A si le cumul **qui l'inclut** est ≤ 80 %, en B s'il est ≤ 95 %, sinon en C. Les données d'exercice tombent exactement sur 80 % et 95 % : pas d'ambiguïté.
- Compléments : faire un Pareto **en N** (fréquence), **en ΣTA** (indisponibilité) et **en coût**. Le **graphique N–MTTR** (ou N–MDT), avec des courbes d'iso-indisponibilité N × MDT = constante, sépare les problèmes de fiabilité (N élevé) des problèmes de maintenabilité et de logistique (MDT élevé).

### 5.8 AMDEC : criticité C = F × G × D
Méthode décrite par l'**IEC 60812:2018** (AMDE/AMDEC, reprise en norme européenne). **Les grilles de cotation ne sont pas normalisées** : chaque entreprise fixe les siennes. Grilles retenues pour le jeu (1 à 4, C de 1 à 64) :

| Note | F — Fréquence | G — Gravité | D — Non-détection |
|---|---|---|---|
| 1 | < 1 défaillance par an | arrêt < 1 h, aucun impact qualité | détection automatique certaine avant effet |
| 2 | ≤ 1 par trimestre | arrêt de 1 à 4 h, ou retouche | détectée par l'opérateur ou à la ronde |
| 3 | ≤ 1 par mois | arrêt de 4 à 24 h, ou produit non conforme livrable | détection difficile (contrôle spécifique) |
| 4 | > 1 par mois | arrêt > 24 h, ou risque pour la sécurité des personnes ou la sécurité sanitaire | indétectable avant la défaillance |

**Seuils (convention du jeu)** : C ≥ 18 → action prioritaire ; 12 ≤ C < 18 → action à planifier ; C < 12 → surveillance. Indépendamment du seuil, **tout mode avec G = 4 lié à la sécurité est traité** : c'est la règle usuelle, à rappeler aux élèves.

### 5.9 Coûts de maintenance et de défaillance
- **Coûts directs** = main-d'œuvre (heures × taux) + pièces et consommables + sous-traitance (+ outillage spécifique).
- **Coûts indirects** = perte de production (heures d'arrêt × pénalité, soit la marge perdue) + rebuts et non-qualité + redémarrage + pénalités de retard client + éventuels coûts de sécurité et d'image.
- Coût de défaillance = coûts directs du correctif + coûts indirects. **Coût global** sur une période = coûts directs (préventif + correctif) + coûts indirects + coût de possession du stock.

### 5.10 TRS (NF E60-182, mai 2002)
Temps d'état : **Tt** temps total ⊃ **To** temps d'ouverture ⊃ **Tr** temps requis (To moins les arrêts planifiés) ⊃ **Tf** temps de fonctionnement (Tr moins les arrêts : pannes, changements de format, réglages, arrêts induits) ⊃ **Tn** temps net (= production réalisée / cadence nominale) ⊃ **Tu** temps utile (= pièces bonnes / cadence nominale).

  **TRS = Tu / Tr = Do × Tp × Tq**, avec Do = Tf/Tr (disponibilité opérationnelle), Tp = Tn/Tf (taux de performance), Tq = Tu/Tn (taux de qualité).
  **TRG = Tu / To** (taux de rendement global) ; **TRE = Tu / Tt** (taux de rendement économique).

> ⚠️ **Correction de la demande initiale** : « TRS = Tu/To » est faux selon la NF E60-182 : **Tu/To est le TRG**. Le TRS se rapporte au **temps requis** Tr. Les deux sont égaux seulement s'il n'y a pas d'arrêt planifié dans le temps d'ouverture, ce qui est le cas de l'exercice (préventif le samedi).

---

## 6. Corrigés complets (données d'exercice, calculatrice)

Toutes les valeurs ci-dessous sont recalculées par `scripts/calculs.py` (fractions exactes et assertions). Sauf mention contraire, le temps requis est **Tr = 800 h par machine** (10 semaines × 80 h).

### 6.1 Identifier le goulot (niveau 2)
Cadences : SOU 11 000, CON 15 000, **REM 10 000**, BOU 11 500, ETI 12 000, FAR 13 000 bouteilles/h. **Goulot = remplisseuse** (la plus faible cadence). Capacité théorique de la ligne : 10 000 bouteilles/h, soit 800 000 bouteilles par semaine de 80 h.

### 6.2 Remplisseuse : MTBF, MTTR, MDT, Ai, Ao (niveau 1)

| Panne | Mode | Détection | Attente | Réparation | Remise en service | TA |
|---|---|---|---|---|---|---|
| EX-0004 | REM-M1 | 0,25 | 0 | 2,5 | 0,25 | 3 |
| EX-0007 | REM-M2 | 0,5 | 16 | 3 | 0,5 | 20 |
| EX-0016 | REM-M1 | 0,25 | 0 | 2,5 | 0,25 | 3 |
| EX-0017 | REM-M3 | 0,5 | 30 | 22 | 1,5 | 54 |
| **Total** | | 1,5 | 46 | 30 | 2,5 | **80** |

- N = 4 défaillances ; ΣTA = 3 + 20 + 3 + 54 = **80 h**
- ΣTBF = Tr − ΣTA = 800 − 80 = **720 h**
- **MTBF = 720 / 4 = 180 h**
- **MTTR = Σ réparations actives / N = 30 / 4 = 7,5 h**
- **MDT = ΣTA / N = 80 / 4 = 20 h** (= 7,5 de réparation + 11,5 d'attente + 1 de détection et remise en service, en moyenne)
- **Ao = 720 / 800 = 90 %** (ou MUT/(MUT + MDT) = 180/(180 + 20) = 90 %)
- **Ai = MTBF / (MTBF + MTTR) = 180 / 187,5 = 96 %**
- Interprétation : 6 points d'écart entre Ai et Ao, dus à la **logistique** (46 h d'attente de pièces, dont 30 h pour le motoréducteur non stocké). Le levier principal est le stock, pas la technique.
- Palliatif / curatif : sur l'étiqueteuse, EX-0002 et EX-0013 sont des **dépannages provisoires** (palliatif, correctif immédiat). Ils sont suivis des remplacements de la cellule **EX-0201 et EX-0202** (curatif, correctif **différé** au samedi).
- ⚠ **Écart avec la règle du dépannage provisoire (§ 3.2)**, signalé et **non corrigé**, car ces données sont fournies : EX-0002 et EX-0013 ont 0,5 h de réparation active au lieu de 0,25 h. De plus, ils ont lieu 47 h (EX-0002) et 56 h (EX-0013) d'ouverture avant le samedi. Avec la règle, la panne aurait dû revenir vers 73 h et 464 h, avant le curatif du samedi, et l'historique ne contient pas ces rechutes. **Décision de Steph** : EX-0002 et EX-0013 sont gardés tels quels, comme données d'atelier. Les corrigés ci-dessus restent justes pour l'historique tel qu'il est fourni.

### 6.3 Indicateurs des 6 machines (niveau 2)

| Machine | N | ΣTA (h) | ΣTBF (h) | MTBF (h) | MTTR (h) | MDT (h) | **Ao** | Ai (exacte → attendue) |
|---|---|---|---|---|---|---|---|---|
| Remplisseuse | 4 | 80 | 720 | 180 | 7,5 | 20 | **90 %** | 96 % (exacte) |
| Étiqueteuse | 8 | 48 | 752 | 94 | 1 | 6 | **94 %** | 98,947 % → **98,9 %** |
| Souffleuse | 4 | 16 | 784 | 196 | 2 | 4 | **98 %** | 98,990 % → **99,0 %** |
| Boucheuse | 2 | 8 | 792 | 396 | 1,5 | 4 | **99 %** | 99,623 % → **99,6 %** |
| Fardeleuse | 2 | 4 | 796 | 398 | 1 | 2 | **99,5 %** | 99,749 % → **99,7 %** |
| Convoyeurs | 4 | 4 | 796 | 199 | 0,5 | 1 | **99,5 %** | 99,749 % → **99,7 %** |

Ao et MTBF tombent juste pour toutes les machines. Ai ne tombe juste que pour la remplisseuse : pour les autres, **demander Ai arrondie à 0,1 %** (ou ne la demander que pour REM).

**Disponibilité de la ligne en série** (aucun chevauchement) : (800 − 160)/800 = **80 %**. Avec l'approximation par le produit : 0,90 × 0,94 × 0,98 × 0,99 × 0,995 × 0,995 = **81,26 %**. L'écart montre que le produit n'est qu'une approximation (il suppose des pannes indépendantes qui peuvent se superposer).

### 6.4 TRS, TRG, TRE de la ligne (niveaux 2 et 6)
Données de production (fictives) sur les 10 semaines : Tt = 10 × 168 = **1 680 h** ; To = **800 h** ; pas d'arrêt planifié dans l'ouverture, donc **Tr = 800 h** ; pannes de la remplisseuse 80 h ; arrêts **induits** par les pannes des autres machines (ligne en série) 80 h ; changements de format 40 h ; production réalisée **5 400 000** bouteilles, dont **5 292 000** bonnes (108 000 rebutées) ; cadence nominale 10 000 b/h.

- Tf = 800 − 80 − 80 − 40 = **600 h** → **Do = 600/800 = 75 %**
- Tn = 5 400 000 / 10 000 = **540 h** → **Tp = 540/600 = 90 %**
- Tu = 5 292 000 / 10 000 = **529,2 h** → **Tq = 529,2/540 = 98 %**
- **TRS = Tu/Tr = 529,2/800 = 66,15 %** ; vérification : 0,75 × 0,90 × 0,98 = 0,6615
- **TRG = Tu/To = 66,15 %** (= TRS, car To = Tr) ; **TRE = Tu/Tt = 529,2/1 680 = 31,5 %**
- Erreur type à détecter : la moyenne (75 + 90 + 98)/3 = 87,67 % n'a aucun sens.

### 6.5 Lois de fiabilité (niveau 3)
- **MTBF de Weibull** : BOU-M1 (β = 2, η = 500 h) : 500 × 0,8862 = **443,1 h**. CON-M1 (β = 0,5, η = 100 h) : 100 × Γ(3) = 100 × 2 = **200 h**. FAR-M2 (β = 3, η = 400 h, γ = 100 h) : 100 + 400 × 0,8930 = **457,2 h**. REM-M1 (β = 3, η = 300 h) : 300 × 0,8930 = **267,9 h** (MTTF d'un jeu de joints neuf).
- **R(250) pour BOU-M1** = exp[−(250/500)²] = e^(−0,25) = **0,7788** ; F(250) = 0,2212 ; λ(250) = (2/500) × (250/500) = **0,002 h⁻¹**.
- **Étiqueteuse ETI-M1** (λ = 0,01 h⁻¹) : R(80 h) = e^(−0,8) = **0,4493**, donc une probabilité de **55,07 %** d'avoir au moins une panne de cellule par semaine.
- **β < 1 (CON-M1)** : λ(25 h) = (0,5/100) × (25/100)^(−0,5) = **0,01 h⁻¹** ; λ(400 h) = 0,005 × 4^(−0,5) = **0,0025 h⁻¹**. Le taux est divisé par 4 : la machine se « rode ».
- **Probabilité de panne dans le tour** (BOU-M1, âge 400 h, Δt = 80 h) : 1 − exp[−((480/500)² − (400/500)²)] = 1 − e^(−0,2816) = **0,2454**.
- **Stock mini (point de commande) de la cellule P-ETI-01** : consommation moyenne = λ × 80 h = 0,8 cellule par semaine (hypothèse : 1 cellule par panne) ; délai standard 2 semaines → 0,8 × 2 = 1,6 ; plus 1 en stock de sécurité = 2,6 → **3** (arrondi à l'entier supérieur).
- **Conditionnel** (REM-M3, motoréducteur) : intervalle P-F (de la détection d'une hausse vibratoire à la panne) supposé égal à **400 h** (fictif). Règle usuelle : inspecter au plus tous les P-F/2 = **200 h**, soit une ronde au moins toutes les 2 semaines. Le jeu propose une ronde chaque semaine.
- **Prévisionnel** : vitesse vibratoire efficace mesurée à 2,5 mm/s, en hausse de 0,25 mm/s par semaine, et seuil d'alarme fixé par l'entreprise à 4,5 mm/s. Dépassement prévu dans (4,5 − 2,5)/0,25 = **8 semaines** : on commande le motoréducteur (délai 2 semaines) et on planifie le remplacement un samedi avant cette échéance.

### 6.6 Pareto et ABC (niveau 4)
**Pareto des temps d'arrêt** (total 160 h) :

| Rang | Machine | ΣTA (h) | % | % cumulé | Classe | N |
|---|---|---|---|---|---|---|
| 1 | Remplisseuse | 80 | 50 | 50 | **A** | 4 |
| 2 | Étiqueteuse | 48 | 30 | 80 | **A** | 8 |
| 3 | Souffleuse | 16 | 10 | 90 | **B** | 4 |
| 4 | Boucheuse | 8 | 5 | 95 | **B** | 2 |
| 5 | Convoyeurs | 4 | 2,5 | 97,5 | **C** | 4 |
| 6 | Fardeleuse | 4 | 2,5 | 100 | **C** | 2 |

Lecture : **REM + ETI = 80 % des arrêts** (classe A). En **nombre** de pannes, l'étiqueteuse est première (8 sur 24) et la remplisseuse n'arrive qu'à égalité avec SOU et CON (4 chacune). C'est le piège classique : il faut un Pareto en **temps** (ou en coût) pour hiérarchiser. Sur le graphique N–MDT, ETI (N = 8, MDT = 6 h) relève de la **fiabilité et de la logistique** (attente du technicien), REM (N = 4, MDT = 20 h) de la **maintenabilité et de la logistique** (pièces non stockées). Égalité FAR/CON (4 h) : les deux sont en C, l'ordre entre elles n'a pas d'importance.

**Pareto des coûts** (correctif en temps d'ouverture, 10 semaines) : REM 105 260 € ; ETI 59 040 € ; SOU 22 120 € ; BOU 10 660 € ; CON 5 520 € ; FAR 5 310 €. Même classement que le Pareto des temps d'arrêt, car le coût indirect (1 200 €/h) domine.

**ABC du stock** (consommation annuelle prévisionnelle, total 50 000 €) :

| Réf. | Désignation | Qté/an | Prix (€) | Valeur (€) | % | % cumulé | Classe |
|---|---|---|---|---|---|---|---|
| P-REM-02 | Kit joints complet 24 vannes de remplissage | 25 | 600 | 15 000 | 30 | 30 | **A** |
| P-BOU-01 | Tête de vissage à embrayage magnétique | 15 | 900 | 13 500 | 27 | 57 | **A** |
| P-REM-04 | Motoréducteur d'entraînement du carrousel | 2 | 5 750 | 11 500 | 23 | 80 | **A** |
| P-REM-03 | Sonde de niveau / débitmètre de vanne | 10 | 450 | 4 500 | 9 | 89 | **B** |
| P-ETI-01 | Cellule photoélectrique de détection d'étiquette | 10 | 180 | 1 800 | 3,6 | 92,6 | **B** |
| P-FAR-02 | Lame de coupe du film | 8 | 150 | 1 200 | 2,4 | 95 | **B** |
| P-SOU-01 | Lampe infrarouge four de préchauffe 1,5 kW | 20 | 60 | 1 200 | 2,4 | 97,4 | **C** |
| P-ETI-02 | Brosse de pose d'étiquette | 5 | 120 | 600 | 1,2 | 98,6 | **C** |
| P-FAR-01 | Résistance du four de rétraction | 2 | 250 | 500 | 1 | 99,6 | **C** |
| P-CON-03 | Chaîne à palettes inox (lot de 1 m) | 1 | 200 | 200 | 0,4 | 100 | **C** |

Classe A = 3 références sur 10 (30 %) pour 80 % de la valeur : gestion serrée (suivi individuel, révision fréquente du stock mini). C = 4 références (40 %) pour 5 % : gestion simple. Attention : l'ABC classe la **valeur consommée**, pas la **criticité**. Le motoréducteur P-REM-04 (classe A en valeur, non stocké) est aussi **critique** (54 h d'arrêt sur EX-0017) : la décision de le stocker se prend avec le coût d'arrêt, pas avec l'ABC seul.

### 6.7 Ajustement de Weibull (niveau 4)
Relevé fictif sur 3 ans des TBF des **têtes de vissage BOU-M1** (6 valeurs, en heures) : **170, 280, 370, 460, 580, 740**.

| i | tᵢ (h) | F = (i − 0,3)/6,4 | X = ln t | Y = ln ln(1/(1 − F)) |
|---|---|---|---|---|
| 1 | 170 | 0,1094 | 5,1358 | -2,1556 |
| 2 | 280 | 0,2656 | 5,6348 | -1,1753 |
| 3 | 370 | 0,4219 | 5,9135 | -0,6015 |
| 4 | 460 | 0,5781 | 6,1312 | -0,1473 |
| 5 | 580 | 0,7344 | 6,3630 | 0,2819 |
| 6 | 740 | 0,8906 | 6,6067 | 0,7943 |

Régression Y = βX + b (calculatrice) : **β = 2,005 ≈ 2,0** ; **η = exp(−b/β) = 499,6 h ≈ 500 h** ; r = 0,9999. Les points sont alignés, donc γ = 0. Conclusion : β ≈ 2 > 1, **usure** → préventif systématique envisageable (§ 6.8, modèle B : remplacement selon l'âge à 240 h) ou conditionnel (contrôle de couple).
*Remarque pour le prof* : le maximum de vraisemblance (hors programme) donne β ≈ 2,5 et η ≈ 490 h sur ces 6 valeurs. 6 points, c'est peu ; la conclusion « usure » ne change pas. Seule la méthode des rangs médians est attendue.

### 6.8 Période optimale de préventif (niveau 5)
**Joints des vannes REM-M1, modèle A** (réparation minimale). β = 3 ; η = 300 h.
- Cp = kit complet 600 € + 8 h × 50 € (samedi) = **1 000 €**, sans perte de production.
- Cc = coût d'une fuite de joint (EX-0004) = 50 € de pièces + 110 € de main-d'œuvre + 3 h × 1 200 € + 240 € de rebuts = **4 000 €**.
- **T* = 300 × [1 000 / (4 000 × 2)]^(1/3) = 300 × (1/8)^(1/3) = 300 × 0,5 = 150 h**
- **C(T*) = [1 000 + 4 000 × 0,5³] / 150 = 1 500/150 = 10 €/h**

| T (h) | 80 | 100 | 150 | 160 | 200 | 240 | 320 | 400 |
|---|---|---|---|---|---|---|---|---|
| C(T) (€/h) | 13,45 | 11,48 | 10,00 | 10,04 | 10,93 | 12,70 | 18,30 | 26,20 |

Décision : remplacer les joints **toutes les 2 semaines** (160 h ≈ T*, avec C = 10,04 €/h : la courbe est plate autour de l'optimum, donc on arrondit au rythme des tours). La politique actuelle (4 semaines = 320 h, C = 18,30 €/h) coûte environ (18,30 − 10,04) × 4 000 h ≈ **33 000 € par an** de plus.


**Têtes de vissage BOU-M1, modèle B : remplacement selon l'âge** (corrigé calculatrice). Une tête défaillante est remplacée par une tête neuve (renouvellement).
- Données : β = 2 ; η = 500 h ; γ = 0 ; MTBF = 500 × 0,8862 = 443,1 h.
- Cp = tête 900 € + 2 h × 50 € (samedi, sans perte de production) = **1 000 €**.
- Cc = tête 900 € + 2,5 h × 40 € de main-d'œuvre + 4 h d'arrêt × 1 200 € = **5 800 €**.
- Consigne : calculer R(T) = exp[−(T/500)²] à 4 décimales, puis C(T) = [1 000·R(T) + 5 800·(1 − R(T))] / I(T), avec **I(T) = ∫₀^T R(t) dt donné** (arrondi à 0,1 h). Donner C(T) à 0,01 €/h près et repérer le minimum.

| T (h) | 80 (1 tour) | 160 (2 tours) | 240 (3 tours) | 320 (4 tours) | 400 (5 tours) | 480 (6 tours) |
|---|---|---|---|---|---|---|
| **I(T) donné** (h) | 79,3 | 154,7 | 222,8 | 281,2 | 328,8 | 365,8 |
| R(T) | 0,9747 | 0,9027 | 0,7942 | 0,6639 | 0,5273 | 0,3979 |
| Numérateur 1 000·R + 5 800·F (€) | 1 121,44 | 1 467,04 | 1 987,84 | 2 613,28 | 3 268,96 | 3 890,08 |
| **C(T) attendu** (€/h) | 14,14 | 9,48 | **8,92** | 9,29 | 9,94 | 10,63 |
| C(T) exact, intégration fine (€/h) | 14,1362 | 9,4840 | 8,9227 | 9,2933 | 9,9411 | 10,6360 |

- **Minimum sur la grille : T = 240 h (3 tours), C = 8,92 €/h.** Les voisins sont nettement plus chers : 9,48 €/h à 160 h et 9,29 €/h à 320 h.
- **Vérification de rentabilité** : tout correctif = Cc/MTBF = 5 800/443,1 = **13,09 €/h** > 8,92 €/h. Le préventif à 3 semaines est rentable. Il fait gagner 4,17 €/h, soit environ **16 680 € par an** (4 000 h).
- **Contrôle de la méthode** (script) : I(T) recalculé par intégration numérique fine et vérifié par la forme exacte η·(√π/2)·erf(T/η). L'écart entre le C(T) « calculatrice » (R à 4 décimales, I à 0,1 h) et le C(T) exact est au plus de 0,0055 €/h (au plus 0,04 % en relatif). Un seul arrondi à 0,01 diffère : 10,63 contre 10,64 à 480 h. L'optimum continu (minimisation numérique) est **T* = 232,3 h, C* = 8,919 €/h** : la grille par tours ne coûte que 0,0041 €/h de plus.
- Variante « trapèzes » (R(t) tous les 40 h, arrondi à 4 décimales) : I(240) = 222,57 h au lieu de 222,78 h (écart -0,093 %) ; C(240) = 8,93 €/h. Même conclusion.

**Contre-exemple β = 1** (ETI-M1, modèle B, Cp = 180 €, Cc = 1 400 €, η = 100 h) : C(50) = 16,77 ; C(100) = 15,05 ; C(200) = 14,28 ; C(400) = 14,03 ; C(800) = 14,00 €/h. C(T) **décroît** vers Cc/η = 14 €/h : **le systématique ne se justifie jamais** pour β = 1.

### 6.9 AMDEC de la remplisseuse (niveau 5)

| Mode | Défaillance | Effet | F | G | D | **C** | Décision |
|---|---|---|---|---|---|---|---|
| REM-M1 | Fuite de joint de vanne | sous-remplissage, bouteilles rebutées | 3 | 3 | 2 | **18** | prioritaire : remplacement des joints toutes les 2 semaines (§ 6.8), F 3 → 1 |
| REM-M2 | Dérive de la sonde de niveau | niveaux hors tolérance non vus | 2 | 3 | 3 | **18** | prioritaire : contrôleur pondéral en ligne, D 3 → 1 (C = 6) ; β = 1, donc pas de systématique |
| REM-M3 | Défaillance du motoréducteur | arrêt long (> 24 h) de la ligne | 1 | 4 | 2 | **8** | surveillance : ronde vibratoire (conditionnel), D 2 → 1 |
| REM-M4 | Contamination produit (joint de cuve / NEP) | risque sanitaire, rappel de lots | 1 | 4 | 3 | **12** | à planifier, et **traité d'office** car G = 4 (sécurité sanitaire) : contrôle des joints de cuve à chaque NEP |

REM-M4 est un mode **d'analyse** : il n'a pas de panne dans l'historique et n'est pas simulé (il n'est pas dans `usine.json`) ; on peut l'ajouter au moteur comme événement spécial « audit qualité ». Justification de F à partir de l'historique : REM-M1 a 2 pannes en 10 semaines (≈ 0,9 par mois), donc F = 3 ; REM-M2 a 1 panne en 10 semaines, donc F = 2. G vient du TA observé (3 h, mais produit non conforme → G = 3 ; 54 h → G = 4).

### 6.10 Coûts (niveaux 1 à 6)
**Une panne détaillée, EX-0017** (motoréducteur REM-M3, 2 techniciens) :
- Main-d'œuvre = (22 + 1,5) h × 2 techniciens × 40 € = **1 880 €** ; pièce = **5 750 €** → **coût direct = 7 630 €**
- Arrêt = 54 h × 1 200 € = **64 800 €** ; rebuts = 600 × 0,20 = 120 € → **coût indirect = 64 920 €**
- **Coût de la défaillance = 72 550 €**. Si le motoréducteur avait été en stock (attente 0,25 h au lieu de 30 h), on aurait évité 29,75 h × 1 200 = 35 700 € d'arrêt, soit 6 fois le prix de la pièce.

**Bilan des 10 semaines** (28 interventions) : main-d'œuvre 4 410 € + pièces 13 240 € = **coûts directs 17 650 €**, dont 2 460 € pour le préventif et le correctif différé du samedi ; arrêts 192 000 € + rebuts 720 € = **coûts indirects 192 720 €** ; **total 210 370 €**. Les coûts indirects font 91,6 % du total : c'est le message central du jeu.

| Machine | Coût direct (€) | Coût indirect (€) | Total (€) |
|---|---|---|---|
| Remplisseuse | 8 540 | 96 720 | 105 260 |
| Étiqueteuse | 1 440 | 57 600 | 59 040 |
| Souffleuse | 2 920 | 19 200 | 22 120 |
| Boucheuse | 1 060 | 9 600 | 10 660 |
| Convoyeurs | 720 | 4 800 | 5 520 |
| Fardeleuse | 510 | 4 800 | 5 310 |

---

## 7. Arrondis attendus et tolérances de correction (notation)

Principe : les données d'exercice sont construites pour que les résultats soient **exacts**. La tolérance sert à absorber une saisie arrondie ou une lecture graphique, pas une erreur de méthode. Ces tolérances remplacent, pour les exercices notés, la règle provisoire « ±2 % » du GDD : ±2 % sur Ao = 90 % accepterait 88,2 à 91,8 %, ce qui laisserait passer l'oubli de l'attente logistique dans les cas proches.

| Indicateur | Saisie demandée | Valeur juste | Tolérance acceptée | Erreur typique reconnue (message ciblé) |
|---|---|---|---|---|
| MTBF, MTTR, MDT | en h, à 0,1 h près | exacte (ex. 180 ; 7,5 ; 20) | ±0,05 h | MTBF = Tr/N (TA non retiré) → 200 ; MTTR incluant l'attente → 20 |
| Ao | en %, à 0,1 point près | exacte (ex. 90) | ±0,05 point | Ao calculée avec MTTR au lieu de MDT → 96 (c'est Ai) |
| Ai | en %, à 0,1 point près | exacte pour REM (96) ; arrondie sinon (ex. ETI 98,9) | ±0,1 point | Ai avec MDT → valeur de Ao |
| Disponibilité de la ligne | en %, à 0,1 point près | 80,0 (somme des TA) | ±0,1 ; **81,3 accepté** si la consigne demande le produit | — |
| Do, Tp, Tq, TRS, TRG, TRE | en %, à 0,01 point près | exacte (75 ; 90 ; 98 ; 66,15 ; 31,5) | ±0,05 point | moyenne au lieu du produit → 87,67 ; TRS rapporté à To (c'est le TRG ; ici identiques) |
| R(t), F(t) | 4 décimales | ex. 0,7788 | ±0,0005 | oubli du carré (β) → 0,6065 |
| λ(t) | en h⁻¹ | ex. 0,002 | ±1 % relatif | — |
| MTBF de Weibull | en h, à 0,1 h près | ex. 443,1 ; 457,2 | ±0,2 h (selon l'arrondi de Γ) | oubli de γ → 357,2 |
| β, η (régression à la calculatrice) | β à 0,01 près ; η à 1 h près | 2,005 ; 499,6 | β ∈ [1,95 ; 2,05] ; η ∈ [490 ; 510] | rangs i/n au lieu de Bernard : à accepter si la consigne le permet |
| β, η (papier d'Allan Plait) | β à 0,1 près ; η à 10 h près | 2,0 ; 500 | β ∈ [1,8 ; 2,2] ; η ∈ [475 ; 525] | — |
| T* (modèle A) | en h, entier | 150 | ±1 h | Cp et Cc inversés → 300 × (4/2)^(1/3) ≈ 378 |
| C(T*) (modèle A) | €/h, à 0,01 près | 10,00 | ±0,05 | — |
| C(T) (modèle B, tableau) | €/h, à 0,01 près | 14,14 ; 9,48 ; 8,92 ; 9,29 ; 9,94 ; 10,63 | ±0,02 €/h (couvre les arrondis de R et l'écart de 10,63 à 10,64 à 480 h) | Cp et Cc inversés ; F(T) pris pour R(T) ; division par T au lieu de I(T) → 8,28 à 240 h |
| T optimal sur la grille (modèle B) | h | 240 | aucune tolérance | — |
| Coût du tout correctif Cc/MTBF | €/h, à 0,01 près | 13,09 | ±0,02 | division par η au lieu du MTBF → 11,60 |
| Pareto / ABC : % et % cumulés | 1 décimale | exacts | ±0,05 point | — |
| Classes A/B/C | lettre | exacte | **aucune tolérance** | élément frontière mal classé (règle « cumul qui l'inclut ») |
| Criticité AMDEC | entier | exact | aucune | somme F + G + D au lieu du produit |
| Coûts | €, à l'euro près | exacts | ±1 € (±0,5 % pour les totaux sur plus de 10 lignes) | oubli du coût indirect ; MO comptée avec 1 seul technicien sur EX-0017 → 940 € |

**Règle de saisie** : le jeu accepte la virgule ou le point et ignore les espaces des milliers. Il rejette les unités incohérentes (minutes saisies à la place d'heures) avec un message dédié.

---

## 8. Proposition de schéma JSON (draft 2020-12)

Deux schémas, écrits dans `schema_equipement.json` et `schema_historique.json`. Règles de nommage : **unité en suffixe** (`_h` heures d'ouverture, `_eur` euros HT, `_par_h` par heure, `_pct` pourcentage, `_bouteilles_par_h`) ; identifiants courts et stables (`REM`, `REM-M1`, `P-REM-02`) ; dates **ISO 8601 avec décalage** (`2026-01-13T09:00:00+01:00`) ; types de maintenance selon la NF EN 13306 (`corrective_immediate`, `corrective_differee`, `preventive_systematique`, `preventive_conditionnelle`, `preventive_previsionnelle`, `amelioration`).

**Validation** (`scripts/schemas.py`, `jsonschema` 4.26, `Draft202012Validator` avec contrôle des formats `date-time`) : `usine.json` → **VALIDE** ; `historique_pannes.json` → **VALIDE** ; `historique_pannes_simule.json` → **VALIDE**. Contrôles complémentaires, impossibles à exprimer en JSON Schema et faits par le script : TA = détection + attente + réparation + remise en service ; coût total = direct + indirect ; pas de chevauchement de pannes dans l'historique d'exercice ; **contrôle croisé pièces/modes** (dans les deux historiques, chaque pièce citée existe au catalogue avec le bon prix, et appartient aux `pieces_corrective` du mode pour un correctif, ou aux `pieces_corrective` ∪ `pieces_preventive` pour un préventif ; le mode correspond bien à l'équipement et au sous-ensemble de l'événement) ; **règle du dépannage provisoire** (pour chaque mode, `duree_reparation_active_h` = arrondi au ¼ h de `ratio_reparation_active` × `mttr_actif_h`, minimum 0,25 h : 13 modes conformes). Les palliatifs des historiques sont aussi comparés à la règle, à titre d'**avertissement non bloquant** : 0 écart dans l'historique simulé, et EX-0002 et EX-0013 signalés dans l'historique d'exercice (§ 6.2).

**(a) Équipements** : l'objet racine `usine.json` contient `meta`, `organisation`, `couts`, `politique_initiale`, `pieces[]` et `equipements[]`. Chaque équipement a `id_equipement`, `designation`, `fonction`, `cadence_nominale_bouteilles_par_h`, `goulot`, `penalite_arret_eur_par_h`, `sous_ensembles[]` et `modes[]`. Chaque mode a `id_mode`, `id_sous_ensemble`, `loi` (exponentielle | weibull), `beta`, `eta_h`, `gamma_h`, `lambda_par_h`, `mtbf_theorique_h`, `effet_correctif` (renouvellement | reparation_minimale), `mttr_actif_h`, `sigma_log_reparation`, `pieces_corrective[]`, `pieces_preventive[]`, `mode_detection`, `probabilite_piece_en_stock` et `depannage_provisoire`. Ce dernier est un objet obligatoire avec `autorise` (booléen), `ratio_reparation_active` (nombre, 0,4), `duree_reparation_active_h` (nombre, multiple de 0,25, ≥ 0,25), `pieces` (tableau vide imposé), `reapparition_apres_h` (nombre, 40), `annule_par_curatif_differe` (booléen) et `justification` (texte, obligatoire si `autorise = false`). Règle conditionnelle : loi exponentielle ⇒ β = 1 et γ = 0.

**(b) Historique** : un tableau d'événements. Les colonnes du CSV (séparateur `;`, décimales avec point, booléens `oui`/`non`, pièces au format `REF×quantité` séparées par `|`, sous la forme `P-REM-01x2`) reprennent dans l'ordre les propriétés du schéma : `id_evenement`, `source`, `id_equipement`, `id_sous_ensemble`, `id_mode_defaillance`, `description`, `type_maintenance`, `action`, `reparation_provisoire`, `debut_arret`, `fin_arret`, `hors_temps_ouverture`, `debut_arret_h_ouverture`, `tbf_precedent_h`, `duree_detection_h`, `duree_attente_logistique_h`, `duree_reparation_active_h`, `duree_remise_en_service_h`, `duree_arret_totale_h`, `nb_techniciens`, `intervenant`, `heures_main_oeuvre_h`, `pieces`, `cout_pieces_eur`, `cout_main_oeuvre_eur`, `cout_sous_traitance_eur`, `cout_direct_eur`, `penalite_arret_eur_par_h`, `cout_arret_production_eur`, `nb_rebuts_bouteilles`, `cout_rebuts_eur`, `cout_indirect_eur`, `cout_total_eur`.

<details><summary>schema_equipement.json (texte intégral)</summary>

```json
{
 "$schema": "https://json-schema.org/draft/2020-12/schema",
 "$id": "https://example.org/jeu-maintenance/schema_equipement.json",
 "title": "Usine fictive et équipements — jeu sérieux BTS MS",
 "description": "Durées en heures d'ouverture (_h), coûts en euros HT (_eur), cadences en bouteilles par heure.",
 "type": "object",
 "required": [
  "meta",
  "organisation",
  "couts",
  "pieces",
  "equipements"
 ],
 "additionalProperties": false,
 "properties": {
  "meta": {
   "type": "object",
   "required": [
    "nom",
    "version"
   ],
   "properties": {
    "nom": {
     "type": "string"
    },
    "version": {
     "type": "string"
    },
    "date": {
     "type": "string",
     "format": "date"
    },
    "avertissement": {
     "type": "string"
    },
    "unites": {
     "type": "string"
    }
   }
  },
  "organisation": {
   "type": "object",
   "required": [
    "heures_ouverture_par_semaine"
   ],
   "properties": {
    "postes_par_jour": {
     "type": "integer",
     "minimum": 1
    },
    "heures_par_poste": {
     "type": "number",
     "minimum": 0
    },
    "jours_par_semaine": {
     "type": "integer",
     "minimum": 1,
     "maximum": 7
    },
    "heures_ouverture_par_semaine": {
     "type": "number",
     "exclusiveMinimum": 0
    },
    "horaires": {
     "type": "string"
    },
    "produit": {
     "type": "string"
    },
    "marge_sur_cout_variable_eur_par_bouteille": {
     "type": "number",
     "minimum": 0
    },
    "cout_rebut_eur_par_bouteille": {
     "type": "number",
     "minimum": 0
    },
    "coefficient_propagation_arret_hors_goulot": {
     "type": "number",
     "minimum": 0,
     "maximum": 1
    }
   }
  },
  "couts": {
   "type": "object",
   "required": [
    "taux_main_oeuvre_eur_par_h",
    "penalite_arret_goulot_eur_par_h",
    "penalite_arret_autre_eur_par_h"
   ],
   "additionalProperties": {
    "type": "number",
    "minimum": 0
   }
  },
  "politique_initiale": {
   "type": "array",
   "items": {
    "type": "object",
    "required": [
     "id_mode",
     "type_maintenance"
    ],
    "properties": {
     "id_mode": {
      "type": "string"
     },
     "type_maintenance": {
      "enum": [
       "corrective_immediate",
       "corrective_differee",
       "preventive_systematique",
       "preventive_conditionnelle",
       "preventive_previsionnelle",
       "amelioration"
      ]
     },
     "action": {
      "type": "string"
     },
     "periode_semaines": {
      "type": "number",
      "exclusiveMinimum": 0
     },
     "hors_temps_ouverture": {
      "type": "boolean"
     },
     "duree_h": {
      "type": "number",
      "minimum": 0
     },
     "nb_techniciens": {
      "type": "integer",
      "minimum": 1
     },
     "cout_eur": {
      "type": "number",
      "minimum": 0
     }
    }
   }
  },
  "pieces": {
   "type": "array",
   "items": {
    "$ref": "#/$defs/piece"
   }
  },
  "equipements": {
   "type": "array",
   "minItems": 1,
   "items": {
    "$ref": "#/$defs/equipement"
   }
  }
 },
 "$defs": {
  "piece": {
   "type": "object",
   "required": [
    "ref",
    "designation",
    "prix_unitaire_eur"
   ],
   "additionalProperties": false,
   "properties": {
    "ref": {
     "type": "string",
     "pattern": "^P-[A-Z]{3}-[0-9]{2}$"
    },
    "designation": {
     "type": "string"
    },
    "prix_unitaire_eur": {
     "type": "number",
     "minimum": 0
    },
    "delai_standard_semaines": {
     "type": "number",
     "minimum": 0
    },
    "stock_initial": {
     "type": "integer",
     "minimum": 0
    },
    "stock_mini": {
     "type": "integer",
     "minimum": 0
    }
   }
  },
  "mode": {
   "type": "object",
   "required": [
    "id_mode",
    "id_sous_ensemble",
    "designation",
    "loi",
    "beta",
    "eta_h",
    "gamma_h",
    "effet_correctif",
    "mttr_actif_h",
    "depannage_provisoire"
   ],
   "additionalProperties": false,
   "properties": {
    "id_mode": {
     "type": "string",
     "pattern": "^[A-Z]{3}-M[0-9]+$"
    },
    "id_sous_ensemble": {
     "type": "string"
    },
    "designation": {
     "type": "string"
    },
    "loi": {
     "enum": [
      "exponentielle",
      "weibull"
     ]
    },
    "beta": {
     "type": "number",
     "exclusiveMinimum": 0,
     "description": "Paramètre de forme (sans unité)"
    },
    "eta_h": {
     "type": "number",
     "exclusiveMinimum": 0,
     "description": "Paramètre d'échelle, en heures de fonctionnement"
    },
    "gamma_h": {
     "type": "number",
     "minimum": 0,
     "description": "Paramètre de position, en heures"
    },
    "lambda_par_h": {
     "type": [
      "number",
      "null"
     ],
     "exclusiveMinimum": 0,
     "description": "Taux de défaillance constant (1/h) si loi exponentielle"
    },
    "mtbf_theorique_h": {
     "type": "number",
     "exclusiveMinimum": 0,
     "description": "gamma + eta·Γ(1+1/β), en heures"
    },
    "effet_correctif": {
     "enum": [
      "renouvellement",
      "reparation_minimale"
     ],
     "description": "renouvellement : âge remis à 0 ; réparation minimale : âge inchangé"
    },
    "mttr_actif_h": {
     "type": "number",
     "exclusiveMinimum": 0,
     "description": "Moyenne des durées de réparation active (h)"
    },
    "sigma_log_reparation": {
     "type": "number",
     "minimum": 0,
     "description": "Écart-type du logarithme des durées de réparation (loi log-normale)"
    },
    "pieces_corrective": {
     "type": "array",
     "items": {
      "type": "string"
     },
     "description": "Pièces consommables en correctif pour ce mode"
    },
    "pieces_preventive": {
     "type": "array",
     "items": {
      "type": "string"
     },
     "description": "Pièces consommables en préventif pour ce mode"
    },
    "mode_detection": {
     "type": "string"
    },
    "probabilite_piece_en_stock": {
     "type": "number",
     "minimum": 0,
     "maximum": 1
    },
    "depannage_provisoire": {
     "type": "object",
     "additionalProperties": false,
     "required": [
      "autorise",
      "ratio_reparation_active",
      "duree_reparation_active_h",
      "pieces",
      "reapparition_apres_h",
      "annule_par_curatif_differe"
     ],
     "description": "Règle du dépannage provisoire (action palliative). Détection et remise en service inchangées.",
     "properties": {
      "autorise": {
       "type": "boolean",
       "description": "false si un palliatif n'a pas de sens métier pour ce mode"
      },
      "ratio_reparation_active": {
       "type": "number",
       "exclusiveMinimum": 0,
       "maximum": 1,
       "description": "Part de mttr_actif_h (0,4)"
      },
      "duree_reparation_active_h": {
       "type": "number",
       "minimum": 0.25,
       "multipleOf": 0.25,
       "description": "Valeur figée = ratio × mttr_actif_h, arrondie au ¼ h le plus proche, minimum 0,25 h"
      },
      "pieces": {
       "type": "array",
       "maxItems": 0,
       "description": "Aucune pièce consommée"
      },
      "reapparition_apres_h": {
       "type": "number",
       "exclusiveMinimum": 0,
       "description": "La panne revient après ce temps d'ouverture (le mode n'est pas remis à neuf)"
      },
      "annule_par_curatif_differe": {
       "type": "boolean",
       "description": "true : une réparation curative différée faite le samedi (hors ouverture) annule la réapparition"
      },
      "justification": {
       "type": [
        "string",
        "null"
       ],
       "description": "Motif métier quand autorise = false"
      }
     },
     "if": {
      "properties": {
       "autorise": {
        "const": false
       }
      }
     },
     "then": {
      "required": [
       "justification"
      ],
      "properties": {
       "justification": {
        "type": "string",
        "minLength": 10
       }
      }
     }
    },
    "periode_optimale": {
     "type": "object",
     "required": [
      "modele",
      "cout_preventif_eur",
      "cout_defaillance_moyen_eur"
     ],
     "additionalProperties": false,
     "description": "Données du préventif systématique : Cp, Cc et modèle de période optimale",
     "properties": {
      "modele": {
       "enum": [
        "remplacement_selon_age",
        "remplacement_periodique_reparation_minimale"
       ]
      },
      "cout_preventif_eur": {
       "type": "number",
       "minimum": 0,
       "description": "Cp : coût d'une intervention préventive"
      },
      "cout_defaillance_moyen_eur": {
       "type": "number",
       "minimum": 0,
       "description": "Cc : coût complet moyen d'une défaillance (direct + indirect)"
      },
      "periode_optimale_h": {
       "type": "number",
       "exclusiveMinimum": 0
      },
      "periode_retenue_semaines": {
       "type": "integer",
       "minimum": 1
      }
     }
    }
   },
   "allOf": [
    {
     "if": {
      "properties": {
       "loi": {
        "const": "exponentielle"
       }
      }
     },
     "then": {
      "properties": {
       "beta": {
        "const": 1
       },
       "gamma_h": {
        "const": 0
       },
       "lambda_par_h": {
        "type": "number"
       }
      }
     }
    }
   ]
  },
  "equipement": {
   "type": "object",
   "required": [
    "id_equipement",
    "designation",
    "fonction",
    "cadence_nominale_bouteilles_par_h",
    "goulot",
    "penalite_arret_eur_par_h",
    "sous_ensembles",
    "modes"
   ],
   "additionalProperties": false,
   "properties": {
    "id_equipement": {
     "type": "string",
     "pattern": "^[A-Z]{3}$"
    },
    "designation": {
     "type": "string"
    },
    "fonction": {
     "type": "string"
    },
    "cadence_nominale_bouteilles_par_h": {
     "type": "number",
     "exclusiveMinimum": 0
    },
    "goulot": {
     "type": "boolean"
    },
    "penalite_arret_eur_par_h": {
     "type": "number",
     "minimum": 0
    },
    "sous_ensembles": {
     "type": "array",
     "minItems": 1,
     "items": {
      "type": "object",
      "required": [
       "id_sous_ensemble",
       "designation"
      ],
      "properties": {
       "id_sous_ensemble": {
        "type": "string"
       },
       "designation": {
        "type": "string"
       }
      }
     }
    },
    "modes": {
     "type": "array",
     "minItems": 1,
     "items": {
      "$ref": "#/$defs/mode"
     }
    },
    "mtbf_theorique_equipement_h": {
     "type": [
      "number",
      "null"
     ]
    }
   }
  }
 }
}
```
</details>

<details><summary>schema_historique.json (texte intégral)</summary>

```json
{
 "$schema": "https://json-schema.org/draft/2020-12/schema",
 "$id": "https://example.org/jeu-maintenance/schema_historique.json",
 "title": "Historique GMAO des interventions — jeu sérieux BTS MS",
 "description": "Tableau d'événements. Durées en heures d'ouverture (_h), coûts en euros HT (_eur). Types de maintenance d'après NF EN 13306. Règle : duree_arret_totale_h = détection + attente logistique + réparation active + remise en service (vérifiée par le script, pas exprimable en JSON Schema).",
 "type": "array",
 "items": {
  "$ref": "#/$defs/evenement"
 },
 "$defs": {
  "piece_consommee": {
   "type": "object",
   "required": [
    "ref",
    "quantite",
    "prix_unitaire_eur"
   ],
   "additionalProperties": false,
   "properties": {
    "ref": {
     "type": "string"
    },
    "quantite": {
     "type": "integer",
     "minimum": 1
    },
    "prix_unitaire_eur": {
     "type": "number",
     "minimum": 0
    }
   }
  },
  "evenement": {
   "type": "object",
   "additionalProperties": false,
   "required": [
    "id_evenement",
    "source",
    "id_equipement",
    "id_sous_ensemble",
    "id_mode_defaillance",
    "type_maintenance",
    "debut_arret",
    "fin_arret",
    "hors_temps_ouverture",
    "duree_detection_h",
    "duree_attente_logistique_h",
    "duree_reparation_active_h",
    "duree_remise_en_service_h",
    "duree_arret_totale_h",
    "nb_techniciens",
    "heures_main_oeuvre_h",
    "pieces",
    "cout_direct_eur",
    "cout_indirect_eur",
    "cout_total_eur"
   ],
   "properties": {
    "id_evenement": {
     "type": "string",
     "pattern": "^[A-Z]{2}-[0-9]{4}$"
    },
    "source": {
     "enum": [
      "exercice",
      "simulation",
      "partie"
     ]
    },
    "id_equipement": {
     "type": "string",
     "pattern": "^[A-Z]{3}$"
    },
    "id_sous_ensemble": {
     "type": "string"
    },
    "id_mode_defaillance": {
     "type": "string"
    },
    "description": {
     "type": "string"
    },
    "type_maintenance": {
     "enum": [
      "corrective_immediate",
      "corrective_differee",
      "preventive_systematique",
      "preventive_conditionnelle",
      "preventive_previsionnelle",
      "amelioration"
     ]
    },
    "action": {
     "enum": [
      "depannage",
      "reglage",
      "reparation",
      "remplacement",
      "inspection",
      "nettoyage"
     ]
    },
    "reparation_provisoire": {
     "type": "boolean",
     "description": "vrai = action palliative (dépannage), faux = action curative"
    },
    "debut_arret": {
     "type": "string",
     "format": "date-time",
     "description": "ISO 8601 avec décalage horaire (Europe/Paris)"
    },
    "fin_arret": {
     "type": "string",
     "format": "date-time"
    },
    "hors_temps_ouverture": {
     "type": "boolean"
    },
    "debut_arret_h_ouverture": {
     "type": [
      "number",
      "null"
     ],
     "minimum": 0,
     "description": "Instant de début en heures d'ouverture depuis le début de la période"
    },
    "tbf_precedent_h": {
     "type": [
      "number",
      "null"
     ],
     "minimum": 0,
     "description": "Temps de bon fonctionnement depuis la remise en service précédente du même équipement"
    },
    "duree_detection_h": {
     "type": "number",
     "minimum": 0
    },
    "duree_attente_logistique_h": {
     "type": "number",
     "minimum": 0
    },
    "duree_reparation_active_h": {
     "type": "number",
     "minimum": 0
    },
    "duree_remise_en_service_h": {
     "type": "number",
     "minimum": 0
    },
    "duree_arret_totale_h": {
     "type": "number",
     "minimum": 0
    },
    "nb_techniciens": {
     "type": "integer",
     "minimum": 0
    },
    "intervenant": {
     "enum": [
      "interne",
      "sous_traitance",
      "mixte"
     ]
    },
    "heures_main_oeuvre_h": {
     "type": "number",
     "minimum": 0
    },
    "pieces": {
     "type": "array",
     "items": {
      "$ref": "#/$defs/piece_consommee"
     }
    },
    "cout_pieces_eur": {
     "type": "number",
     "minimum": 0
    },
    "cout_main_oeuvre_eur": {
     "type": "number",
     "minimum": 0
    },
    "cout_sous_traitance_eur": {
     "type": "number",
     "minimum": 0
    },
    "cout_direct_eur": {
     "type": "number",
     "minimum": 0
    },
    "penalite_arret_eur_par_h": {
     "type": "number",
     "minimum": 0
    },
    "cout_arret_production_eur": {
     "type": "number",
     "minimum": 0
    },
    "nb_rebuts_bouteilles": {
     "type": "integer",
     "minimum": 0
    },
    "cout_rebuts_eur": {
     "type": "number",
     "minimum": 0
    },
    "cout_indirect_eur": {
     "type": "number",
     "minimum": 0
    },
    "cout_total_eur": {
     "type": "number",
     "minimum": 0
    }
   }
  }
 }
}
```
</details>

---

## 9. Points incertains, choix à valider par Steph

1. **Répartition 1re / 2e année** : c'est une proposition ; le référentiel 2022 ne la fixe pas. Le guide « Repères pour la formation du BTS MS », qui précise les limites des savoirs S9, n'a pas été consulté. À vérifier : le niveau attendu pour Weibull (ajustement, γ), la période optimale et l'AMDEC.
2. **Codes du référentiel** : codes et intitulés C11 à C53, tâches T1-1 à T5-3 et savoirs S9.1 à S9.8 vérifiés sur Légifrance (version en vigueur au 21/11/2026, après l'arrêté du 24/06/2025). Je n'ai pas vérifié si l'arrêté de 2025 a modifié autre chose que l'annexe II b (par exemple les épreuves).
3. **NF EN 13306:2018** : texte payant non consulté en entier. Les définitions (MOTBF/MTBF, MTTR = *mean time to restoration*, MRT) s'appuient sur l'IEC 60050-192 et sur des extraits de l'EN 13306. Les **intitulés français exacts** (par exemple « réparation provisoire ») sont à vérifier sur l'exemplaire AFNOR.
4. **FD X60-000** : cité pour le cadre de la fonction maintenance et les niveaux d'intervention ; son contenu détaillé n'a pas été consulté.
5. **Grilles AMDEC, seuils de criticité, seuils ABC 80/95 %, règle P-F/2, seuil vibratoire de 4,5 mm/s** : ce sont des **conventions** (d'entreprise ou d'usage), pas des exigences normatives. Je les présente comme telles.
6. **Période optimale** : décision de Steph, les **deux modèles** sont enseignés (A : réparation minimale ; B : remplacement selon l'âge, à la calculatrice avec le tableau de ∫R). Il reste à vérifier dans les « Repères pour la formation » s'ils sont attendus à l'examen.
7. **Écarts avec le GDD** : (a) pénalité unique de 1 200 €/h pour une ligne en série, au lieu de 800 / 1 200 €/h (GDD v0) ou 1 000 €/h (GDD v0.1) ; (b) rebut à 0,20 €/bouteille au lieu de 5 € ; (c) MO à 40 €/h (heures sup. 50 €/h) au lieu de 45 €/h (56 €/h), pour des calculs ronds ; (d) cadences de 11 000 à 15 000 b/h hors goulot, au lieu de 12 000 pour toutes dans le GDD v0.1 ; (e) mes paramètres de fiabilité diffèrent de ceux, provisoires, du tableau du GDD v0.1 (§ 4). Il faut **une seule source de vérité** : je propose `usine.json`.
8. **Prix des pièces, taux horaires, marge de 0,12 €/bouteille** : ordres de grandeur réalistes mais **fictifs**, sans devis réels.
9. **Historique simulé** : les jours fériés sont ignorés ; les pannes de machines différentes peuvent s'y chevaucher (machines simulées indépendamment). Le vieillissement continue pendant les arrêts induits par les autres machines, ce qui est une approximation.

---

## Annexe — Rappel des fichiers et commande de régénération

```
cd jeu-maintenance
python scripts/donnees.py    # usine.json, historiques (exercice + simulé, graine 2026)
python scripts/schemas.py    # schémas + validation jsonschema
python scripts/calculs.py    # corrigés + assertions -> scripts/resultats.json
python scripts/verif_texte.py # contrôle des valeurs écrites à la main
python scripts/rediger.py    # ce document
```
Dépendances : Python 3.11+, numpy, scipy, jsonschema (+ rfc3339-validator pour le contrôle des dates).

