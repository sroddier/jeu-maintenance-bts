# -*- coding: utf-8 -*-
import json
OUT="/workspace/jeu-maintenance/"
R=json.load(open(OUT+"scripts/resultats.json")); U=json.load(open(OUT+"usine.json")); H=json.load(open(OUT+"historique_pannes.json"))
SE=json.load(open(OUT+"schema_equipement.json")); SH=json.load(open(OUT+"schema_historique.json"))
def fr(x, d=None):
    if isinstance(x,(int,)) and d is None: s=f"{x:,}".replace(","," ")
    else:
        if d is None:
            d = 0 if float(x).is_integer() else (1 if round(x,1)==x else (2 if round(x,2)==x else 4))
        s=f"{x:,.{d}f}".replace(","," ").replace(".",",")
    return s
I=R["indicateurs"]; T=R["trs"]; W=R["weibull"]; PA=R["prev_A"]; PB=R["prev_B"]; C=R["couts"]; CF=R["calc_fiab"]; GT=R["gamma_table"]
EQ={e["id_equipement"]:e for e in U["equipements"]}
NOMS={"SOU":"Souffleuse","REM":"Remplisseuse","BOU":"Boucheuse","ETI":"Étiqueteuse","FAR":"Fardeleuse","CON":"Convoyeurs"}
ORD=["SOU","CON","REM","BOU","ETI","FAR"]
md=[]
A=md.append

# ======================= EN-TÊTE =======================
A(f"""# Cadrage métier — Serious game « Chef du service maintenance »

**BTS Maintenance des systèmes (MS), 1re et 2e année** · Lycée Antonin Artaud, Marseille · S. Roddier
Rédigé par l'Expert méthodes maintenance de l'équipe projet, le 21/11/2026. Version 1.0.

> **Statut des données.** L'usine « Boissons des Calanques », sa ligne L1, ses équipements, ses historiques et ses coûts sont **fictifs**. Ils ont été construits pour être réalistes (ordres de grandeur de l'agroalimentaire) et pour que **les calculs tombent juste à la calculatrice**. Tous les résultats chiffrés de ce document ont été recalculés en Python, avec une assertion d'exactitude pour chacun (scripts fournis).

**Fichiers livrés** (dossier `jeu-maintenance/`) :

| Fichier | Contenu |
|---|---|
| `cadrage-metier.md` | ce document |
| `usine.json` | usine, organisation, grille de coûts, pièces, 6 équipements et 13 modes de défaillance (paramètres de fiabilité) |
| `historique_pannes.csv` (+ `.json`) | **historique d'EXERCICE** : 10 semaines, construit à la main, déterministe, sommes rondes (28 lignes : 24 pannes + 4 interventions hors temps d'ouverture) |
| `historique_pannes_simule.csv` (+ `.json`) | **historique SIMULÉ pour le moteur de jeu** : 50 semaines, graine fixe 2026 ({R['sim_nb']} interventions). À ne pas utiliser pour les exercices notés |
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
""")

# ======================= 2. PROGRESSION =======================
A(f"""## 2. Progression en 6 niveaux

Alignée sur la boucle du GDD (1 tour = 1 semaine = 80 h d'ouverture ; phases Planifier / Événements / Intervenir / Bilan) et sur sa trame de niveaux 1 à 5. J'ajoute un **niveau 6 de synthèse**, pensé pour l'évaluation notée.

| Niv. | Titre | Année | Notions principales | Compétences (codes 2022) |
|---|---|---|---|---|
| 1 | Premier poste : la remplisseuse tombe en panne | 1re | correctif immédiat/différé, palliatif/curatif, TBF, TA, MTBF, MTTR, MDT | C11, C12, C13, C24, C51 |
| 2 | La ligne et son goulot | 1re | cadences, goulot, Ai/Ao, disponibilité d'une ligne en série, TRS = Do × Tp × Tq, coût d'arrêt | C41, C51 |
| 3 | Anticiper l'usure | 1re → 2e | lois exponentielle et Weibull, R(t), λ(t), MTBF de Weibull, préventif systématique / conditionnel / prévisionnel, stock mini | C21, C22, C23, C52 |
| 4 | Où agir d'abord ? | 2e | Pareto (N, temps d'arrêt, coûts), ABC du stock, ajustement de Weibull, choix de politique selon β | C51, C52 |
| 5 | Optimiser et maîtriser les risques | 2e | période optimale de préventif, AMDEC (C = F × G × D), coût global | C31, C51, C52, C53 |
| 6 | Bilan annuel du service | 2e | TRS/TRG/TRE, coûts directs et indirects, budget, compte rendu et soutenance | C24, C33, C51, C53 |

### Niveau 1 — Premier poste : la remplisseuse tombe en panne (1re année)
- **Objectifs** : distinguer une action **palliative** (dépannage, réparation provisoire) d'une action **curative** (réparation durable), et un correctif **immédiat** d'un correctif **différé**. Lire un historique GMAO, séparer temps de bon fonctionnement (TBF) et temps d'arrêt (TA), et calculer MTBF, MTTR et MDT.
- **Mécanique de jeu côté métier** : 1 machine (la remplisseuse, goulot), 2 techniciens. Le préventif « joints toutes les 4 semaines » est **imposé et non modifiable**. À chaque panne, le joueur choisit dépannage provisoire (rapide, la panne revient) ou réparation (plus long, durable), interne ou sous-traitance, et attente ou commande express de la pièce. En phase Bilan, il saisit MTBF, MTTR et MDT.
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
- **Objectifs** : calculer une **période optimale** de remplacement préventif ; mener une **AMDEC** sur la remplisseuse (C = F × G × D), hiérarchiser et proposer des actions qui font baisser F, G ou D ; raisonner en **coût global**.
- **Mécanique** : le joueur règle la période de remplacement des joints de vannes et voit la courbe coût par heure ; il cote 4 modes AMDEC et choisit des améliorations (contrôleur pondéral en ligne, capteur de vibration, etc.) avec leur coût et leur effet sur F, G ou D.
- **Compétences** : C31 (« le besoin est analysé, les données technico-économiques sont repérées ; le choix de la solution est pertinent et argumenté »), C51, C52, C53 (planification).
- **Critères** : T* juste ; criticités justes ; actions qui ciblent les modes au-dessus du seuil ; coût global en baisse.
- **Passage** : coût global ≤ 90 % de la partie de référence ; ≥ 2★.

### Niveau 6 — Bilan annuel du service (2e année, synthèse notée)
- **Objectifs** : sur l'historique simulé d'un an, produire le bilan : indicateurs par machine, TRS/TRG/TRE, coûts directs et indirects, plan d'actions pour l'année suivante.
- **Mécanique** : partie longue (12 tours) avec tous les leviers, événements spéciaux actifs ; export du bilan (écrit) et présentation de 5 min (oral, hors jeu).
- **Compétences** : C24 (écrit), C33 (oral), C51, C53.
- **Critères** : critères C51 de l'arrêté (cités au § 1) ; cohérence des propositions avec les indicateurs ; respect du budget.
- **Passage** : fin de parcours ; note = meilleure de 2 tentatives (décision de Steph, GDD v0.1).

---
""")

# ======================= 3. USINE =======================
o=U["organisation"]; c=U["couts"]
A(f"""## 3. L'usine fictive : Boissons des Calanques, ligne L1

**Produit** : {o['produit']}. **Horaires** : 2 postes × 8 h, du lundi au vendredi ({o['horaires']}), soit **80 h d'ouverture par semaine** (= 1 tour du jeu). Toutes les durées sont comptées en **heures d'ouverture** : une attente de pièce qui passe la nuit ne compte que les heures ouvrées.

**Flux** : Souffleuse → Convoyeurs → **Remplisseuse** → Boucheuse → Étiqueteuse → Convoyeurs → Fardeleuse.

### 3.1 Cadences et goulot

| Équipement | Cadence nominale (bouteilles/h) | Remarque |
|---|---|---|""")
for k in ORD:
    e=EQ[k]; A(f"| {NOMS[k]} | {fr(int(e['cadence_nominale_bouteilles_par_h']))} | {'**GOULOT** (cadence la plus faible)' if e['goulot'] else ''} |")
A(f"""
La cadence de la ligne est imposée par la **remplisseuse à 10 000 bouteilles/h**. Les autres machines sont volontairement surdimensionnées de 10 à 50 % (« courbe en V » classique des lignes d'embouteillage). L'écart de 1 000 bouteilles/h avec la machine suivante (souffleuse) rend le goulot immédiatement identifiable. Une heure de ligne perdue = 10 000 bouteilles × {fr(o['marge_sur_cout_variable_eur_par_bouteille'],2)} € de marge sur coût variable = **1 200 €/h**.

### 3.2 Équipements, sous-ensembles et modes de défaillance

Le temps t des lois est le **temps de fonctionnement** du mode (âge). « Renouvellement » : après la réparation, le composant est remis à neuf (âge = 0). « Réparation minimale » : on répare une seule vanne sur 24 et l'ensemble garde son âge (voir § 5.6).

| Mode | Équipement / sous-ensemble | Défaillance | Loi | β | η (h) | γ (h) | MTBF théorique (h) | Effet du correctif | MTTR actif (h) | Pièce (prix) | Détection |
|---|---|---|---|---|---|---|---|---|---|---|---|""")
PX={p["ref"]:p for p in U["pieces"]}
for k in ORD:
    e=EQ[k]
    for m in e["modes"]:
        pcs=", ".join(f"{p} ({fr(PX[p]['prix_unitaire_eur'])} €)" for p in m["pieces_corrective"]) or "—"
        loi="exponentielle (λ = 1/"+fr(m['eta_h'])+" h⁻¹)" if m["loi"]=="exponentielle" else "Weibull"
        A(f"| {m['id_mode']} | {NOMS[k]} / {m['id_sous_ensemble']} | {m['designation']} | {loi} | {fr(m['beta'])} | {fr(m['eta_h'])} | {fr(m['gamma_h'])} | {fr(m['mtbf_theorique_h'])} | {m['effet_correctif'].replace('_',' ')} | {fr(m['mttr_actif_h'])} | {pcs} | {m['mode_detection']} |")
A(f"""
Sous-ensembles : """+" ; ".join(f"**{NOMS[k]}** : "+", ".join(f"{s['id_sous_ensemble']} {s['designation']}" for s in EQ[k]["sous_ensembles"]) for k in ORD)+".")
A(f"""
**Pourquoi ce mélange de β (justification pédagogique)** :
- **β < 1 (CON-M1, β = 0,5)** : convoyeurs rénovés récemment, défauts de jeunesse (paramétrage, carte E/S, variateur). Le taux de défaillance **décroît** : un remplacement systématique **remettrait une pièce neuve, donc plus fragile**. La bonne réponse est un **rodage surveillé** et une **amélioration** (C31 : fiabiliser le paramétrage), pas du systématique.
- **β = 1 (SOU-M1, REM-M2, BOU-M2, ETI-M1, FAR-M1)** : pannes aléatoires (électronique, lampes, bourrages). Le taux est **constant** : changer une pièce qui fonctionne ne réduit pas le risque. La bonne réponse est le **correctif bien organisé** (pièce en stock, détection rapide) ou le **conditionnel** si un signe avant-coureur existe.
- **β = 2 ou 3 (SOU-M2, REM-M1, REM-M3, BOU-M1, ETI-M2, FAR-M2, CON-M2)** : usure. Le **préventif systématique** devient rentable si Cp ≪ Cc (§ 6.8). Le **conditionnel** est préféré quand une grandeur mesurable annonce la panne (vibrations du motoréducteur REM-M3, allongement de chaîne CON-M2).
- **γ > 0 (FAR-M2, γ = 100 h)** : une lame neuve ne s'émousse pas avant 100 h de coupe (durée sans défaillance).

### 3.3 Grille de coûts (définitive pour le jeu)

| Poste | Valeur | Justification |
|---|---|---|
| Main-d'œuvre interne | **{fr(c['taux_main_oeuvre_eur_par_h'])} €/h** | coût horaire chargé d'un technicien de maintenance (ordre de grandeur courant) ; nombre rond |
| Heures supplémentaires, samedi | **{fr(c['taux_main_oeuvre_heures_sup_eur_par_h'])} €/h** | + 25 % |
| Sous-traitance | **{fr(c['sous_traitance_eur_par_h'])} €/h + {fr(c['sous_traitance_deplacement_eur'])} € de déplacement**, arrivée en {fr(c['sous_traitance_delai_arrivee_h'])} h | valeurs du GDD conservées |
| Pièce en express | **+ {fr(c['majoration_express_pct'])} %**, livrée en {fr(c['delai_express_h'])} h d'ouverture (1 jour) | GDD |
| Pièce standard | délai 2 semaines (2 tours) | GDD |
| Possession du stock | {fr(c['cout_possession_stock_pct_par_an'])} %/an de la valeur, soit 0,4 %/semaine (sur 50 semaines) | GDD |
| **Pénalité d'arrêt** | **1 200 €/h pour tout arrêt de la ligne** (niveaux 1–2 : ligne en série sans accumulation) | 10 000 b/h × 0,12 € de marge |
| Pénalité avec accumulations (niveaux ≥ 3, option) | goulot : 1 200 €/h ; autres machines : arrêts de moins de 10 min absorbés, au-delà 1 200 €/h | aligné sur le GDD v0.1 (tables tampons 10 min) |
| Rebut | **{fr(o['cout_rebut_eur_par_bouteille'],2)} € par bouteille** (préforme, bouchon, étiquette, produit) | le « 5 € par pièce » du GDD v0 est irréaliste pour une bouteille d'1 L |

**Pièces de rechange** (prix HT fictifs, réalistes) :

| Réf. | Désignation | Prix unitaire (€) | Stock initial | Stock mini |
|---|---|---|---|---|""")
for p in U["pieces"]:
    A(f"| {p['ref']} | {p['designation']} | {fr(p['prix_unitaire_eur'])} | {p['stock_initial']} | {p['stock_mini']} |")
pi=U["politique_initiale"][0]
A(f"""
**Politique initiale (situation de départ)** : remplacement systématique du kit complet de joints des 24 vannes (P-REM-02) **toutes les 4 semaines**, le samedi, hors temps d'ouverture : 7,5 h + 0,5 h de remise en service, 1 technicien en heures supplémentaires. Coût = 600 + 8 × 50 = **1 000 €**, sans perte de production. Tout le reste est en correctif.

---
""")

# ======================= 4. HISTORIQUES =======================
import datetime as dt
TYP={"corrective_immediate":"correctif immédiat","corrective_differee":"correctif différé","preventive_systematique":"préventif systématique"}
A("""## 4. Les historiques

### 4.1 Historique d'EXERCICE (`historique_pannes.csv`) — déterministe, construit à la main

Période : 10 semaines, du lundi 05/01/2026 au vendredi 13/03/2026 (fictif). **Temps requis de chaque machine Tr = 800 h**. Aucune panne n'en chevauche une autre (vérifié par script) : la ligne ne subit qu'une panne à la fois. Les 4 interventions **hors temps d'ouverture** (le samedi) ne réduisent pas le temps requis. Heures au format local (UTC+1).

| N° | Début d'arrêt | Machine | Mode | Type | Action | Détection | Attente | Réparation | Remise en service | **TA** | TBF précédent | Pièces | Coût direct (€) | Coût indirect (€) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|""")
for e in H:
    d=dt.datetime.fromisoformat(e["debut_arret"]).strftime("%d/%m %H:%M")
    act={"reglage":"réglage","depannage":"dépannage","nettoyage":"nettoyage (bourrage)","remplacement":"remplacement","reparation":"réparation","inspection":"inspection"}[e["action"]]+(" (provisoire)" if e["reparation_provisoire"] else "")
    pcs=", ".join(f"{p['ref']}×{p['quantite']}" for p in e["pieces"]) or "—"
    tbf="—" if e["tbf_precedent_h"] is None else fr(e["tbf_precedent_h"])
    A(f"| {e['id_evenement']} | {d} | {e['id_equipement']} | {e['id_mode_defaillance']} | {TYP[e['type_maintenance']]}{' (hors ouverture)' if e['hors_temps_ouverture'] else ''} | {act} | {fr(e['duree_detection_h'])} | {fr(e['duree_attente_logistique_h'])} | {fr(e['duree_reparation_active_h'])} | {fr(e['duree_remise_en_service_h'])} | **{fr(e['duree_arret_totale_h'])}** | {tbf} | {pcs} | {fr(e['cout_direct_eur'])} | {fr(e['cout_indirect_eur'])} |")
A(f"""
Durées en heures. Pour les interventions hors ouverture, la colonne TA donne la durée de l'intervention, qui n'est **pas** un arrêt de production. « TBF précédent » = temps de bon fonctionnement depuis la fin de l'arrêt précédent de la même machine (ou depuis le début de la période). Pour chaque machine, ΣTBF de la colonne + TBF final jusqu'à 800 h = 800 − ΣTA (vérifié par assertion).

**Sommes rondes par machine** : ΣTA = 80 / 48 / 16 / 8 / 4 / 4 h (REM / ETI / SOU / BOU / FAR / CON), total 160 h ; N = 4 / 8 / 4 / 2 / 2 / 4, total 24 pannes.

### 4.2 Historique SIMULÉ (`historique_pannes_simule.csv`) — pour le moteur de jeu uniquement

50 semaines d'ouverture (année 2025 fictive, fermeture du 04 au 15/08, jours fériés ignorés), soit 4 000 h, **graine 2026** (`numpy.random.default_rng`).
Modèle : chaque mode tire sa prochaine défaillance selon sa loi, et son âge ne progresse que pendant que la machine fonctionne. Les modes en renouvellement repartent à 0 après réparation. REM-M1 est en réparation minimale (processus de Poisson non homogène à loi puissance), avec un renouvellement à chaque préventif des 4 semaines. Réparation active : loi log-normale de moyenne égale au MTTR du mode (σ du logarithme = 0,5, arrondie au ¼ h). Attente : 0,25 h si la pièce est en stock, sinon 16 h (express), selon la probabilité de stock du mode.

**Vérification de cohérence avec les paramètres.**

*a) Moteur validé sur une très longue simulation* (graine 1, 50 000 semaines = 4 000 000 h) : écart entre la moyenne simulée des âges à la défaillance et le MTBF théorique γ + η·Γ(1+1/β), et entre le MTBF équipement simulé et le MTBF théorique (régime établi : 1/MTBF = Σ 1/MTBF_mode). Tolérance des assertions : 3 %.

| Mode | n | Âge moyen à la défaillance simulé (h) | Théorique (h) |
|---|---|---|---|""")
for k,v in R["simL_modes"].items():
    if v["moy"] is not None: A(f"| {k} | {fr(v['n'])} | {fr(v['moy'],1)} | {fr(v['th'],1)} |")
v=R["simL_modes"]["REM-M1"]
A(f"| REM-M1 (réparation minimale) | {fr(v['n'])} défaillances | attendu Σ(a_k/η)^β = {fr(v['attendu'],1)} sur {fr(v['cycles'])} cycles | écart {fr(round((v['n']/v['attendu']-1)*100,1),1)} % |")
A("""
| Équipement | MTBF simulé, long terme (h) | MTBF théorique (h) | MTTR simulé (h) |
|---|---|---|---|""")
for k in ORD:
    th=R["mtbf_th_eq"].get(k)
    A(f"| {NOMS[k]} | {fr(R['simL_ind'][k]['MTBF'],1)} | {fr(th,1) if th else 'dépend de la période de préventif'} | {fr(R['simL_ind'][k]['MTTR'],2)} |")
A(f"""
*b) Année de jeu (graine 2026, 4 000 h)* : petits échantillons, donc écarts aléatoires normaux. C'est bien d'en parler en classe : 4 pannes ne suffisent pas pour estimer un MTBF précis.

| Équipement | N pannes | MTBF (h) | MTTR (h) | MDT (h) | Ao (%) |
|---|---|---|---|---|---|""")
for k in ORD:
    s=R["sim_ind"][k]; A(f"| {NOMS[k]} | {s['N']} | {fr(s['MTBF'],1)} | {fr(s['MTTR'],2)} | {fr(s['MDT'],2)} | {fr(s['Ao'],2)} |")
A(f"""
Préventifs REM-M1 réalisés dans l'année : {R['sim_nb_prev']} ; défaillances REM-M1 : {R['sim_modes']['REM-M1']['n']} (attendu {fr(R['sim_modes']['REM-M1']['attendu'],1)}). Les MTBF d'exercice (§ 6) sont cohérents avec ces valeurs : par exemple étiqueteuse 94 h contre 89,9 h théoriques, remplisseuse 180 h contre 187 h simulées sur le long terme avec la politique initiale.

---
""")

# ======================= 5. FORMULES =======================
gt="\n".join(f"| {fr(b)} | {fr(v,4)} |" for b,v in [(float(k),v) for k,v in GT.items()])
A(f"""## 5. Formules et terminologie (NF EN 13306:2018, FD X60-000, NF E60-182, IEC 60812)

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
{gt}

### 5.5 Ajustement de Weibull (méthode BTS)
1. Classer les n TBF par ordre croissant : t₁ ≤ … ≤ tₙ.
2. Fréquence cumulée par les **rangs médians de Bernard** : F(tᵢ) = (i − 0,3)/(n + 0,4). Pour n > 50, on peut prendre i/(n + 1) ou i/n : à préciser dans la consigne.
3. Linéarisation : **Y = ln(ln(1/(1 − F)))** et **X = ln t**. Si γ = 0, Y = β·X − β·ln η, c'est une droite.
4. Lecture graphique sur papier d'Allan Plait (β lu sur l'échelle de pente, η à F = 63,2 %), ou régression linéaire à la calculatrice : **β = pente**, **η = exp(−ordonnée à l'origine / β)**.
5. Si les points dessinent une courbe et non une droite : chercher γ ≠ 0 (translation des t), ou soupçonner un mélange de modes.

### 5.6 Période optimale de préventif systématique

**Modèle A — remplacement périodique avec réparations minimales** (calculable à la calculatrice ; c'est le cas des joints des 24 vannes : réparer une vanne ne rajeunit pas l'ensemble). Défaillances attendues sur [0 ; T] : H(T) = (T/η)^β. Coût moyen par heure :

  **C(T) = [Cp + Cc · (T/η)^β] / T** ; dC/dT = 0 ⇒ **T* = η · [Cp / (Cc · (β − 1))]^(1/β)**, qui n'existe que si **β > 1**.

**Modèle B — remplacement selon l'âge** (renouvellement à chaque panne ; calcul numérique, pour le moteur de jeu et le prof) :

  **C(T) = [Cp · R(T) + Cc · F(T)] / ∫₀^T R(t) dt**, à minimiser numériquement. Si T → ∞, C → Cc / MTBF (tout correctif).

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
""")

# ======================= 6. CORRIGÉS =======================
rem=[e for e in H if e["id_equipement"]=="REM" and not e["hors_temps_ouverture"]]
A(f"""## 6. Corrigés complets (données d'exercice, calculatrice)

Toutes les valeurs ci-dessous sont recalculées par `scripts/calculs.py` (fractions exactes et assertions). Sauf mention contraire, le temps requis est **Tr = 800 h par machine** (10 semaines × 80 h).

### 6.1 Identifier le goulot (niveau 2)
Cadences : SOU 11 000, CON 15 000, **REM 10 000**, BOU 11 500, ETI 12 000, FAR 13 000 bouteilles/h. **Goulot = remplisseuse** (la plus faible cadence). Capacité théorique de la ligne : 10 000 bouteilles/h, soit 800 000 bouteilles par semaine de 80 h.

### 6.2 Remplisseuse : MTBF, MTTR, MDT, Ai, Ao (niveau 1)

| Panne | Mode | Détection | Attente | Réparation | Remise en service | TA |
|---|---|---|---|---|---|---|""")
for e in rem:
    A(f"| {e['id_evenement']} | {e['id_mode_defaillance']} | {fr(e['duree_detection_h'])} | {fr(e['duree_attente_logistique_h'])} | {fr(e['duree_reparation_active_h'])} | {fr(e['duree_remise_en_service_h'])} | {fr(e['duree_arret_totale_h'])} |")
r=I["REM"]
A(f"""| **Total** | | 1,5 | 46 | 30 | 2,5 | **80** |

- N = 4 défaillances ; ΣTA = 3 + 20 + 3 + 54 = **80 h**
- ΣTBF = Tr − ΣTA = 800 − 80 = **720 h**
- **MTBF = 720 / 4 = 180 h**
- **MTTR = Σ réparations actives / N = 30 / 4 = 7,5 h**
- **MDT = ΣTA / N = 80 / 4 = 20 h** (= 7,5 de réparation + 11,5 d'attente + 1 de détection et remise en service, en moyenne)
- **Ao = 720 / 800 = 90 %** (ou MUT/(MUT + MDT) = 180/(180 + 20) = 90 %)
- **Ai = MTBF / (MTBF + MTTR) = 180 / 187,5 = 96 %**
- Interprétation : 6 points d'écart entre Ai et Ao, dus à la **logistique** (46 h d'attente de pièces, dont 30 h pour le motoréducteur non stocké). Le levier principal est le stock, pas la technique.
- Palliatif / curatif : sur l'étiqueteuse, EX-0002 et EX-0013 sont des **dépannages provisoires** (palliatif, correctif immédiat). Ils sont suivis des remplacements de la cellule **EX-0201 et EX-0202** (curatif, correctif **différé** au samedi).

### 6.3 Indicateurs des 6 machines (niveau 2)

| Machine | N | ΣTA (h) | ΣTBF (h) | MTBF (h) | MTTR (h) | MDT (h) | **Ao** | Ai (exacte → attendue) |
|---|---|---|---|---|---|---|---|---|""")
for k in ["REM","ETI","SOU","BOU","FAR","CON"]:
    x=I[k]
    ai = f"{fr(x['Ai_pct_exact'],0)} % (exacte)" if x["Ai_exact"] else f"{fr(x['Ai_pct_exact'],3)} % → **{fr(x['Ai_pct_arrondi'],1)} %**"
    A(f"| {NOMS[k]} | {x['N']} | {fr(x['somme_TA_h'])} | {fr(x['somme_TBF_h'])} | {fr(x['MTBF_h'])} | {fr(x['MTTR_h'])} | {fr(x['MDT_h'])} | **{fr(x['Ao_pct'])} %** | {ai} |")
ds=R["dispo_serie"]
A(f"""
Ao et MTBF tombent juste pour toutes les machines. Ai ne tombe juste que pour la remplisseuse : pour les autres, **demander Ai arrondie à 0,1 %** (ou ne la demander que pour REM).

**Disponibilité de la ligne en série** (aucun chevauchement) : (800 − 160)/800 = **{fr(ds['somme'])} %**. Avec l'approximation par le produit : 0,90 × 0,94 × 0,98 × 0,99 × 0,995 × 0,995 = **{fr(ds['produit'],2)} %**. L'écart montre que le produit n'est qu'une approximation (il suppose des pannes indépendantes qui peuvent se superposer).

### 6.4 TRS, TRG, TRE de la ligne (niveaux 2 et 6)
Données de production (fictives) sur les 10 semaines : Tt = 10 × 168 = **1 680 h** ; To = **800 h** ; pas d'arrêt planifié dans l'ouverture, donc **Tr = 800 h** ; pannes de la remplisseuse 80 h ; arrêts **induits** par les pannes des autres machines (ligne en série) 80 h ; changements de format 40 h ; production réalisée **{fr(T['production'])}** bouteilles, dont **{fr(T['bonnes'])}** bonnes ({fr(T['rebuts'])} rebutées) ; cadence nominale 10 000 b/h.

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
- **Probabilité de panne dans le tour** (BOU-M1, âge 400 h, Δt = 80 h) : 1 − exp[−((480/500)² − (400/500)²)] = 1 − e^(−0,2816) = **{fr(CF['P_BOU_sem_age400'],4)}**.
- **Stock mini (point de commande) de la cellule P-ETI-01** : consommation moyenne = λ × 80 h = 0,8 cellule par semaine (hypothèse : 1 cellule par panne) ; délai standard 2 semaines → 0,8 × 2 = 1,6 ; plus 1 en stock de sécurité = 2,6 → **3** (arrondi à l'entier supérieur).
- **Conditionnel** (REM-M3, motoréducteur) : intervalle P-F (de la détection d'une hausse vibratoire à la panne) supposé égal à **400 h** (fictif). Règle usuelle : inspecter au plus tous les P-F/2 = **200 h**, soit une ronde au moins toutes les 2 semaines. Le jeu propose une ronde chaque semaine.
- **Prévisionnel** : vitesse vibratoire efficace mesurée à 2,5 mm/s, en hausse de 0,25 mm/s par semaine, et seuil d'alarme fixé par l'entreprise à 4,5 mm/s. Dépassement prévu dans (4,5 − 2,5)/0,25 = **8 semaines** : on commande le motoréducteur (délai 2 semaines) et on planifie le remplacement un samedi avant cette échéance.

### 6.6 Pareto et ABC (niveau 4)
**Pareto des temps d'arrêt** (total 160 h) :

| Rang | Machine | ΣTA (h) | % | % cumulé | Classe | N |
|---|---|---|---|---|---|---|""")
for i,p in enumerate(R["pareto"],1):
    A(f"| {i} | {NOMS[p['eq']]} | {fr(p['TA'])} | {fr(p['pct'])} | {fr(p['cumul'])} | **{p['classe']}** | {p['N']} |")
A(f"""
Lecture : **REM + ETI = 80 % des arrêts** (classe A). En **nombre** de pannes, l'étiqueteuse est première (8 sur 24) et la remplisseuse n'arrive qu'à égalité avec SOU et CON (4 chacune). C'est le piège classique : il faut un Pareto en **temps** (ou en coût) pour hiérarchiser. Sur le graphique N–MDT, ETI (N = 8, MDT = 6 h) relève de la **fiabilité et de la logistique** (attente du technicien), REM (N = 4, MDT = 20 h) de la **maintenabilité et de la logistique** (pièces non stockées). Égalité FAR/CON (4 h) : les deux sont en C, l'ordre entre elles n'a pas d'importance.

**Pareto des coûts** (correctif en temps d'ouverture, 10 semaines) : REM {fr(I['REM']['cout_total_eur'])} € ; ETI {fr(I['ETI']['cout_total_eur'])} € ; SOU {fr(I['SOU']['cout_total_eur'])} € ; BOU {fr(I['BOU']['cout_total_eur'])} € ; CON {fr(I['CON']['cout_total_eur'])} € ; FAR {fr(I['FAR']['cout_total_eur'])} €. Même classement que le Pareto des temps d'arrêt, car le coût indirect (1 200 €/h) domine.

**ABC du stock** (consommation annuelle prévisionnelle, total 50 000 €) :

| Réf. | Désignation | Qté/an | Prix (€) | Valeur (€) | % | % cumulé | Classe |
|---|---|---|---|---|---|---|---|""")
for x in R["abc"]:
    A(f"| {x['ref']} | {x['designation']} | {x['qte_an']} | {fr(x['prix'])} | {fr(x['valeur'])} | {fr(x['pct'])} | {fr(x['cumul'])} | **{x['classe']}** |")
A(f"""
Classe A = 3 références sur 10 (30 %) pour 80 % de la valeur : gestion serrée (suivi individuel, révision fréquente du stock mini). C = 4 références (40 %) pour 5 % : gestion simple. Attention : l'ABC classe la **valeur consommée**, pas la **criticité**. Le motoréducteur P-REM-04 (classe A en valeur, non stocké) est aussi **critique** (54 h d'arrêt sur EX-0017) : la décision de le stocker se prend avec le coût d'arrêt, pas avec l'ABC seul.

### 6.7 Ajustement de Weibull (niveau 4)
Relevé fictif sur 3 ans des TBF des **têtes de vissage BOU-M1** (6 valeurs, en heures) : **{', '.join(str(t) for t in W['t'])}**.

| i | tᵢ (h) | F = (i − 0,3)/6,4 | X = ln t | Y = ln ln(1/(1 − F)) |
|---|---|---|---|---|""")
for i,(t,f,x,y) in enumerate(zip(W['t'],W['F_bernard'],W['X'],W['Y']),1):
    A(f"| {i} | {t} | {fr(f,4)} | {fr(x,4)} | {fr(y,4)} |")
A(f"""
Régression Y = βX + b (calculatrice) : **β = {fr(W['beta_reg'],3)} ≈ 2,0** ; **η = exp(−b/β) = {fr(W['eta_reg'],1)} h ≈ 500 h** ; r = {fr(W['r'],4)}. Les points sont alignés, donc γ = 0. Conclusion : β ≈ 2 > 1, **usure** → préventif systématique envisageable (§ 6.8, modèle B) ou conditionnel (contrôle de couple).
*Remarque pour le prof* : le maximum de vraisemblance (hors programme) donne β ≈ {fr(W['beta_mle'],1)} et η ≈ {fr(W['eta_mle'],0)} h sur ces 6 valeurs. 6 points, c'est peu ; la conclusion « usure » ne change pas. Seule la méthode des rangs médians est attendue.

### 6.8 Période optimale de préventif (niveau 5)
**Joints des vannes REM-M1, modèle A** (réparation minimale). β = 3 ; η = 300 h.
- Cp = kit complet 600 € + 8 h × 50 € (samedi) = **1 000 €**, sans perte de production.
- Cc = coût d'une fuite de joint (EX-0004) = 50 € de pièces + 110 € de main-d'œuvre + 3 h × 1 200 € + 240 € de rebuts = **4 000 €**.
- **T* = 300 × [1 000 / (4 000 × 2)]^(1/3) = 300 × (1/8)^(1/3) = 300 × 0,5 = 150 h**
- **C(T*) = [1 000 + 4 000 × 0,5³] / 150 = 1 500/150 = 10 €/h**

| T (h) | """+" | ".join(fr(t) for t,_ in PA['tab'])+""" |
|---|"""+"---|"*len(PA['tab'])+"""
| C(T) (€/h) | """+" | ".join(fr(v,2) for _,v in PA['tab'])+f""" |

Décision : remplacer les joints **toutes les 2 semaines** (160 h ≈ T*, avec C = 10,04 €/h : la courbe est plate autour de l'optimum, donc on arrondit au rythme des tours). La politique actuelle (4 semaines = 320 h, C = 18,30 €/h) coûte environ (18,30 − 10,04) × 4 000 h ≈ **33 000 € par an** de plus.

**Contre-exemple β = 1** (ETI-M1, modèle B, Cp = 180 €, Cc = 1 400 €, η = 100 h) : C(50) = {fr(R['prev_beta1'][0],2)} ; C(100) = {fr(R['prev_beta1'][1],2)} ; C(200) = {fr(R['prev_beta1'][2],2)} ; C(400) = {fr(R['prev_beta1'][3],2)} ; C(800) = {fr(R['prev_beta1'][4],2)} €/h. C(T) **décroît** vers Cc/η = 14 €/h : **le systématique ne se justifie jamais** pour β = 1.

**Têtes de vissage BOU-M1, modèle B** (renouvellement, calcul numérique pour le moteur ; hors calculatrice) : β = 2, η = 500 h, Cp = 1 000 €, Cc = 900 + 100 + 4 h × 1 200 = 5 800 €. Optimum **T* ≈ {fr(PB['Tstar'],0)} h** (≈ 3 semaines), C* = {fr(PB['Cstar'],2)} €/h, contre {fr(PB['C_corr'],2)} €/h en tout correctif (Cc/MTBF = 5 800/443,1).

### 6.9 AMDEC de la remplisseuse (niveau 5)

| Mode | Défaillance | Effet | F | G | D | **C** | Décision |
|---|---|---|---|---|---|---|---|""")
dec={"REM-M1":"prioritaire : remplacement des joints toutes les 2 semaines (§ 6.8), F 3 → 1","REM-M2":"prioritaire : contrôleur pondéral en ligne, D 3 → 1 (C = 6) ; β = 1, donc pas de systématique","REM-M3":"surveillance : ronde vibratoire (conditionnel), D 2 → 1","REM-M4":"à planifier, et **traité d'office** car G = 4 (sécurité sanitaire) : contrôle des joints de cuve à chaque NEP"}
for x in R["amdec"]:
    A(f"| {x['mode']} | {x['def_']} | {x['effet']} | {x['F']} | {x['G']} | {x['D']} | **{x['C']}** | {dec[x['mode']]} |")
cd=C
A(f"""
REM-M4 est un mode **d'analyse** : il n'a pas de panne dans l'historique et n'est pas simulé (il n'est pas dans `usine.json`) ; on peut l'ajouter au moteur comme événement spécial « audit qualité ». Justification de F à partir de l'historique : REM-M1 a 2 pannes en 10 semaines (≈ 0,9 par mois), donc F = 3 ; REM-M2 a 1 panne en 10 semaines, donc F = 2. G vient du TA observé (3 h, mais produit non conforme → G = 3 ; 54 h → G = 4).

### 6.10 Coûts (niveaux 1 à 6)
**Une panne détaillée, EX-0017** (motoréducteur REM-M3, 2 techniciens) :
- Main-d'œuvre = (22 + 1,5) h × 2 techniciens × 40 € = **1 880 €** ; pièce = **5 750 €** → **coût direct = 7 630 €**
- Arrêt = 54 h × 1 200 € = **64 800 €** ; rebuts = 600 × 0,20 = 120 € → **coût indirect = 64 920 €**
- **Coût de la défaillance = 72 550 €**. Si le motoréducteur avait été en stock (attente 0,25 h au lieu de 30 h), on aurait évité 29,75 h × 1 200 = 35 700 € d'arrêt, soit 6 fois le prix de la pièce.

**Bilan des 10 semaines** (28 interventions) : main-d'œuvre {fr(cd['mo'])} € + pièces {fr(cd['pieces'])} € = **coûts directs {fr(cd['direct'])} €**, dont {fr(cd['prev_direct'])} € pour le préventif et le correctif différé du samedi ; arrêts {fr(cd['arret'])} € + rebuts {fr(cd['rebuts'])} € = **coûts indirects {fr(cd['indirect'])} €** ; **total {fr(cd['total'])} €**. Les coûts indirects font {fr(round(cd['indirect']/cd['total']*100,1),1)} % du total : c'est le message central du jeu.

| Machine | Coût direct (€) | Coût indirect (€) | Total (€) |
|---|---|---|---|""")
for k in ["REM","ETI","SOU","BOU","CON","FAR"]:
    d_,i_,t_=C["par_eq"][k]; A(f"| {NOMS[k]} | {fr(d_)} | {fr(i_)} | {fr(t_)} |")
A("""
---
""")

# ======================= 7. TOLÉRANCES =======================
A("""## 7. Arrondis attendus et tolérances de correction (notation)

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
| C(T*) | €/h, à 0,01 près | 10,00 | ±0,05 | — |
| Pareto / ABC : % et % cumulés | 1 décimale | exacts | ±0,05 point | — |
| Classes A/B/C | lettre | exacte | **aucune tolérance** | élément frontière mal classé (règle « cumul qui l'inclut ») |
| Criticité AMDEC | entier | exact | aucune | somme F + G + D au lieu du produit |
| Coûts | €, à l'euro près | exacts | ±1 € (±0,5 % pour les totaux sur plus de 10 lignes) | oubli du coût indirect ; MO comptée avec 1 seul technicien sur EX-0017 → 940 € |

**Règle de saisie** : le jeu accepte la virgule ou le point et ignore les espaces des milliers. Il rejette les unités incohérentes (minutes saisies à la place d'heures) avec un message dédié.

---
""")

# ======================= 8. SCHÉMAS =======================
cols=["id_evenement","source","id_equipement","id_sous_ensemble","id_mode_defaillance","description","type_maintenance","action","reparation_provisoire","debut_arret","fin_arret","hors_temps_ouverture","debut_arret_h_ouverture","tbf_precedent_h","duree_detection_h","duree_attente_logistique_h","duree_reparation_active_h","duree_remise_en_service_h","duree_arret_totale_h","nb_techniciens","intervenant","heures_main_oeuvre_h","pieces","cout_pieces_eur","cout_main_oeuvre_eur","cout_sous_traitance_eur","cout_direct_eur","penalite_arret_eur_par_h","cout_arret_production_eur","nb_rebuts_bouteilles","cout_rebuts_eur","cout_indirect_eur","cout_total_eur"]
A(f"""## 8. Proposition de schéma JSON (draft 2020-12)

Deux schémas, écrits dans `schema_equipement.json` et `schema_historique.json`. Règles de nommage : **unité en suffixe** (`_h` heures d'ouverture, `_eur` euros HT, `_par_h` par heure, `_pct` pourcentage, `_bouteilles_par_h`) ; identifiants courts et stables (`REM`, `REM-M1`, `P-REM-02`) ; dates **ISO 8601 avec décalage** (`2026-01-13T09:00:00+01:00`) ; types de maintenance selon la NF EN 13306 (`corrective_immediate`, `corrective_differee`, `preventive_systematique`, `preventive_conditionnelle`, `preventive_previsionnelle`, `amelioration`).

**Validation** (`scripts/schemas.py`, `jsonschema` 4.26, `Draft202012Validator` avec contrôle des formats `date-time`) : `usine.json` → **VALIDE** ; `historique_pannes.json` → **VALIDE** ; `historique_pannes_simule.json` → **VALIDE**. Contrôles complémentaires, impossibles à exprimer en JSON Schema et faits par le script : TA = détection + attente + réparation + remise en service ; coût total = direct + indirect ; pas de chevauchement de pannes dans l'historique d'exercice ; **contrôle croisé pièces/modes** (dans les deux historiques, chaque pièce citée existe au catalogue avec le bon prix, et appartient aux `pieces_corrective` du mode pour un correctif, ou aux `pieces_corrective` ∪ `pieces_preventive` pour un préventif ; le mode correspond bien à l'équipement et au sous-ensemble de l'événement).

**(a) Équipements** : l'objet racine `usine.json` contient `meta`, `organisation`, `couts`, `politique_initiale`, `pieces[]` et `equipements[]`. Chaque équipement a `id_equipement`, `designation`, `fonction`, `cadence_nominale_bouteilles_par_h`, `goulot`, `penalite_arret_eur_par_h`, `sous_ensembles[]` et `modes[]`. Chaque mode a `id_mode`, `id_sous_ensemble`, `loi` (exponentielle | weibull), `beta`, `eta_h`, `gamma_h`, `lambda_par_h`, `mtbf_theorique_h`, `effet_correctif` (renouvellement | reparation_minimale), `mttr_actif_h`, `sigma_log_reparation`, `pieces_corrective[]`, `pieces_preventive[]`, `mode_detection` et `probabilite_piece_en_stock`. Règle conditionnelle : loi exponentielle ⇒ β = 1 et γ = 0.

**(b) Historique** : un tableau d'événements. Les colonnes du CSV (séparateur `;`, décimales avec point, booléens `oui`/`non`, pièces au format `REF×quantité` séparées par `|`, sous la forme `P-REM-01x2`) reprennent dans l'ordre les propriétés du schéma : {', '.join('`'+c+'`' for c in cols)}.

<details><summary>schema_equipement.json (texte intégral)</summary>

```json
{json.dumps(SE, ensure_ascii=False, indent=1)}
```
</details>

<details><summary>schema_historique.json (texte intégral)</summary>

```json
{json.dumps(SH, ensure_ascii=False, indent=1)}
```
</details>

---

## 9. Points incertains, choix à valider par Steph

1. **Répartition 1re / 2e année** : c'est une proposition ; le référentiel 2022 ne la fixe pas. Le guide « Repères pour la formation du BTS MS », qui précise les limites des savoirs S9, n'a pas été consulté. À vérifier : le niveau attendu pour Weibull (ajustement, γ), la période optimale et l'AMDEC.
2. **Codes du référentiel** : codes et intitulés C11 à C53, tâches T1-1 à T5-3 et savoirs S9.1 à S9.8 vérifiés sur Légifrance (version en vigueur au 21/11/2026, après l'arrêté du 24/06/2025). Je n'ai pas vérifié si l'arrêté de 2025 a modifié autre chose que l'annexe II b (par exemple les épreuves).
3. **NF EN 13306:2018** : texte payant non consulté en entier. Les définitions (MOTBF/MTBF, MTTR = *mean time to restoration*, MRT) s'appuient sur l'IEC 60050-192 et sur des extraits de l'EN 13306. Les **intitulés français exacts** (par exemple « réparation provisoire ») sont à vérifier sur l'exemplaire AFNOR.
4. **FD X60-000** : cité pour le cadre de la fonction maintenance et les niveaux d'intervention ; son contenu détaillé n'a pas été consulté.
5. **Grilles AMDEC, seuils de criticité, seuils ABC 80/95 %, règle P-F/2, seuil vibratoire de 4,5 mm/s** : ce sont des **conventions** (d'entreprise ou d'usage), pas des exigences normatives. Je les présente comme telles.
6. **Modèle A de période optimale** (réparation minimale, T* explicite) : il est rigoureux pour REM-M1 parce que ce mode est modélisé en réparation minimale. Pour un composant remis à neuf à chaque panne, le bon modèle est le modèle B (numérique). À trancher : quel modèle est enseigné en classe ?
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
""")

open(OUT+"cadrage-metier.md","w",encoding="utf-8").write("\n".join(md)+"\n")

print("cadrage-metier.md écrit (le GDD v0, archivé, n'est plus modifié par ce script)")
