# -*- coding: utf-8 -*-
"""Corrigés : chaque résultat est recalculé et vérifié par assertion (valeurs exactes en fractions)."""
import json, math
from fractions import Fraction as Fr
import numpy as np
from scipy.special import gamma as G
from scipy import integrate, optimize, stats
OUT="/workspace/jeu-maintenance/"
U=json.load(open(OUT+"usine.json")); H=json.load(open(OUT+"historique_pannes.json"))
R={}
F=lambda x: Fr(str(x))
def exact(x, dec):  # x Fraction : a-t-il au plus `dec` décimales ?
    return (x*10**dec).denominator==1

# ---------- 1. Indicateurs par équipement (exercice, Tr = 800 h) ----------
Tr=Fr(800)
corr=[e for e in H if e["type_maintenance"].startswith("corrective") and not e["hors_temps_ouverture"]]
ind={}
for eq in ["SOU","REM","BOU","ETI","FAR","CON"]:
    ev=[e for e in corr if e["id_equipement"]==eq]
    N=len(ev); TA=sum(F(e["duree_arret_totale_h"]) for e in ev); TR=sum(F(e["duree_reparation_active_h"]) for e in ev)
    ATT=sum(F(e["duree_attente_logistique_h"]) for e in ev)
    TBF=Tr-TA; MTBF=TBF/N; MTTR=TR/N; MDT=TA/N
    Ao=TBF/Tr*100; Ai=MTBF/(MTBF+MTTR)*100
    # vérification par la colonne tbf_precedent_h + dernier intervalle
    last_end=max(F(e["debut_arret_h_ouverture"])+F(e["duree_arret_totale_h"]) for e in ev)
    assert sum(F(e["tbf_precedent_h"]) for e in ev)+(Tr-last_end)==TBF
    assert exact(MTBF,1) and exact(MTTR,2) and exact(MDT,2) and exact(Ao,1), eq
    ind[eq]=dict(N=N, somme_TA_h=float(TA), somme_reparation_h=float(TR), somme_attente_h=float(ATT), somme_TBF_h=float(TBF),
                 MTBF_h=float(MTBF), MTTR_h=float(MTTR), MDT_h=float(MDT), Ao_pct=float(Ao), Ai_pct_exact=float(Ai), Ai_pct_arrondi=round(float(Ai),1),
                 Ai_exact=exact(Ai,1), cout_direct_eur=sum(e["cout_direct_eur"] for e in ev), cout_indirect_eur=sum(e["cout_indirect_eur"] for e in ev),
                 cout_total_eur=sum(e["cout_total_eur"] for e in ev))
R["indicateurs"]=ind
assert ind["REM"]["MTBF_h"]==180 and ind["REM"]["MTTR_h"]==7.5 and ind["REM"]["MDT_h"]==20 and ind["REM"]["Ao_pct"]==90 and ind["REM"]["Ai_pct_exact"]==96

# ---------- 2. Goulot ----------
cad={e["id_equipement"]:e["cadence_nominale_bouteilles_par_h"] for e in U["equipements"]}
goulot=min(cad,key=cad.get); assert goulot=="REM" and sorted(cad.values())[1]-cad[goulot]>=1000
R["goulot"]=dict(id=goulot, cadence=cad[goulot], cadences=cad)

# ---------- 3. Pareto sur les temps d'arrêt ----------
tot=sum(F(ind[k]["somme_TA_h"]) for k in ind); assert tot==160
order=sorted(ind, key=lambda k:(-ind[k]["somme_TA_h"], k))
cum=Fr(0); par=[]
for k in order:
    p=F(ind[k]["somme_TA_h"])/tot*100; cum+=p
    cl="A" if cum<=80 else ("B" if cum<=95 else "C")
    assert exact(p,1) and exact(cum,1)
    par.append(dict(eq=k, TA=ind[k]["somme_TA_h"], N=ind[k]["N"], MDT=ind[k]["MDT_h"], pct=float(p), cumul=float(cum), classe=cl))
assert [x["classe"] for x in par]==["A","A","B","B","C","C"]
R["pareto"]=par
# Pareto en nombre de pannes
totN=sum(ind[k]["N"] for k in ind); assert totN==24
R["pareto_N"]=sorted([(k,ind[k]["N"]) for k in ind], key=lambda x:-x[1])

# ---------- 4. ABC stock ----------
conso=[("P-REM-02",25),("P-BOU-01",15),("P-REM-04",2),("P-REM-03",10),("P-ETI-01",10),("P-FAR-02",8),
       ("P-SOU-01",20),("P-ETI-02",5),("P-FAR-01",2),("P-CON-03",1)]
px={p["ref"]:F(p["prix_unitaire_eur"]) for p in U["pieces"]}
des={p["ref"]:p["designation"] for p in U["pieces"]}
rows=[(r,q,px[r],q*px[r]) for r,q in conso]; rows.sort(key=lambda x:-x[3])
totv=sum(x[3] for x in rows); assert totv==50000
cum=Fr(0); abc=[]
for r,q,p,v in rows:
    pc=v/totv*100; cum+=pc; cl="A" if cum<=80 else ("B" if cum<=95 else "C")
    assert exact(pc,1)
    abc.append(dict(ref=r, designation=des[r], qte_an=q, prix=float(p), valeur=float(v), pct=float(pc), cumul=float(cum), classe=cl))
assert [x["classe"] for x in abc].count("A")==3 and abc[2]["cumul"]==80 and abc[5]["cumul"]==95
R["abc"]=abc

# ---------- 5. Fiabilité : calculs « calculatrice » ----------
g=lambda b: float(G(1+1/b))
GT={b: round(g(b),4) for b in [0.5,1,1.5,2,2.5,3,3.5,4]}
R["gamma_table"]=GT
calc={}
calc["MTBF_CON_M1"]=100*GT[0.5]; assert calc["MTBF_CON_M1"]==200
calc["MTBF_BOU_M1"]=round(500*GT[2],1); assert calc["MTBF_BOU_M1"]==443.1
calc["MTBF_FAR_M2"]=round(100+400*GT[3],1); assert calc["MTBF_FAR_M2"]==457.2
calc["MTBF_REM_M1_premiere"]=round(300*GT[3],1); assert calc["MTBF_REM_M1_premiere"]==267.9
calc["R_BOU_250"]=round(math.exp(-(250/500)**2),4); assert calc["R_BOU_250"]==0.7788
calc["lambda_BOU_250"]=2/500*(250/500)**1; assert abs(calc["lambda_BOU_250"]-0.002)<1e-12
calc["R_ETI_80"]=round(math.exp(-0.01*80),4); assert calc["R_ETI_80"]==0.4493
calc["F_ETI_80"]=round(1-math.exp(-0.8),4); assert calc["F_ETI_80"]==0.5507
calc["lambda_CON_25"]=0.5/100*(25/100)**(-0.5); assert abs(calc["lambda_CON_25"]-0.01)<1e-12
calc["lambda_CON_400"]=0.5/100*(400/100)**(-0.5); assert abs(calc["lambda_CON_400"]-0.0025)<1e-12
# probabilité de panne dans la semaine (80 h) sachant l'âge (formule du GDD)
calc["P_BOU_sem_age400"]=round(1-math.exp(-(((480/500)**2)-((400/500)**2))),4)
R["calc_fiab"]=calc

# ---------- 6. Ajustement de Weibull (BOU-M1, relevé fictif de 6 TBF) ----------
n=6; Fb=[(i-0.3)/(n+0.4) for i in range(1,n+1)]
t_th=[500*(-math.log(1-f))**0.5 for f in Fb]
t=[int(round(x/10)*10) for x in t_th]   # valeurs arrondies à 10 h -> données de l'exercice
X=np.log(t); Y=np.log(np.log(1/(1-np.array(Fb))))
b,a=np.polyfit(X,Y,1); eta=math.exp(-a/b)
r=np.corrcoef(X,Y)[0,1]
mle=stats.weibull_min.fit(t, floc=0)
R["weibull"]=dict(t=t, F_bernard=[round(f,4) for f in Fb], X=[round(x,4) for x in X], Y=[round(y,4) for y in Y],
                  beta_reg=round(b,3), eta_reg=round(eta,1), r=round(r,4), beta_mle=round(mle[0],3), eta_mle=round(mle[2],1))
assert abs(b-2)<0.2 and abs(eta-500)/500<0.05

# ---------- 7. Période optimale de préventif ----------
# Modèle A (calculatrice) : remplacement périodique, réparations minimales entre deux remplacements (REM-M1)
Cp,Cc,beta,eta=1000,4000,3,300
Ts=eta*(Cp/(Cc*(beta-1)))**(1/beta); assert abs(Ts-150)<1e-9
C=lambda T:(Cp+Cc*(T/eta)**beta)/T
tab=[(T, round(C(T),2)) for T in [80,100,150,160,200,240,320,400]]
assert abs(C(150)-10)<1e-12
R["prev_A"]=dict(Cp=Cp,Cc=Cc,beta=beta,eta=eta,Tstar=Ts,Cstar=C(150),tab=tab, H320=round((320/300)**3,4), C160=round(C(160),2), C320=round(C(320),2),
                 gain_annuel_eur=round((C(320)-C(160))*4000,0))
# Modèle B (moteur, intégration numérique) : remplacement selon l'âge (Barlow-Proschan), BOU-M1 renouvellement
Rw=lambda x,b,e: math.exp(-(x/e)**b)
def CB(T,b,e,cp,cc):
    I=integrate.quad(lambda x:Rw(x,b,e),0,T)[0]
    return (cp*Rw(T,b,e)+cc*(1-Rw(T,b,e)))/I
cpB,ccB=1000,5800
res=optimize.minimize_scalar(lambda T:CB(T,2,500,cpB,ccB), bounds=(10,2000), method="bounded")
R["prev_B"]=dict(Cp=cpB,Cc=ccB,beta=2,eta=500,Tstar=round(res.x,1),Cstar=round(res.fun,3),C_corr=round(ccB/(500*GT[2]),3),
                 tab=[(T,round(CB(T,2,500,cpB,ccB),3)) for T in [100,200,300,400,500,800,1500]])
# beta = 1 : pas d'optimum (C décroît avec T) — vérif
cb1=[CB(T,1,100,180,1400) for T in [50,100,200,400,800]]; assert all(x>y for x,y in zip(cb1,cb1[1:]))
R["prev_beta1"]=[round(x,3) for x in cb1]

# ---------- 8. TRS (ligne mesurée au goulot, NF E60-182) ----------
Tt=Fr(10*168); To=Fr(800); Trq=To  # pas d'arrêt planifié dans le temps d'ouverture (préventif le samedi)
arr_goulot=F(ind["REM"]["somme_TA_h"]); arr_autres=sum(F(ind[k]["somme_TA_h"]) for k in ind if k!="REM")
induits=arr_autres*F(U["organisation"]["coefficient_propagation_arret_hors_goulot"]); formats=Fr(40)
Tf=Trq-arr_goulot-induits-formats; Do=Tf/Trq
Cn=Fr(10000); prod=Fr(5400000); bonnes=Fr(5292000)
Tn=prod/Cn; Tu=bonnes/Cn; Tp=Tn/Tf; Tq=Tu/Tn; TRS=Tu/Trq  # TRS = Do × Tp × Tq (NF E60-182)
assert Tf==600 and Do==Fr(3,4) and Tp==Fr(9,10) and Tq==Fr(49,50) and TRS==Do*Tp*Tq and TRS*100==F("66.15")
R["trs"]=dict(Tt=float(Tt),To=float(To),Tr=float(Trq),arr_goulot=float(arr_goulot),arr_autres=float(arr_autres),induits=float(induits),formats=float(formats),
              Tf=float(Tf),Do=float(Do*100),production=int(prod),bonnes=int(bonnes),rebuts=int(prod-bonnes),Tn=float(Tn),Tu=float(Tu),
              Tp=float(Tp*100),Tq=float(Tq*100),TRS=float(TRS*100),TRG=float(Tu/To*100),TRE=float(Tu/Tt*100),
              somme_erronee=float((Do+Tp+Tq)/3*100))
assert R["trs"]["TRE"]==31.5
# disponibilité "ligne" si toutes les pannes arrêtaient la ligne (série sans stock tampon)
R["dispo_serie"]=dict(somme=float((Tr-tot)/Tr*100), produit=round(float(np.prod([ind[k]["Ao_pct"]/100 for k in ind]))*100,2))

# ---------- 9. Coûts (exercice) ----------
cd=sum(F(e["cout_direct_eur"]) for e in H); ci=sum(F(e["cout_indirect_eur"]) for e in H)
R["couts"]=dict(direct=float(cd), indirect=float(ci), total=float(cd+ci),
                par_eq={k:(ind[k]["cout_direct_eur"],ind[k]["cout_indirect_eur"],ind[k]["cout_total_eur"]) for k in ind},
                prev_direct=float(sum(F(e["cout_direct_eur"]) for e in H if e["hors_temps_ouverture"])),
                mo=float(sum(F(e["cout_main_oeuvre_eur"]) for e in H)), pieces=float(sum(F(e["cout_pieces_eur"]) for e in H)),
                arret=float(sum(F(e["cout_arret_production_eur"]) for e in H)), rebuts=float(sum(F(e["cout_rebuts_eur"]) for e in H)))
assert R["couts"]["mo"]+R["couts"]["pieces"]==R["couts"]["direct"]
# exemple EX-0004 détaillé
e4=next(e for e in H if e["id_evenement"]=="EX-0004"); assert e4["cout_total_eur"]==4000
e17=next(e for e in H if e["id_evenement"]=="EX-0017"); R["ex17"]=e17

# ---------- 10. AMDEC (REM) ----------
amdec=[("REM-M1","Fuite de joint de vanne","sous-remplissage, bouteilles rebutées",3,3,2),
       ("REM-M2","Dérive de la sonde de niveau","niveaux hors tolérance non vus",2,3,3),
       ("REM-M3","Défaillance du motoréducteur","arrêt long (> 24 h) de la ligne",1,4,2),
       ("REM-M4","Contamination produit (joint de cuve / NEP)","risque sanitaire, rappel de lots",1,4,3)]
R["amdec"]=[dict(mode=m,def_=d,effet=ef,F=f,G=gg,D=dd,C=f*gg*dd) for m,d,ef,f,gg,dd in amdec]
assert [x["C"] for x in R["amdec"]]==[18,18,8,12]

# ---------- 11. Vérification de l'historique SIMULÉ ----------
import sys; sys.path.insert(0, OUT+"scripts"); import donnees as Dn
S=json.load(open(OUT+"historique_pannes_simule.json"))
def bilan(evs, info, T):
    out={}
    for E in U["equipements"]:
        k=E["id_equipement"]; ev=[e for e in evs if e["id_equipement"]==k and not e["hors_temps_ouverture"]]
        TA=sum(e["duree_arret_totale_h"] for e in ev); TRr=sum(e["duree_reparation_active_h"] for e in ev)
        out[k]=dict(N=len(ev), MTBF=round((T-TA)/len(ev),1), MTTR=round(TRr/len(ev),2), MDT=round(TA/len(ev),2), Ao=round((T-TA)/T*100,2))
    modes={}
    for E in U["equipements"]:
        for m in E["modes"]:
            ages=[x for x in info.get(m["id_mode"],[]) if x is not None]
            modes[m["id_mode"]]=dict(n=len(info.get(m["id_mode"],[])), moy=(round(float(np.mean(ages)),1) if ages else None),
                                     th=round(m["gamma_h"]+m["eta_h"]*g(m["beta"]),1), effet=m["effet_correctif"])
    c=info.get("REM-M1_ages_cycles",[])
    modes["REM-M1"]["attendu"]=round(sum((x/300)**3 for x in c),1); modes["REM-M1"]["cycles"]=len(c)
    return out, modes
_, info1, T1 = Dn.historique_simule(seed=2026, semaines=50, avec_dates=False)
R["sim_ind"], R["sim_modes"] = bilan([e for e in S], info1, 4000.0)
evL, infoL, TL = Dn.historique_simule(seed=1, semaines=50000, avec_dates=False)
R["simL_ind"], R["simL_modes"] = bilan(evL, infoL, TL)
# MTBF théorique équipement (superposition de processus de renouvellement, régime établi)
th_eq={}
for E in U["equipements"]:
    if E["id_equipement"]=="REM": continue
    th_eq[E["id_equipement"]]=round(1/sum(1/(m["gamma_h"]+m["eta_h"]*g(m["beta"])) for m in E["modes"]),1)
R["mtbf_th_eq"]=th_eq
for k,v in th_eq.items():
    assert abs(R["simL_ind"][k]["MTBF"]-v)/v < 0.03, (k, R["simL_ind"][k]["MTBF"], v)
for k,v in R["simL_modes"].items():
    if v["moy"] is not None: assert abs(v["moy"]-v["th"])/v["th"] < 0.03, (k,v)
assert abs(R["simL_modes"]["REM-M1"]["n"]/R["simL_modes"]["REM-M1"]["attendu"]-1) < 0.02
R["sim_nb"]=len(S); R["sim_nb_prev"]=sum(1 for e in S if e["type_maintenance"]=="preventive_systematique")
json.dump(R, open(OUT+"scripts/resultats.json","w"), ensure_ascii=False, indent=1, default=str)
print(json.dumps({k:R[k] for k in ["sim_ind","sim_modes","simL_ind","simL_modes","mtbf_th_eq","sim_nb","sim_nb_prev","calc_fiab"]}, ensure_ascii=False, default=str))
print("TOUTES LES ASSERTIONS PASSENT")
