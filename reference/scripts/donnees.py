# -*- coding: utf-8 -*-
"""Génère usine.json, schemas JSON, historique d'exercice (déterministe) et historique simulé (moteur).
Usine et données FICTIVES. Graine fixe pour la simulation."""
import json, csv, math, datetime as dt
from zoneinfo import ZoneInfo
from fractions import Fraction as Fr
import numpy as np
from scipy.special import gamma as G

OUT = "/workspace/jeu-maintenance/"
TZ = ZoneInfo("Europe/Paris")
TAUX_MO = 40.0; TAUX_MO_HS = 50.0
PEN_GOULOT = 1200.0; COEF_PROPAG = 1.0; PEN_AUTRE = PEN_GOULOT*COEF_PROPAG  # ligne en série sans accumulation : 1 200 €/h pour toutes les machines
COUT_REBUT = 0.20

RATIO_DEPANNAGE = Fr(2,5); REAPPARITION_DEPANNAGE_H = 40.0
def quart_heure(x):
    """Arrondi au ¼ h le plus proche (demi-quart arrondi vers le haut), minimum 0,25 h."""
    q = Fr(str(x))*4
    n = int(q) + (1 if q - int(q) >= Fr(1,2) else 0)
    return max(n/4, 0.25)
# Modes où un palliatif n'a pas de sens métier
PALLIATIF_INTERDIT = {
 "REM-M3": "Motoréducteur rompu : aucune action provisoire ne rétablit l'entraînement du carrousel, seul le remplacement le fait.",
 "FAR-M1": "Résistance coupée : on ne la « dépanne » pas, et shunter ou neutraliser une protection du four serait dangereux. Seul le remplacement convient.",
}
MAJORATION_HORS_SPECIALITE = Fr(5,4)   # +25 % sur la réparation active
SPECIALITE = {"SOU-M1":"electrique","SOU-M2":"mecanique","REM-M1":"mecanique","REM-M2":"electrique","REM-M3":"mecanique",
              "BOU-M1":"mecanique","BOU-M2":"mecanique","ETI-M1":"electrique","ETI-M2":"mecanique","FAR-M1":"electrique",
              "FAR-M2":"mecanique","CON-M1":"electrique","CON-M2":"mecanique"}
MODES_CANICULE = ["SOU-M1","REM-M2","REM-M3","ETI-M1","FAR-M1","CON-M1"]
def depannage(id_, mttr):
    return dict(autorise=id_ not in PALLIATIF_INTERDIT, ratio_reparation_active=float(RATIO_DEPANNAGE),
                duree_reparation_active_h=quart_heure(RATIO_DEPANNAGE*Fr(str(mttr))), pieces=[],
                reapparition_apres_h=REAPPARITION_DEPANNAGE_H, annule_par_curatif_differe=True,
                duree_reparation_active_hors_specialite_h=quart_heure(MAJORATION_HORS_SPECIALITE*Fr(str(quart_heure(RATIO_DEPANNAGE*Fr(str(mttr)))))),
                justification=PALLIATIF_INTERDIT.get(id_))
def mode(id_, se, nom, loi, beta, eta, gamma_h, effet, mttr, pieces, detect, prob_stock, pieces_prev=(), prev=None):
    d = dict(id_mode=id_, id_sous_ensemble=se, designation=nom, specialite=SPECIALITE[id_], loi=loi, beta=beta, eta_h=eta, gamma_h=gamma_h,
                lambda_par_h=(1/eta if loi=="exponentielle" else None),
                mtbf_theorique_h=round(gamma_h+eta*float(G(1+1/beta)),1),
                effet_correctif=effet, mttr_actif_h=mttr, sigma_log_reparation=0.5,
                pieces_corrective=pieces, pieces_preventive=list(pieces_prev), mode_detection=detect, probabilite_piece_en_stock=prob_stock)
    d["consommation_corrective"] = [dict(ref=r, quantite=q, probabilite=pr) for r,q,pr in CONSO_CORR.get(id_, [(pieces[0],1,1.0)] if pieces else [])]
    o,cons,epi,hab = EXIG[id_]
    d["outillage_requis"] = [dict(id_outil=i, exigence=t) for i,t in o]
    if id_=="REM-M3": d["outillage_surveillance"] = ["O-VIB"]
    d["consignation"] = cons; d["epi"] = epi; d["habilitation_electrique"] = hab
    d["depannage_provisoire"] = depannage(id_, mttr)
    if prev: d["periode_optimale"] = prev
    return d

PIECES = [  # ref, désignation, prix €, délai et stock mini D'AVANT l'inventaire du 2026-11-24 (conservés pour le niveau 1 figé), stock initial
 ("P-SOU-01","Lampe infrarouge four de préchauffe 1,5 kW",60,2,6,2),
 ("P-SOU-02","Vanne haute pression de soufflage 40 bar",1200,2,1,1),
 ("P-REM-01","Kit joints pour 1 vanne de remplissage",25,2,10,4),
 ("P-REM-02","Kit joints complet 24 vannes de remplissage",600,2,1,1),
 ("P-REM-03","Sonde de niveau / débitmètre de vanne",450,2,0,1),
 ("P-REM-04","Motoréducteur d'entraînement du carrousel",5750,2,0,0),
 ("P-BOU-01","Tête de vissage à embrayage magnétique",900,2,1,1),
 ("P-ETI-01","Cellule photoélectrique de détection d'étiquette",180,2,2,1),
 ("P-ETI-02","Brosse de pose d'étiquette",120,2,2,1),
 ("P-FAR-01","Résistance du four de rétraction",250,2,1,1),
 ("P-FAR-02","Lame de coupe du film",150,2,2,1),
 ("P-CON-01","Variateur de vitesse 1,5 kW",450,2,1,1),
 ("P-CON-02","Carte d'entrées/sorties déportée automate",600,2,1,1),
 ("P-CON-03","Chaîne à palettes inox (lot de 1 m)",200,2,2,1),
]
PX = {p[0]:p[2] for p in PIECES}
# Inventaire validé par Steph le 2026-11-24 : délai D (semaines), express (semaines), stock mini de départ
DELAI_SEM = {"P-SOU-01":1,"P-SOU-02":3,"P-REM-01":1,"P-REM-02":2,"P-REM-03":3,"P-REM-04":6,"P-BOU-01":4,
             "P-ETI-01":1,"P-ETI-02":1,"P-FAR-01":1,"P-FAR-02":2,"P-CON-01":1,"P-CON-02":4,"P-CON-03":2}
EXPRESS_SEM = {r:(1.0 if r in ("P-REM-04","P-BOU-01","P-CON-02") else 0.2) for r in DELAI_SEM}   # 0,2 semaine = 16 h d'ouverture
PROBA_RETARD = 0.10
STOCK_MINI = {"P-SOU-01":1,"P-SOU-02":1,"P-REM-01":2,"P-REM-02":1,"P-REM-03":1,"P-REM-04":0,"P-BOU-01":2,
              "P-ETI-01":2,"P-ETI-02":1,"P-FAR-01":1,"P-FAR-02":1,"P-CON-01":0,"P-CON-02":1,"P-CON-03":1}
CRITIQUE = {"P-REM-01":"goulot","P-REM-02":"goulot","P-REM-03":"goulot","P-REM-04":"pas de dépannage provisoire (REM-M3), goulot",
            "P-FAR-01":"pas de dépannage provisoire (FAR-M1)","P-BOU-01":"délai de 4 semaines","P-CON-02":"délai de 4 semaines"}
# Consommation corrective par panne : (réf., quantité, probabilité), conforme à l'historique d'exercice.
CONSO_CORR = {"REM-M1":[("P-REM-01",2,1.0)], "CON-M1":[("P-CON-02",1,0.25)]}   # CON-M1 : carte E/S 1 fois sur 4 (EX-0008), jamais de variateur
# Outillage (catalogue) et exigences par mode : "obligatoire" interdit l'intervention sans l'outil ; "confort" : +50 % de réparation active
OUTILS = [("O-DYN","Clé dynamométrique / couplemètre",300.0,True),("O-VAT","Vérificateur d'absence de tension (VAT)",150.0,True),
          ("O-MULTI","Multimètre",150.0,True),("O-PALAN","Palan et potence de levage (CMU 250 kg)",1800.0,True),
          ("O-EXTR","Extracteur d'accouplement",200.0,True),("O-CONS","Console de paramétrage variateur / PC automate",1200.0,True),
          ("O-DEMV","Outil de démontage de vanne de remplissage",400.0,True),("O-ETAL","Étalon de niveau de remplissage",300.0,True),
          ("O-JAUGE","Jauge d'allongement de chaîne",80.0,True),("O-DERIV","Dérive-chaîne",120.0,True),
          ("O-VIB","Analyseur vibratoire portatif",2500.0,False)]
EXIG = {  # mode : (outils [(id, type)], consignation, EPI spécifiques, habilitation électrique)
 "SOU-M1":([],"electrique",[],"BS"),
 "SOU-M2":([("O-DYN","obligatoire")],"les_deux",[],None),
 "REM-M1":([("O-DEMV","confort")],"les_deux",[],None),
 "REM-M2":([("O-ETAL","obligatoire")],"les_deux",[],"BR"),
 "REM-M3":([("O-PALAN","obligatoire"),("O-DYN","obligatoire"),("O-EXTR","confort")],"les_deux",[],None),
 "BOU-M1":([("O-DYN","obligatoire")],"les_deux",["gants anti-coupure"],None),
 "BOU-M2":([],"electrique",["gants anti-coupure"],None),
 "ETI-M1":([],"electrique",[],"BS"),
 "ETI-M2":([],"electrique",[],None),
 "FAR-M1":([("O-VAT","obligatoire")],"electrique",[],"BR"),
 "FAR-M2":([],"les_deux",["gants anti-coupure"],None),
 "CON-M1":([("O-CONS","obligatoire"),("O-VAT","obligatoire")],"electrique",[],"BR"),
 "CON-M2":([("O-JAUGE","confort"),("O-DERIV","confort")],"les_deux",[],None),
}
# Compléments proposés par l'expert, NON validés : sans effet dans le jeu tant que Steph ne les a pas validés
PROPOSITIONS = [
 ("SOU-M1","outil","O-MULTI (confort)","contrôle de l'alimentation de la lampe et de son support avant remplacement"),
 ("SOU-M1","epi","gants de protection thermique, lunettes","four infrarouge chaud ; une lampe en quartz peut éclater"),
 ("SOU-M2","epi","lunettes, protection auditive, gants","purge d'air à 40 bar : projection et bruit"),
 ("REM-M1","epi","gants nitrile, lunettes","résidus de NEP (soude, acide) dans les vannes"),
 ("REM-M2","epi","gants nitrile, lunettes","ouverture du circuit produit et NEP"),
 ("REM-M3","epi","casque, gants de manutention, chaussures S3","levage d'une charge de 80 à 150 kg au palan"),
 ("BOU-M1","epi","lunettes","ressorts et pièces sous couple dans la tête de vissage"),
 ("ETI-M1","epi","gants","arêtes vives du groupe de pose"),
 ("ETI-M2","epi","gants","arêtes vives du groupe de pose"),
 ("FAR-M1","epi","gants de protection thermique, lunettes","four de rétraction chaud"),
 ("FAR-M1","epi","gants isolants et écran facial","exigés par la NF C18-510 pour la vérification d'absence de tension (O-VAT obligatoire)"),
 ("FAR-M2","epi","gants anti-coupure de niveau F (EN 388), lunettes","précision du niveau de protection pour une lame de coupe ; projection"),
 ("CON-M1","epi","gants isolants et écran facial","exigés par la NF C18-510 pour la vérification d'absence de tension (O-VAT obligatoire)"),
 ("CON-M2","epi","gants anti-coupure, chaussures S3","maillons de chaîne inox coupants, pièces lourdes"),
]

EQUIP = [
 dict(id_equipement="SOU", designation="Souffleuse rotative de préformes PET", fonction="Former les bouteilles PET 1 L à partir de préformes chauffées",
      cadence_nominale_bouteilles_par_h=11000, goulot=False, penalite_arret_eur_par_h=PEN_AUTRE,
      sous_ensembles=[{"id_sous_ensemble":"SOU-FOUR","designation":"Four de préchauffe infrarouge"},{"id_sous_ensemble":"SOU-SOUF","designation":"Postes de soufflage (moules, vannes HP)"},{"id_sous_ensemble":"SOU-TRF","designation":"Transferts et roues étoiles"}],
      modes=[mode("SOU-M1","SOU-FOUR","Claquage de lampe infrarouge","exponentielle",1,400,0,"renouvellement",1.5,["P-SOU-01"],"automatique (pyromètre)",0.95),
             mode("SOU-M2","SOU-SOUF","Fuite / blocage de vanne haute pression","weibull",2,800,0,"renouvellement",2.5,["P-SOU-02"],"opérateur (bouteilles mal formées)",0.8)]),
 dict(id_equipement="REM", designation="Remplisseuse rotative 24 vannes", fonction="Remplir les bouteilles au niveau (1 L) — machine GOULOT de la ligne",
      cadence_nominale_bouteilles_par_h=10000, goulot=True, penalite_arret_eur_par_h=PEN_GOULOT,
      sous_ensembles=[{"id_sous_ensemble":"REM-VAN","designation":"Vannes de remplissage (24)"},{"id_sous_ensemble":"REM-MES","designation":"Mesure de niveau / débitmètres"},{"id_sous_ensemble":"REM-ENT","designation":"Entraînement du carrousel"},{"id_sous_ensemble":"REM-CUV","designation":"Cuve produit et circuit NEP"}],
      modes=[mode("REM-M1","REM-VAN","Fuite de joint de vanne (sous-remplissage)","weibull",3,300,0,"reparation_minimale",2.5,["P-REM-01"],"opérateur (fuite visible ; pas de contrôleur pondéral en ligne)",0.95,["P-REM-02"],
                  prev=dict(modele="remplacement_periodique_reparation_minimale", cout_preventif_eur=1000.0, cout_defaillance_moyen_eur=4000.0, periode_optimale_h=150.0, periode_retenue_semaines=2)),
             mode("REM-M2","REM-MES","Dérive / panne de sonde de niveau","exponentielle",1,600,0,"renouvellement",3.0,["P-REM-03"],"contrôle qualité (niveaux hors tolérance)",0.0),
             mode("REM-M3","REM-ENT","Défaillance du motoréducteur du carrousel","weibull",2,4000,0,"renouvellement",22.0,["P-REM-04"],"bruit / vibration (ronde)",0.0)]),
 dict(id_equipement="BOU", designation="Boucheuse rotative (bouchons vissés)", fonction="Visser les bouchons au couple prescrit",
      cadence_nominale_bouteilles_par_h=11500, goulot=False, penalite_arret_eur_par_h=PEN_AUTRE,
      sous_ensembles=[{"id_sous_ensemble":"BOU-TET","designation":"Têtes de vissage"},{"id_sous_ensemble":"BOU-ALI","designation":"Alimentation et orientation des bouchons"}],
      modes=[mode("BOU-M1","BOU-TET","Usure d'embrayage de tête de vissage (couple hors tolérance)","weibull",2,500,0,"renouvellement",2.0,["P-BOU-01"],"contrôle de couple",0.9,["P-BOU-01"],
                  prev=dict(modele="remplacement_selon_age", cout_preventif_eur=1000.0, cout_defaillance_moyen_eur=5800.0, periode_optimale_h=232.3, periode_retenue_semaines=3)),
             mode("BOU-M2","BOU-ALI","Bourrage de l'alimentation bouchons","exponentielle",1,1000,0,"renouvellement",1.0,[],"automatique (détecteur de bourrage)",1.0)]),
 dict(id_equipement="ETI", designation="Étiqueteuse (étiquettes adhésives)", fonction="Poser l'étiquette sur la bouteille",
      cadence_nominale_bouteilles_par_h=12000, goulot=False, penalite_arret_eur_par_h=PEN_AUTRE,
      sous_ensembles=[{"id_sous_ensemble":"ETI-DET","designation":"Détection et synchronisation"},{"id_sous_ensemble":"ETI-POS","designation":"Groupe de pose (brosses, rouleau)"}],
      modes=[mode("ETI-M1","ETI-DET","Défaut de cellule de détection d'étiquette","exponentielle",1,100,0,"renouvellement",0.75,["P-ETI-01"],"automatique (défaut machine)",0.9),
             mode("ETI-M2","ETI-POS","Usure de la brosse de pose","weibull",2,1000,0,"renouvellement",1.5,["P-ETI-02"],"opérateur (étiquette mal posée)",0.9)]),
 dict(id_equipement="FAR", designation="Fardeleuse (packs de 6 sous film rétractable)", fonction="Regrouper les bouteilles par 6 et les filmer",
      cadence_nominale_bouteilles_par_h=13000, goulot=False, penalite_arret_eur_par_h=PEN_AUTRE,
      sous_ensembles=[{"id_sous_ensemble":"FAR-FOUR","designation":"Four de rétraction"},{"id_sous_ensemble":"FAR-FILM","designation":"Dérouleur et coupe du film"}],
      modes=[mode("FAR-M1","FAR-FOUR","Rupture de résistance du four","exponentielle",1,1000,0,"renouvellement",1.5,["P-FAR-01"],"automatique (température)",0.9),
             mode("FAR-M2","FAR-FILM","Émoussement de la lame de coupe","weibull",3,400,100,"renouvellement",0.5,["P-FAR-02"],"opérateur (film mal coupé)",0.95)]),
 dict(id_equipement="CON", designation="Convoyeurs (bouteilles vides et pleines)", fonction="Transférer et accumuler les bouteilles entre machines",
      cadence_nominale_bouteilles_par_h=15000, goulot=False, penalite_arret_eur_par_h=PEN_AUTRE,
      sous_ensembles=[{"id_sous_ensemble":"CON-CMD","designation":"Commande (automate, variateurs) — rénovée récemment"},{"id_sous_ensemble":"CON-MEC","designation":"Chaînes et guides"}],
      modes=[mode("CON-M1","CON-CMD","Défaut de jeunesse après rénovation (variateur, carte E/S, paramétrage)","weibull",0.5,100,0,"renouvellement",0.5,["P-CON-01","P-CON-02"],"automatique (défaut variateur / défaut bus E/S)",0.9),
             mode("CON-M2","CON-MEC","Usure / allongement de chaîne","weibull",2,2000,0,"renouvellement",2.0,["P-CON-03"],"ronde (mesure d'allongement)",0.9)]),
]
for e in EQUIP:
    e["mtbf_theorique_equipement_h"] = None  # calculé dans calculs.py selon la politique de préventif

# ---- consommation théorique par semaine (80 h), politique de départ, et point de commande ----
def conso_par_semaine():
    c = {r:0.0 for r in DELAI_SEM}
    for E in EQUIP:
        for m in E["modes"]:
            for x in m["consommation_corrective"]:
                if m["effet_correctif"]=="renouvellement":
                    c[x["ref"]] += 80/m["mtbf_theorique_h"]*x["quantite"]*x["probabilite"]
                else:   # REM-M1 : réparation minimale, kit complet toutes les 4 semaines (320 h)
                    c[x["ref"]] += (320/m["eta_h"])**m["beta"]/4*x["quantite"]*x["probabilite"]
    c["P-REM-02"] += 1/4        # préventif de départ : 1 kit toutes les 4 semaines
    return c
CONSO = conso_par_semaine()
def piece(r, d, p, si):
    D = DELAI_SEM[r]; Rr = math.ceil(D/2); c = round(CONSO[r], 4)
    qmax = max([x["quantite"] for E in EQUIP for m in E["modes"] for x in m["consommation_corrective"] if x["ref"]==r] or [1])
    pc = max(math.ceil(round(c*(D+Rr), 6)), qmax if c>0 else 0, 1 if r in CRITIQUE else 0)
    return dict(ref=r, designation=d, prix_unitaire_eur=float(p), delai_semaines=D, retard_possible_semaines=Rr, probabilite_retard=PROBA_RETARD,
                delai_express_semaines=EXPRESS_SEM[r], consommation_theorique_par_semaine=c, point_commande_calcule=pc,
                stock_securite=pc - math.ceil(round(c*D, 6)), stock_initial=si, stock_mini=STOCK_MINI[r],
                critique=r in CRITIQUE, motif_critique=CRITIQUE.get(r))

USINE = dict(
  meta=dict(nom="Boissons des Calanques — ligne L1 d'embouteillage (usine FICTIVE)", version="1.0", date="2026-11-21",
            avertissement="Usine, données et coûts fictifs mais réalistes, construits pour l'enseignement (BTS MS).",
            unites="Durées en heures d'ouverture (h), coûts en euros HT (eur), cadences en bouteilles par heure."),
  organisation=dict(postes_par_jour=2, heures_par_poste=8, jours_par_semaine=5, heures_ouverture_par_semaine=80,
                    horaires="lundi-vendredi 05:00-21:00", produit="Boisson plate aux fruits, bouteille PET 1 L",
                    marge_sur_cout_variable_eur_par_bouteille=0.12, cout_rebut_eur_par_bouteille=COUT_REBUT,
                    coefficient_propagation_arret_hors_goulot=COEF_PROPAG,
                    hors_specialite=dict(majoration_reparation_active_pct=25.0, s_applique_a="reparation_active",
                                         arrondi="quart_heure_le_plus_proche", minimum_h=0.25, s_applique_au_depannage_provisoire=True,
                                         concerne_sous_traitance=False, entre_dans_mttr=True, niveaux=[2,3,4,5,6]),
                    outillage_confort_absent=dict(majoration_reparation_active_pct=50.0, s_applique_a="reparation_active",
                                         arrondi="quart_heure_le_plus_proche", cumul_avec_hors_specialite="multiplicatif_puis_un_seul_arrondi",
                                         s_applique_au_depannage_provisoire=False),
                    outillage_obligatoire_absent="intervention_interdite (y compris dépannage provisoire)",
                    epi_hygiene_base=["charlotte","blouse ou combinaison","chaussures de sécurité","cache-barbe"],
                    surcharges_niveau_1=dict(
                        description="Niveau 1 figé (décision de Steph du 2026-11-24) : paramètres d'inventaire d'avant l'inventaire du 2026-11-24.",
                        delai_semaines_toutes_pieces=2, probabilite_retard=0.0, delai_express_h=16.0,
                        stock_mini={r:sm for r,d,p,dl,si,sm in PIECES}, cout_passation_commande_eur=0.0,
                        outillage_tout_disponible=True, majoration_outillage_confort_pct=0.0, interdiction_sans_outillage_obligatoire=False)),
  couts=dict(taux_main_oeuvre_eur_par_h=TAUX_MO, taux_main_oeuvre_heures_sup_eur_par_h=TAUX_MO_HS,
             sous_traitance_eur_par_h=90.0, sous_traitance_deplacement_eur=150.0, sous_traitance_delai_arrivee_h=4.0,
             majoration_express_pct=50.0, cout_passation_commande_eur=50.0, taux_main_oeuvre_dimanche_eur_par_h=80.0, delai_express_h=16.0, cout_possession_stock_pct_par_an=20.0,
             penalite_arret_goulot_eur_par_h=PEN_GOULOT, penalite_arret_autre_eur_par_h=PEN_AUTRE),
  politique_initiale=[dict(id_mode="REM-M1", type_maintenance="preventive_systematique", action="Remplacement de tous les joints des 24 vannes (kit P-REM-02)",
                           periode_semaines=4, hors_temps_ouverture=True, duree_h=8.0, nb_techniciens=1, cout_eur=1000.0)],
  evenements=dict(
    niveau_1="Aucun événement à effet chiffré (E01 à E07 désactivés) ; E08 cosmétique tiré sur un PRNG séparé.",
    liste=[
     dict(id_evenement="E01", designation="Coupure électrique courte", niveaux=[2,3,4,5,6], probabilite=0.10, base_probabilite="tour", max_par_partie=1, effet_numerique=True,
          parametres=dict(duree_arret_ligne_h=1.0, duree_coupure_reseau_h=0.5, duree_redemarrage_h=0.5, nb_rebuts_bouteilles=500,
                          categorie_nf_e60_182="arret_induit_externe", compte_dans_n=False, compte_dans_somme_ta=False,
                          reduit_temps_fonctionnement=True, defaillance_au_redemarrage_compte_dans_n=True)),
     dict(id_evenement="E02", designation="Technicien malade", niveaux=[2,3,4,5,6], probabilite=0.08, base_probabilite="tour", max_par_partie=None, effet_numerique=True,
          parametres=dict(duree_indisponibilite_tours=1, nb_techniciens_concernes=1)),
     dict(id_evenement="E03", designation="Fournisseur en retard", niveaux=[3,4,5,6], probabilite=0.10, base_probabilite="commande_standard", max_par_partie=None, effet_numerique=True,
          parametres=dict(retard_semaines=1)),
     dict(id_evenement="E04", designation="Pièce livrée fausse", niveaux=[3,4,5,6], probabilite=0.03, base_probabilite="livraison", max_par_partie=None, effet_numerique=True,
          parametres=dict()),
     dict(id_evenement="E05", designation="Audit qualité / hygiène", niveaux=[4,5,6], probabilite=1.0, base_probabilite="partie", max_par_partie=1, effet_numerique=True,
          parametres=dict(nb_bouteilles_lot_bloque=10000, seuil_tq_pct=98.0)),
     dict(id_evenement="E06", designation="Commande urgente (pic d'été)", niveaux=[5,6], probabilite=1.0, base_probabilite="partie", max_par_partie=1, effet_numerique=True,
          parametres=dict(majoration_volume_pct=20.0, base_volume="production_bonne_moyenne_des_tours_precedents",
                          heures_production_samedi_h=16.0, heures_ouverture_tour_h=96.0, samedi_compte_dans_tr=True,
                          creneau_maintenance_remplacement="dimanche", si_dimanche_refuse="report_au_samedi_suivant",
                          minuteur_depannage_compte_le_samedi=True)),
     dict(id_evenement="E07", designation="Canicule", niveaux=[4,5,6], probabilite=0.15, base_probabilite="tour", max_par_partie=1, effet_numerique=True,
          parametres=dict(multiplicateur_taux_defaillance=1.5, duree_tours=1, modes_concernes=MODES_CANICULE, age_inchange=True,
                          formule="P = 1 - exp(-k * (H(t + dt) - H(t))), H(t) = ((t - gamma)/eta)^beta ; equivaut a eta' = eta / k^(1/beta) sur le seul increment")),
     dict(id_evenement="E08", designation="Visite d'un client avec la directrice", niveaux=[1,2,3,4,5,6], probabilite=1.0, base_probabilite="partie", max_par_partie=1, effet_numerique=False,
          parametres=dict(prng_separe=True)),
    ]),
  pieces=[piece(r,d,p,si) for r,d,p,dl,si,sm in PIECES],
  propositions_a_valider=[dict(id_mode=m, type=t, valeur=v, justification=j, statut="a_valider_par_Steph") for m,t,v,j in PROPOSITIONS],
  outillages=[dict(id_outil=i, designation=d, prix_eur=p, disponible_au_depart=dsp) for i,d,p,dsp in OUTILS],
  equipements=EQUIP)

# ---------------- Calendrier d'ouverture ----------------
def ouverture_vers_date(h, lundi0, semaines_sautees=()):
    """h = heures d'ouverture écoulées depuis lundi0 05:00. 16 h/jour, 5 j/semaine."""
    jour = int(h // 16); reste = h - 16*jour
    sem = jour // 5; j = jour % 5
    lundi = lundi0
    s = 0
    while True:
        if lundi not in semaines_sautees:
            if s == sem: break
            s += 1
        lundi += dt.timedelta(days=7)
    d = dt.datetime.combine(lundi + dt.timedelta(days=j), dt.time(5,0), TZ) + dt.timedelta(hours=reste)
    return d

def iso(d): return d.isoformat(timespec="seconds")

# ---------------- Historique d'EXERCICE (déterministe, construit à la main) ----------------
# (equip, mode, debut_h_ouverture, detection, attente, reparation, remise, nb_tech, pieces{ref:qte}, rebuts, action, palliatif)
EX = [
 ("CON","CON-M1",  10, .25, 0,   .25, .25, 1, {}, 0, "reglage", False),
 ("ETI","ETI-M1",  30, .5, 1.5,  .5, .5, 1, {}, 0, "depannage", True),
 ("SOU","SOU-M1",  60, .5, .5,  1.5, .5, 1, {"P-SOU-01":1}, 0, "remplacement", False),
 ("REM","REM-M1", 100, .25, 0,  2.5, .25, 1, {"P-REM-01":2}, 1200, "remplacement", False),
 ("BOU","BOU-M1", 130, .5, 1,   2,  .5, 1, {"P-BOU-01":1}, 0, "remplacement", False),
 ("ETI","ETI-M1", 150, .5, 3,   1,  .5, 1, {"P-ETI-01":1}, 0, "remplacement", False),
 ("REM","REM-M2", 200, .5, 16,  3,  .5, 1, {"P-REM-03":1}, 600, "remplacement", False),
 ("CON","CON-M1", 230, .25, 0,  .5, .25, 1, {"P-CON-02":1}, 0, "remplacement", False),
 ("ETI","ETI-M2", 260, .5, 3.5, 1.5, .5, 1, {"P-ETI-02":1}, 0, "remplacement", False),
 ("SOU","SOU-M2", 300, .5, 1.5, 2.5, .5, 1, {"P-SOU-02":1}, 0, "remplacement", False),
 ("ETI","ETI-M1", 340, .5, 6,   1,  .5, 1, {"P-ETI-01":1}, 0, "remplacement", False),
 ("FAR","FAR-M2", 380, .25, 0,  .5, .25, 1, {"P-FAR-02":1}, 0, "remplacement", False),
 ("ETI","ETI-M1", 420, .5, 2.5, .5, .5, 1, {}, 0, "depannage", True),
 ("SOU","SOU-M1", 460, .5, .5, 1.5, .5, 1, {"P-SOU-01":1}, 0, "remplacement", False),
 ("CON","CON-M1", 480, .25, 0,  .75, .25, 1, {}, 0, "reglage", False),
 ("REM","REM-M1", 500, .25, 0,  2.5, .25, 1, {"P-REM-01":2}, 1200, "remplacement", False),
 ("REM","REM-M3", 560, .5, 30,  22, 1.5, 2, {"P-REM-04":1}, 600, "remplacement", False),
 ("BOU","BOU-M2", 620, .5, 2,   1,  .5, 1, {}, 0, "nettoyage", False),
 ("ETI","ETI-M1", 640, .5, 5,   1,  .5, 1, {"P-ETI-01":1}, 0, "remplacement", False),
 ("SOU","SOU-M2", 680, .5, 1.5, 2.5, .5, 1, {"P-SOU-02":1}, 0, "remplacement", False),
 ("ETI","ETI-M2", 700, .5, 6.5, 1.5, .5, 1, {"P-ETI-02":1}, 0, "remplacement", False),
 ("FAR","FAR-M1", 730, .5, .5,  1.5, .5, 1, {"P-FAR-01":1}, 0, "remplacement", False),
 ("ETI","ETI-M1", 760, .5, 4,   1,  .5, 1, {"P-ETI-01":1}, 0, "remplacement", False),
 ("CON","CON-M1", 790, .25, 0,  .5, .25, 1, {}, 0, "reglage", False),
]
LUNDI_EX = dt.date(2026,1,5)   # 10 semaines : 05/01/2026 -> 13/03/2026 (pas de jour férié)
PEN = {e["id_equipement"]: e["penalite_arret_eur_par_h"] for e in EQUIP}
SE = {m["id_mode"]: m["id_sous_ensemble"] for e in EQUIP for m in e["modes"]}
MNOM = {m["id_mode"]: m["designation"] for e in EQUIP for m in e["modes"]}

def evenement(idx, src, eq, md, h0, det, att, rep, rem, nb, pcs, reb, action, pall, lundi0, prec_fin, sautees=(), typ=None, hors=False, debut_dt=None, mo_taux=TAUX_MO):
    ta = det+att+rep+rem
    if debut_dt is None:
        d0 = ouverture_vers_date(h0, lundi0, sautees); d1 = ouverture_vers_date(h0+ta, lundi0, sautees)
    else:
        d0 = debut_dt; d1 = debut_dt + dt.timedelta(hours=ta)
    h_mo = (rep+rem)*nb
    c_mo = h_mo*mo_taux; c_p = sum(PX[r]*q for r,q in pcs.items())
    c_arret = 0.0 if hors else ta*PEN[eq]
    c_reb = reb*COUT_REBUT
    typ = typ or ("corrective_immediate")
    return dict(id_evenement=f"{src[:2].upper()}-{idx:04d}", source=src, id_equipement=eq, id_sous_ensemble=SE[md], id_mode_defaillance=md,
        description=MNOM[md], type_maintenance=typ, action=action, reparation_provisoire=pall,
        debut_arret=iso(d0), fin_arret=iso(d1), hors_temps_ouverture=hors,
        debut_arret_h_ouverture=(None if hors else round(h0,4)),
        tbf_precedent_h=(None if hors or prec_fin is None else round(h0-prec_fin,4)),
        duree_detection_h=det, duree_attente_logistique_h=att, duree_reparation_active_h=rep, duree_remise_en_service_h=rem,
        duree_arret_totale_h=round(ta,4), nb_techniciens=nb, intervenant="interne", heures_main_oeuvre_h=round(h_mo,4),
        pieces=[dict(ref=r, quantite=q, prix_unitaire_eur=float(PX[r])) for r,q in pcs.items()],
        cout_pieces_eur=round(c_p,2), cout_main_oeuvre_eur=round(c_mo,2), cout_sous_traitance_eur=0.0,
        cout_direct_eur=round(c_p+c_mo,2), penalite_arret_eur_par_h=(0.0 if hors else PEN[eq]), cout_arret_production_eur=round(c_arret,2),
        nb_rebuts_bouteilles=reb, cout_rebuts_eur=round(c_reb,2), cout_indirect_eur=round(c_arret+c_reb,2),
        cout_total_eur=round(c_p+c_mo+c_arret+c_reb,2))

def historique_exercice():
    evs=[]; last_end={}
    for i,(eq,md,h0,det,att,rep,rem,nb,pcs,reb,action,pall) in enumerate(EX,1):
        prec = last_end.get(eq, 0.0)
        evs.append(evenement(i,"exercice",eq,md,h0,det,att,rep,rem,nb,pcs,reb,action,pall,LUNDI_EX,prec))
        last_end[eq]=h0+det+att+rep+rem
    # préventifs systématiques REM-M1 le samedi (hors temps d'ouverture), semaines 4 et 8
    for k,(jour) in enumerate([dt.date(2026,1,31), dt.date(2026,2,28)],1):
        d0 = dt.datetime.combine(jour, dt.time(6,0), TZ)
        evs.append(evenement(100+k,"exercice","REM","REM-M1",None,0,0,7.5,.5,1,{"P-REM-02":1},0,"remplacement",False,LUNDI_EX,None,
                             typ="preventive_systematique",hors=True,debut_dt=d0,mo_taux=TAUX_MO_HS))
    # corrective différée : remplacement des cellules dépannées provisoirement (samedi, hors ouverture)
    for k,jour in enumerate([dt.date(2026,1,10), dt.date(2026,2,14)],1):
        d0 = dt.datetime.combine(jour, dt.time(8,0), TZ)
        evs.append(evenement(200+k,"exercice","ETI","ETI-M1",None,0,0,.5,.5,1,{"P-ETI-01":1},0,"remplacement",False,LUNDI_EX,None,
                             typ="corrective_differee",hors=True,debut_dt=d0,mo_taux=TAUX_MO_HS))
    evs.sort(key=lambda e: e["debut_arret"])
    # vérif chevauchements (toutes machines confondues : la ligne est supposée ne subir qu'une panne à la fois)
    iv = sorted([(e["debut_arret_h_ouverture"], e["debut_arret_h_ouverture"]+e["duree_arret_totale_h"], e["id_evenement"]) for e in evs if not e["hors_temps_ouverture"]])
    for a,b in zip(iv,iv[1:]): assert a[1] <= b[0], (a,b)
    assert iv[-1][1] <= 800
    return evs

# ---------------- Historique SIMULÉ (moteur de jeu, 50 semaines, graine fixe) ----------------
def historique_simule(seed=2026, semaines=50, avec_dates=True):
    rng = np.random.default_rng(seed)
    rng_pieces = np.random.default_rng(seed + 1)   # PRNG séparé : consommation probabiliste des pièces
    lundi0 = dt.date(2025,1,6); sautees = {dt.date(2025,8,4), dt.date(2025,8,11)}  # fermeture estivale
    T = 80.0*semaines
    evs=[]; n=0; info={}
    def tirage(m):
        b,e,g = m["beta"], m["eta_h"], m["gamma_h"]
        return g + e*(-math.log(1-rng.random()))**(1/b)
    for E in EQUIP:
        eq=E["id_equipement"]; modes=E["modes"]
        # âge (heures de fonctionnement) de chaque mode
        age = {m["id_mode"]:0.0 for m in modes}
        nxt = {}
        for m in modes:
            if m["effet_correctif"]=="renouvellement": nxt[m["id_mode"]] = tirage(m)
        # REM-M1 : réparation minimale (processus de Poisson non homogène, loi puissance) + renouvellement préventif toutes les 4 semaines (hors ouverture)
        def prochain_minimal(m, a):
            b,e = m["beta"], m["eta_h"]
            u = rng.random()
            return e*((a/e)**b - math.log(1-u))**(1/b)  # âge de la prochaine défaillance
        mm = [m for m in modes if m["effet_correctif"]=="reparation_minimale"]
        for m in mm: nxt[m["id_mode"]] = prochain_minimal(m, 0.0)
        t = 0.0; last_end = 0.0; next_prev = 320.0
        def preventif(tp):
            nonlocal n
            m = mm[0]; info.setdefault("REM-M1_ages_cycles", []).append(age[m["id_mode"]])
            age[m["id_mode"]] = 0.0; nxt[m["id_mode"]] = prochain_minimal(m, 0.0)
            if not avec_dates: 
                evs.append(dict(id_equipement=eq, id_mode_defaillance=m["id_mode"], type_maintenance="preventive_systematique", hors_temps_ouverture=True)); return
            sem = int(round(tp/80))  # semaines achevées
            samedi = ouverture_vers_date((sem-1)*80, lundi0, sautees).date() + dt.timedelta(days=5)
            n+=1
            evs.append(evenement(n,"simulation",eq,m["id_mode"],None,0,0,7.5,.5,1,{"P-REM-02":1},0,"remplacement",False,lundi0,None,
                                 typ="preventive_systematique",hors=True,debut_dt=dt.datetime.combine(samedi, dt.time(6,0), TZ),mo_taux=TAUX_MO_HS))
        while t < T:
            # préventif systématique REM-M1 toutes les 4 semaines (samedi, hors ouverture) ; s'il tombe pendant une panne, il est fait le samedi suivant la remise en service
            if mm and t >= next_prev:
                while next_prev <= t: next_prev += 320.0
                preventif(next_prev-320.0 if next_prev-320.0>=t-1e-9 else math.ceil(t/80)*80); continue
            dts = {k: v-age[k] for k,v in nxt.items()}
            k = min(dts, key=dts.get); d = dts[k]
            if mm and t + d > next_prev:
                adv = next_prev - t
                for kk in age: age[kk]+=adv
                t = next_prev; next_prev += 320.0
                if t >= T: break
                preventif(t); continue
            if t + d >= T: break
            for kk in age: age[kk]+=d
            t += d
            m = next(x for x in modes if x["id_mode"]==k)
            info.setdefault(k, []).append(age[k] if m["effet_correctif"]=="renouvellement" else None)
            det = float(rng.choice([0.25,0.5]))
            mu = math.log(m["mttr_actif_h"]) - 0.5*m["sigma_log_reparation"]**2
            rep = max(round(float(rng.lognormal(mu, m["sigma_log_reparation"]))*4)/4, 0.25)
            rem = float(rng.choice([0.25,0.5,1.0]))
            en_stock = (rng.random() < m["probabilite_piece_en_stock"]) if m["pieces_corrective"] else True
            pcs = {}
            for x in m["consommation_corrective"]:
                if x["probabilite"] >= 1 or rng_pieces.random() < x["probabilite"]: pcs[x["ref"]] = x["quantite"]
            att = 0.0 if not pcs else (0.25 if en_stock else 16.0)
            nb = 2 if m["mttr_actif_h"]>=10 else 1
            reb = 1200 if eq=="REM" else 0
            ta = det+att+rep+rem
            if avec_dates:
                n+=1
                evs.append(evenement(n,"simulation",eq,k,t,det,att,rep,rem,nb,pcs,reb,"remplacement" if pcs else "reglage",False,lundi0,last_end,sautees))
            else:
                evs.append(dict(id_equipement=eq, id_mode_defaillance=k, type_maintenance="corrective_immediate", hors_temps_ouverture=False,
                                duree_arret_totale_h=ta, duree_reparation_active_h=rep))
            t += ta; last_end = t
            if m["effet_correctif"]=="renouvellement":
                age[k]=0.0; nxt[k]=tirage(m)
            else:
                nxt[k]=prochain_minimal(m, age[k])
    if not avec_dates: return evs, info, T
    evs.sort(key=lambda e: e["debut_arret"])
    for i,e in enumerate(evs,1): e["id_evenement"]=f"SI-{i:04d}"
    return evs, info, T

CSV_COLS = ["id_evenement","source","id_equipement","id_sous_ensemble","id_mode_defaillance","description","type_maintenance","action","reparation_provisoire",
            "debut_arret","fin_arret","hors_temps_ouverture","debut_arret_h_ouverture","tbf_precedent_h","duree_detection_h","duree_attente_logistique_h",
            "duree_reparation_active_h","duree_remise_en_service_h","duree_arret_totale_h","nb_techniciens","intervenant","heures_main_oeuvre_h","pieces",
            "cout_pieces_eur","cout_main_oeuvre_eur","cout_sous_traitance_eur","cout_direct_eur","penalite_arret_eur_par_h","cout_arret_production_eur",
            "nb_rebuts_bouteilles","cout_rebuts_eur","cout_indirect_eur","cout_total_eur"]

def ecrire_csv(evs, path):
    with open(path,"w",newline="",encoding="utf-8") as f:
        w=csv.writer(f, delimiter=";")
        w.writerow(CSV_COLS)
        for e in evs:
            row=[]
            for c in CSV_COLS:
                v=e[c]
                if c=="pieces": v="|".join(f'{p["ref"]}x{p["quantite"]}' for p in v)
                elif isinstance(v,bool): v="oui" if v else "non"
                elif v is None: v=""
                row.append(v)
            w.writerow(row)

if __name__=="__main__":
    json.dump(USINE, open(OUT+"usine.json","w",encoding="utf-8"), ensure_ascii=False, indent=2)
    ex = historique_exercice()
    json.dump(ex, open(OUT+"historique_pannes.json","w",encoding="utf-8"), ensure_ascii=False, indent=2)
    ecrire_csv(ex, OUT+"historique_pannes.csv")
    si, info, T = historique_simule()
    json.dump(si, open(OUT+"historique_pannes_simule.json","w",encoding="utf-8"), ensure_ascii=False, indent=2)
    ecrire_csv(si, OUT+"historique_pannes_simule.csv")
    json.dump({k:v for k,v in info.items()}, open("/tmp/info_sim.json","w"))
    print(len(ex), "événements exercice ;", len(si), "événements simulés sur", T, "h")
