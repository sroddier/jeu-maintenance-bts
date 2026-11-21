# Vérifie les valeurs écrites « à la main » dans cadrage-metier.md
import json,math
H=json.load(open('/workspace/jeu-maintenance/historique_pannes.json'))
rem=[e for e in H if e['id_equipement']=='REM' and not e['hors_temps_ouverture']]
s=lambda k: sum(e[k] for e in rem)
assert (s('duree_detection_h'),s('duree_attente_logistique_h'),s('duree_reparation_active_h'),s('duree_remise_en_service_h'))==(1.5,46,30,2.5)
assert 46/4==11.5 and (1.5+2.5)/4==1
assert 29.75*1200==35700 and round((75+90+98)/3,2)==87.67
assert round(1-math.exp(-0.25),4)==0.2212 and round((480/500)**2-(400/500)**2,4)==0.2816
assert round(math.exp(-0.5),4)==0.6065 and 23.5*40==940 and round(100+400*0.8930,1)==457.2 and round(400*0.8930,1)==357.2
assert 2*1000+2*230==2460
e4=[e for e in H if e['id_evenement']=='EX-0004'][0]
assert (e4['cout_pieces_eur'],e4['cout_main_oeuvre_eur'],e4['cout_arret_production_eur'],e4['cout_rebuts_eur'])==(50,110,3600,240)
assert sum(1 for e in H if e['reparation_provisoire'])==2
assert round(0.8*2+1,1)==2.6 and (4.5-2.5)/0.25==8
print("vérifs du texte OK")
