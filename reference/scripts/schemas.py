# -*- coding: utf-8 -*-
import json
OUT="/workspace/jeu-maintenance/"
NUM0={"type":"number","minimum":0}
TYPES_MAINT=["corrective_immediate","corrective_differee","preventive_systematique","preventive_conditionnelle","preventive_previsionnelle","amelioration"]
schema_eq = {
 "$schema":"https://json-schema.org/draft/2020-12/schema",
 "$id":"https://example.org/jeu-maintenance/schema_equipement.json",
 "title":"Usine fictive et équipements — jeu sérieux BTS MS",
 "description":"Durées en heures d'ouverture (_h), coûts en euros HT (_eur), cadences en bouteilles par heure.",
 "type":"object",
 "required":["meta","organisation","couts","pieces","equipements"],
 "additionalProperties":False,
 "properties":{
  "meta":{"type":"object","required":["nom","version"],"properties":{"nom":{"type":"string"},"version":{"type":"string"},"date":{"type":"string","format":"date"},"avertissement":{"type":"string"},"unites":{"type":"string"}}},
  "organisation":{"type":"object","required":["heures_ouverture_par_semaine"],"properties":{
     "postes_par_jour":{"type":"integer","minimum":1},"heures_par_poste":NUM0,"jours_par_semaine":{"type":"integer","minimum":1,"maximum":7},
     "heures_ouverture_par_semaine":{"type":"number","exclusiveMinimum":0},"horaires":{"type":"string"},"produit":{"type":"string"},
     "marge_sur_cout_variable_eur_par_bouteille":NUM0,"cout_rebut_eur_par_bouteille":NUM0,
     "coefficient_propagation_arret_hors_goulot":{"type":"number","minimum":0,"maximum":1}}},
  "couts":{"type":"object","required":["taux_main_oeuvre_eur_par_h","penalite_arret_goulot_eur_par_h","penalite_arret_autre_eur_par_h"],
           "additionalProperties":NUM0},
  "politique_initiale":{"type":"array","items":{"type":"object","required":["id_mode","type_maintenance"],"properties":{
     "id_mode":{"type":"string"},"type_maintenance":{"enum":TYPES_MAINT},"action":{"type":"string"},"periode_semaines":{"type":"number","exclusiveMinimum":0},
     "hors_temps_ouverture":{"type":"boolean"},"duree_h":NUM0,"nb_techniciens":{"type":"integer","minimum":1},"cout_eur":NUM0}}},
  "pieces":{"type":"array","items":{"$ref":"#/$defs/piece"}},
  "equipements":{"type":"array","minItems":1,"items":{"$ref":"#/$defs/equipement"}}
 },
 "$defs":{
  "piece":{"type":"object","required":["ref","designation","prix_unitaire_eur"],"additionalProperties":False,"properties":{
     "ref":{"type":"string","pattern":"^P-[A-Z]{3}-[0-9]{2}$"},"designation":{"type":"string"},"prix_unitaire_eur":NUM0,
     "delai_standard_semaines":NUM0,"stock_initial":{"type":"integer","minimum":0},"stock_mini":{"type":"integer","minimum":0}}},
  "mode":{"type":"object","required":["id_mode","id_sous_ensemble","designation","loi","beta","eta_h","gamma_h","effet_correctif","mttr_actif_h","depannage_provisoire"],
     "additionalProperties":False,
     "properties":{
       "id_mode":{"type":"string","pattern":"^[A-Z]{3}-M[0-9]+$"},"id_sous_ensemble":{"type":"string"},"designation":{"type":"string"},
       "loi":{"enum":["exponentielle","weibull"]},
       "beta":{"type":"number","exclusiveMinimum":0,"description":"Paramètre de forme (sans unité)"},
       "eta_h":{"type":"number","exclusiveMinimum":0,"description":"Paramètre d'échelle, en heures de fonctionnement"},
       "gamma_h":{"type":"number","minimum":0,"description":"Paramètre de position, en heures"},
       "lambda_par_h":{"type":["number","null"],"exclusiveMinimum":0,"description":"Taux de défaillance constant (1/h) si loi exponentielle"},
       "mtbf_theorique_h":{"type":"number","exclusiveMinimum":0,"description":"gamma + eta·Γ(1+1/β), en heures"},
       "effet_correctif":{"enum":["renouvellement","reparation_minimale"],"description":"renouvellement : âge remis à 0 ; réparation minimale : âge inchangé"},
       "mttr_actif_h":{"type":"number","exclusiveMinimum":0,"description":"Moyenne des durées de réparation active (h)"},
       "sigma_log_reparation":{"type":"number","minimum":0,"description":"Écart-type du logarithme des durées de réparation (loi log-normale)"},
       "pieces_corrective":{"type":"array","items":{"type":"string"},"description":"Pièces consommables en correctif pour ce mode"},
       "pieces_preventive":{"type":"array","items":{"type":"string"},"description":"Pièces consommables en préventif pour ce mode"},
       "mode_detection":{"type":"string"},
       "probabilite_piece_en_stock":{"type":"number","minimum":0,"maximum":1},
       "depannage_provisoire":{"type":"object","additionalProperties":False,
          "required":["autorise","ratio_reparation_active","duree_reparation_active_h","pieces","reapparition_apres_h","annule_par_curatif_differe"],
          "description":"Règle du dépannage provisoire (action palliative). Détection et remise en service inchangées.",
          "properties":{"autorise":{"type":"boolean","description":"false si un palliatif n'a pas de sens métier pour ce mode"},
                        "ratio_reparation_active":{"type":"number","exclusiveMinimum":0,"maximum":1,"description":"Part de mttr_actif_h (0,4)"},
                        "duree_reparation_active_h":{"type":"number","minimum":0.25,"multipleOf":0.25,"description":"Valeur figée = ratio × mttr_actif_h, arrondie au ¼ h le plus proche, minimum 0,25 h"},
                        "pieces":{"type":"array","maxItems":0,"description":"Aucune pièce consommée"},
                        "reapparition_apres_h":{"type":"number","exclusiveMinimum":0,"description":"La panne revient après ce temps d'ouverture (le mode n'est pas remis à neuf)"},
                        "annule_par_curatif_differe":{"type":"boolean","description":"true : une réparation curative différée faite le samedi (hors ouverture) annule la réapparition"},
                        "justification":{"type":["string","null"],"description":"Motif métier quand autorise = false"}},
          "if":{"properties":{"autorise":{"const":False}}},"then":{"required":["justification"],"properties":{"justification":{"type":"string","minLength":10}}}},
       "periode_optimale":{"type":"object","required":["modele","cout_preventif_eur","cout_defaillance_moyen_eur"],"additionalProperties":False,
          "description":"Données du préventif systématique : Cp, Cc et modèle de période optimale",
          "properties":{"modele":{"enum":["remplacement_selon_age","remplacement_periodique_reparation_minimale"]},
                        "cout_preventif_eur":{"type":"number","minimum":0,"description":"Cp : coût d'une intervention préventive"},
                        "cout_defaillance_moyen_eur":{"type":"number","minimum":0,"description":"Cc : coût complet moyen d'une défaillance (direct + indirect)"},
                        "periode_optimale_h":{"type":"number","exclusiveMinimum":0},"periode_retenue_semaines":{"type":"integer","minimum":1}}}},
     "allOf":[{"if":{"properties":{"loi":{"const":"exponentielle"}}},"then":{"properties":{"beta":{"const":1},"gamma_h":{"const":0},"lambda_par_h":{"type":"number"}}}}]},
  "equipement":{"type":"object",
     "required":["id_equipement","designation","fonction","cadence_nominale_bouteilles_par_h","goulot","penalite_arret_eur_par_h","sous_ensembles","modes"],
     "additionalProperties":False,
     "properties":{
       "id_equipement":{"type":"string","pattern":"^[A-Z]{3}$"},"designation":{"type":"string"},"fonction":{"type":"string"},
       "cadence_nominale_bouteilles_par_h":{"type":"number","exclusiveMinimum":0},"goulot":{"type":"boolean"},
       "penalite_arret_eur_par_h":NUM0,
       "sous_ensembles":{"type":"array","minItems":1,"items":{"type":"object","required":["id_sous_ensemble","designation"],"properties":{"id_sous_ensemble":{"type":"string"},"designation":{"type":"string"}}}},
       "modes":{"type":"array","minItems":1,"items":{"$ref":"#/$defs/mode"}},
       "mtbf_theorique_equipement_h":{"type":["number","null"]}}}
 }
}
schema_hist = {
 "$schema":"https://json-schema.org/draft/2020-12/schema",
 "$id":"https://example.org/jeu-maintenance/schema_historique.json",
 "title":"Historique GMAO des interventions — jeu sérieux BTS MS",
 "description":"Tableau d'événements. Durées en heures d'ouverture (_h), coûts en euros HT (_eur). Types de maintenance d'après NF EN 13306. Règle : duree_arret_totale_h = détection + attente logistique + réparation active + remise en service (vérifiée par le script, pas exprimable en JSON Schema).",
 "type":"array",
 "items":{"$ref":"#/$defs/evenement"},
 "$defs":{
  "piece_consommee":{"type":"object","required":["ref","quantite","prix_unitaire_eur"],"additionalProperties":False,
     "properties":{"ref":{"type":"string"},"quantite":{"type":"integer","minimum":1},"prix_unitaire_eur":NUM0}},
  "evenement":{"type":"object","additionalProperties":False,
   "required":["id_evenement","source","id_equipement","id_sous_ensemble","id_mode_defaillance","type_maintenance","debut_arret","fin_arret",
               "hors_temps_ouverture","duree_detection_h","duree_attente_logistique_h","duree_reparation_active_h","duree_remise_en_service_h",
               "duree_arret_totale_h","nb_techniciens","heures_main_oeuvre_h","pieces","cout_direct_eur","cout_indirect_eur","cout_total_eur"],
   "properties":{
     "id_evenement":{"type":"string","pattern":"^[A-Z]{2}-[0-9]{4}$"},
     "source":{"enum":["exercice","simulation","partie"]},
     "id_equipement":{"type":"string","pattern":"^[A-Z]{3}$"},
     "id_sous_ensemble":{"type":"string"},"id_mode_defaillance":{"type":"string"},"description":{"type":"string"},
     "type_maintenance":{"enum":TYPES_MAINT},
     "action":{"enum":["depannage","reglage","reparation","remplacement","inspection","nettoyage"]},
     "reparation_provisoire":{"type":"boolean","description":"vrai = action palliative (dépannage), faux = action curative"},
     "debut_arret":{"type":"string","format":"date-time","description":"ISO 8601 avec décalage horaire (Europe/Paris)"},
     "fin_arret":{"type":"string","format":"date-time"},
     "hors_temps_ouverture":{"type":"boolean"},
     "debut_arret_h_ouverture":{"type":["number","null"],"minimum":0,"description":"Instant de début en heures d'ouverture depuis le début de la période"},
     "tbf_precedent_h":{"type":["number","null"],"minimum":0,"description":"Temps de bon fonctionnement depuis la remise en service précédente du même équipement"},
     "duree_detection_h":NUM0,"duree_attente_logistique_h":NUM0,"duree_reparation_active_h":NUM0,"duree_remise_en_service_h":NUM0,
     "duree_arret_totale_h":NUM0,
     "nb_techniciens":{"type":"integer","minimum":0},
     "intervenant":{"enum":["interne","sous_traitance","mixte"]},
     "heures_main_oeuvre_h":NUM0,
     "pieces":{"type":"array","items":{"$ref":"#/$defs/piece_consommee"}},
     "cout_pieces_eur":NUM0,"cout_main_oeuvre_eur":NUM0,"cout_sous_traitance_eur":NUM0,"cout_direct_eur":NUM0,
     "penalite_arret_eur_par_h":NUM0,"cout_arret_production_eur":NUM0,"nb_rebuts_bouteilles":{"type":"integer","minimum":0},
     "cout_rebuts_eur":NUM0,"cout_indirect_eur":NUM0,"cout_total_eur":NUM0}}}
}
json.dump(schema_eq, open(OUT+"schema_equipement.json","w",encoding="utf-8"), ensure_ascii=False, indent=2)
json.dump(schema_hist, open(OUT+"schema_historique.json","w",encoding="utf-8"), ensure_ascii=False, indent=2)

# ---- validation ----
from jsonschema import Draft202012Validator, FormatChecker
fc = FormatChecker()
for sch, data in [(schema_eq, "usine.json"), (schema_hist, "historique_pannes.json"), (schema_hist, "historique_pannes_simule.json")]:
    Draft202012Validator.check_schema(sch)
    v = Draft202012Validator(sch, format_checker=fc)
    d = json.load(open(OUT+data, encoding="utf-8"))
    errs = list(v.iter_errors(d))
    print(data, "->", "VALIDE" if not errs else f"{len(errs)} ERREURS", *[e.message for e in errs[:5]])
    assert not errs
# cohérence interne (non exprimable en JSON Schema)
for f in ["historique_pannes.json","historique_pannes_simule.json"]:
    for e in json.load(open(OUT+f)):
        s = e["duree_detection_h"]+e["duree_attente_logistique_h"]+e["duree_reparation_active_h"]+e["duree_remise_en_service_h"]
        assert abs(s-e["duree_arret_totale_h"])<1e-6
        assert abs(e["cout_direct_eur"]+e["cout_indirect_eur"]-e["cout_total_eur"])<0.01
print("Cohérence durées/coûts : OK")
# contrôle croisé : pièces citées ⊂ pièces du mode ; références existantes au catalogue ; mode rattaché au bon équipement
U=json.load(open(OUT+"usine.json")); cat={p["ref"] for p in U["pieces"]}
MODES={m["id_mode"]:(e["id_equipement"],m) for e in U["equipements"] for m in e["modes"]}
for e in U["equipements"]:
    for m in e["modes"]:
        for r in m["pieces_corrective"]+m.get("pieces_preventive",[]): assert r in cat, (m["id_mode"], r)
for f in ["historique_pannes.json","historique_pannes_simule.json"]:
    erreurs=[]; n=0
    for ev in json.load(open(OUT+f)):
        md=ev["id_mode_defaillance"]
        if md not in MODES: erreurs.append((ev["id_evenement"],"mode inconnu",md)); continue
        eq,m=MODES[md]
        if eq!=ev["id_equipement"]: erreurs.append((ev["id_evenement"],"équipement",eq))
        if ev["id_sous_ensemble"]!=m["id_sous_ensemble"]: erreurs.append((ev["id_evenement"],"sous-ensemble",ev["id_sous_ensemble"]))
        autorisees=set(m["pieces_corrective"]) if ev["type_maintenance"].startswith("corrective") else set(m.get("pieces_preventive",[]))|set(m["pieces_corrective"])
        for p in ev["pieces"]:
            n+=1
            if p["ref"] not in cat: erreurs.append((ev["id_evenement"],"réf. absente du catalogue",p["ref"]))
            if p["ref"] not in autorisees: erreurs.append((ev["id_evenement"],"pièce hors du mode "+md,p["ref"]))
            px=next(x["prix_unitaire_eur"] for x in U["pieces"] if x["ref"]==p["ref"])
            if p["prix_unitaire_eur"]!=px: erreurs.append((ev["id_evenement"],"prix",p["ref"]))
    print(f, "-> contrôle croisé pièces/modes :", "OK" if not erreurs else erreurs, f"({n} lignes de pièces vérifiées)")
    assert not erreurs

# ---- contrôle de la règle du dépannage provisoire ----
from fractions import Fraction as Fr
def quart(x):
    q=Fr(str(x))*4; n=int(q)+(1 if q-int(q)>=Fr(1,2) else 0); return max(Fr(n,4),Fr(1,4))
tab=[]
for e in U["equipements"]:
    for m in e["modes"]:
        d=m["depannage_provisoire"]
        att=quart(Fr(str(d["ratio_reparation_active"]))*Fr(str(m["mttr_actif_h"])))
        assert Fr(str(d["duree_reparation_active_h"]))==att, (m["id_mode"], d["duree_reparation_active_h"], float(att))
        assert d["pieces"]==[] and d["reapparition_apres_h"]==40 and d["annule_par_curatif_differe"] is True and d["ratio_reparation_active"]==0.4
        assert d["autorise"] or d["justification"]
        tab.append((m["id_mode"], m["mttr_actif_h"], d["duree_reparation_active_h"], d["autorise"]))
print("Règle du dépannage provisoire : durées figées conformes pour", len(tab), "modes")
# avertissements (NON bloquants) : événements palliatifs des historiques confrontés à la règle
for f in ["historique_pannes.json","historique_pannes_simule.json"]:
    H=json.load(open(OUT+f)); avert=[]
    for ev in H:
        if not ev.get("reparation_provisoire"): continue
        eq,m=MODES[ev["id_mode_defaillance"]]; d=m["depannage_provisoire"]
        if not d["autorise"]: avert.append((ev["id_evenement"],"palliatif non autorisé pour ce mode"))
        if ev["duree_reparation_active_h"]!=d["duree_reparation_active_h"]:
            avert.append((ev["id_evenement"],f"réparation active {ev['duree_reparation_active_h']} h au lieu de {d['duree_reparation_active_h']} h"))
        if ev["pieces"]: avert.append((ev["id_evenement"],"pièces consommées"))
        if ev["debut_arret_h_ouverture"] is not None:
            fin=ev["debut_arret_h_ouverture"]+ev["duree_arret_totale_h"]; fin_sem=(int(fin//80)+1)*80
            if fin_sem-fin>d["reapparition_apres_h"]:
                suiv=[x for x in H if x["id_equipement"]==eq and x["id_mode_defaillance"]==m["id_mode"] and x["debut_arret_h_ouverture"] is not None and x["debut_arret_h_ouverture"]>=fin]
                prochain=min((x["debut_arret_h_ouverture"] for x in suiv), default=None)
                if prochain is None or prochain-fin>d["reapparition_apres_h"]:
                    avert.append((ev["id_evenement"],f"{fin_sem-fin:g} h d'ouverture entre la fin du dépannage et le samedi (> 40 h) : réapparition attendue vers {fin+40:g} h, non présente (panne suivante du mode à {prochain} h)"))
    print(f, "-> confrontation des palliatifs à la règle (non bloquant) :", avert if avert else "aucune contradiction")
