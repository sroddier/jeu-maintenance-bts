"""Paramètres effectifs du niveau 1 (remplisseuse seule), après application de organisation.surcharges_niveau_1.
Sert à vérifier que le niveau 1 est figé : mêmes entrées pour le moteur que dans usine.json d'avant l'inventaire du 2026-11-24."""
EQ_N1 = "REM"

def effectifs(U, ancien=False):
    c = U["couts"]; o = U["organisation"]
    rem = next(e for e in U["equipements"] if e["id_equipement"] == EQ_N1)
    refs = sorted({r for m in rem["modes"] for r in m["pieces_corrective"] + m.get("pieces_preventive", [])})
    P = {p["ref"]: p for p in U["pieces"]}
    if ancien:   # usine.json d'avant l'inventaire : délai standard, express global, pas de retard, pas de passation, pas d'outillage
        piece = lambda r: dict(prix=P[r]["prix_unitaire_eur"], delai_semaines=P[r]["delai_standard_semaines"], probabilite_retard=0.0,
                               delai_express_h=c["delai_express_h"], stock_initial=P[r]["stock_initial"], stock_mini=P[r]["stock_mini"])
        conso = lambda m: ([dict(ref=m["pieces_corrective"][0], quantite=(2 if m["id_mode"] == "REM-M1" else 1), probabilite=1.0)]
                           if m["pieces_corrective"] else [])
        outillage = "sans_effet"; passation = 0.0
    else:
        s = o["surcharges_niveau_1"]
        piece = lambda r: dict(prix=P[r]["prix_unitaire_eur"], delai_semaines=s["delai_semaines_toutes_pieces"], probabilite_retard=s["probabilite_retard"],
                               delai_express_h=s["delai_express_h"], stock_initial=P[r]["stock_initial"], stock_mini=s["stock_mini"][r])
        conso = lambda m: m["consommation_corrective"]
        outillage = ("sans_effet" if s["outillage_tout_disponible"] and s["majoration_outillage_confort_pct"] == 0
                     and not s["interdiction_sans_outillage_obligatoire"] else "actif")
        passation = s["cout_passation_commande_eur"]
    modes = {m["id_mode"]: dict(loi=m["loi"], beta=m["beta"], eta_h=m["eta_h"], gamma_h=m["gamma_h"], effet=m["effet_correctif"],
                                mttr_actif_h=m["mttr_actif_h"], sigma=m["sigma_log_reparation"], pieces_corrective=m["pieces_corrective"],
                                probabilite_piece_en_stock=m["probabilite_piece_en_stock"], consommation=conso(m),
                                depannage=(m["depannage_provisoire"]["autorise"], m["depannage_provisoire"]["duree_reparation_active_h"],
                                           m["depannage_provisoire"]["reapparition_apres_h"]))
             for m in rem["modes"]}
    cles = ["taux_main_oeuvre_eur_par_h", "taux_main_oeuvre_heures_sup_eur_par_h", "sous_traitance_eur_par_h", "sous_traitance_deplacement_eur",
            "sous_traitance_delai_arrivee_h", "majoration_express_pct", "cout_possession_stock_pct_par_an", "penalite_arret_goulot_eur_par_h",
            "penalite_arret_autre_eur_par_h"]
    return dict(modes=modes, pieces={r: piece(r) for r in refs}, couts={k: c[k] for k in cles}, cout_passation_commande_eur=passation,
                outillage=outillage, politique_initiale=U["politique_initiale"],
                organisation={k: o[k] for k in ["heures_ouverture_par_semaine", "cout_rebut_eur_par_bouteille", "coefficient_propagation_arret_hors_goulot"]},
                cadence_goulot=rem["cadence_nominale_bouteilles_par_h"])
