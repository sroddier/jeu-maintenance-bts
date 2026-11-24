import { describe, expect, it } from "vitest";
import { appliquer, demarrer } from "../src/sim/partie";
import type { Usine } from "../src/sim/types";
import { usine } from "../src/sim/usine";
import fixture from "./fixtures/inventaire-surcharge.json";
import {
  EPI,
  OUTILLAGE,
  alerteStock,
  etatDepuisPartie,
  htmlEpi,
  htmlOutillage,
  htmlPieces,
  lignesOutillage,
  lignesPieces,
  listeEpi,
  type EtatStockInventaire,
} from "../src/ui/inventaire";
import type { Piece } from "../src/sim/types";

describe("inventaire des pièces", () => {
  it("au niveau 1, le vrai usine.json affiche 2 semaines, les stocks mini figés et l'outillage disponible", () => {
    const surcharge = usine.organisation.surcharges_niveau_1;
    const lignes = lignesPieces(usine, null, 1);
    expect(usine.pieces).toHaveLength(14);
    expect(lignes).toHaveLength(14);
    expect(lignes.map((ligne) => ligne.ref)).toEqual(usine.pieces.map((piece) => piece.ref));
    expect(surcharge.delai_semaines_toutes_pieces).toBe(2);
    expect(surcharge.outillage_tout_disponible).toBe(true);
    expect(usine.pieces.some((piece) => piece.stock_mini !== surcharge.stock_mini[piece.ref])).toBe(true);
    expect(usine.pieces.some((piece) => piece.delai_semaines !== 2)).toBe(true);
    for (const ligne of lignes) {
      const piece = usine.pieces.find((item) => item.ref === ligne.ref)!;
      expect(ligne.designation).toBe(piece.designation);
      expect(ligne.prixUnitaireEur).toBe(piece.prix_unitaire_eur);
      expect(ligne.delaiSemaines).toBe(2);
      expect(ligne.stockMini).toBe(surcharge.stock_mini[piece.ref]);
      expect(ligne.stock).toBe(piece.stock_initial);
      expect(ligne.origineStock).toBe("initial");
      expect(ligne.enCommande).toBeNull();
      expect(ligne.alerte).toBe(alerteStock(piece.stock_initial, surcharge.stock_mini[piece.ref]));
    }
    const outils = lignesOutillage(usine, 1);
    expect(outils.map((ligne) => ligne.nom)).toEqual(usine.outillages?.map((outil) => outil.designation));
    const analyseur = outils.find((ligne) => ligne.nom.toLocaleLowerCase("fr").includes("analyseur vibratoire"));
    expect(analyseur?.disponible).toBe(false);
    expect(analyseur?.mention).toBe("disponible à partir du niveau 3");
    expect(outils.filter((ligne) => ligne !== analyseur).every((ligne) => ligne.disponible && ligne.mention === "disponible")).toBe(true);
    const html = htmlOutillage(usine);
    expect(html).toContain("disponible à partir du niveau 3");
    expect(html).toContain("plus-tard");
    expect(html).not.toContain("non disponible");
    expect(htmlPieces(lignes, false)).toContain("2 semaines");
  });

  it("repère un stock égal au mini et un stock en dessous", () => {
    const source = structuredClone(usine);
    delete (source.organisation as { surcharges_niveau_1?: unknown }).surcharges_niveau_1;
    const auMini = source.pieces.find((piece) => piece.stock_mini > 0)!;
    const enDessous = source.pieces.find((piece) => piece.ref !== auMini.ref && piece.stock_mini > 0)!;
    const auDessus = source.pieces.find((piece) => piece.ref !== auMini.ref && piece.ref !== enDessous.ref)!;
    const etat: EtatStockInventaire = {
      stocks: new Map([
        [auMini.ref, auMini.stock_mini],
        [enDessous.ref, auMini.ref === enDessous.ref ? 0 : Math.max(0, enDessous.stock_mini - 1)],
        [auDessus.ref, auDessus.stock_mini + 3],
      ]),
      commandes: new Map([
        [auMini.ref, 0],
        [enDessous.ref, 2],
        [auDessus.ref, 0],
      ]),
      detailsCommandes: new Map([[enDessous.ref, "2 délai standard"]]),
    };
    const lignes = lignesPieces(source, etat);
    const egal = lignes.find((ligne) => ligne.ref === auMini.ref)!;
    const sous = lignes.find((ligne) => ligne.ref === enDessous.ref)!;
    const ok = lignes.find((ligne) => ligne.ref === auDessus.ref)!;

    expect(egal.stock).toBe(auMini.stock_mini);
    expect(egal.sousOuAuMini).toBe(true);
    expect(egal.alerte).toBe("Au stock mini");
    expect(egal.origineStock).toBe("partie");
    expect(egal.enCommande).toBe(0);

    expect(sous.stock).toBeLessThan(sous.stockMini);
    expect(sous.sousOuAuMini).toBe(true);
    expect(sous.alerte).toBe("Sous le stock mini");
    expect(sous.enCommande).toBe(2);
    expect(sous.detailCommandes).toBe("2 délai standard");

    expect(ok.stock).toBeGreaterThan(ok.stockMini);
    expect(ok.sousOuAuMini).toBe(false);
    expect(ok.alerte).toBeNull();

    const html = htmlPieces(lignes, true);
    expect(html).toContain("Au stock mini");
    expect(html).toContain("Sous le stock mini");
    expect(html).toContain(egal.ref);
    expect(html).toContain(sous.ref);
    expect(html).not.toMatch(/budget/i);
    expect(html).not.toContain("Commander");
  });

  it("lit le stock de la partie sans le modifier, et laisse P-CON-01 au stock initial", () => {
    const partie = demarrer("2026", "Léa T.");
    const avant = structuredClone(partie);
    const lignes = lignesPieces(usine, etatDepuisPartie(partie));
    expect(partie).toEqual(avant);
    expect(partie.phase).toBe("planifier");
    expect(partie.heure).toBe(0);

    const suivies = partie.stock.map((lot) => lot.ref);
    for (const ref of suivies) {
      const ligne = lignes.find((item) => item.ref === ref)!;
      const lot = partie.stock.find((item) => item.ref === ref)!;
      expect(ligne.origineStock).toBe("partie");
      expect(ligne.stock).toBe(lot.qte);
      expect(ligne.enCommande).toBe(0);
    }

    const con = lignes.find((ligne) => ligne.ref === "P-CON-01")!;
    const source = usine.pieces.find((piece) => piece.ref === "P-CON-01")!;
    expect(partie.stock.some((lot) => lot.ref === "P-CON-01")).toBe(false);
    expect(con.stock).toBe(source.stock_initial);
    expect(con.origineStock).toBe("initial");
    expect(con.enCommande).toBeNull();
  });

  it("affiche une commande déjà présente dans l'état", () => {
    const partie = appliquer(demarrer("2026", "Léa T."), {
      type: "planning",
      commandes: [{ ref: "P-REM-01", qte: 3, delai: "standard" }],
    });
    const joints = lignesPieces(usine, etatDepuisPartie(partie)).find((ligne) => ligne.ref === "P-REM-01")!;
    expect(joints.enCommande).toBe(3);
    expect(joints.detailCommandes).toBe("3 délai standard");
    expect(joints.stock).toBe(usine.pieces.find((piece) => piece.ref === "P-REM-01")!.stock_initial);
  });
});

describe("inventaire outillage et EPI", () => {
  it("marque l'outillage du niveau 1 disponible, et l'analyseur au niveau 3", () => {
    expect(OUTILLAGE.filter((ligne) => ligne.disponible).map((ligne) => ligne.nom)).toEqual([
      "Outillage courant",
      "Clé dynamométrique",
      "Vérificateur d'absence de tension (VAT)",
      "Console de paramétrage",
      "Palan",
      "Kit de consignation",
      "Outillage de confort",
    ]);
    expect(OUTILLAGE.filter((ligne) => ligne.disponible).every((ligne) => ligne.mention === "disponible")).toBe(true);
    const analyseur = OUTILLAGE.find((ligne) => ligne.nom === "Analyseur vibratoire")!;
    expect(analyseur.disponible).toBe(false);
    expect(analyseur.mention).toBe("disponible à partir du niveau 3");
    const nu = structuredClone(usine);
    delete (nu.organisation as { surcharges_niveau_1?: unknown }).surcharges_niveau_1;
    delete (nu as { outillages?: unknown }).outillages;
    const html = htmlOutillage(nu);
    expect(html).toContain("disponible à partir du niveau 3");
    expect(html).toContain("plus-tard");
    expect(html).not.toContain("<table");
  });

  it("liste les EPI sans table d'exigences par mode", () => {
    expect(EPI.hygiene).toEqual([
      "Charlotte",
      "Blouse ou combinaison",
      "Chaussures de sécurité",
      "Cache-barbe si barbe",
    ]);
    expect(EPI.autres).toEqual([
      "Gants anti-coupure (lames, boucheuse)",
      "Protection auditive près des machines en marche",
    ]);
    expect(EPI.habilitation).toBe("L'habilitation électrique est requise pour les interventions électriques.");
    const html = htmlEpi();
    expect(html).toContain("L&#39;habilitation électrique est requise pour les interventions électriques.");
    for (const item of usine.organisation.epi_hygiene_base ?? []) expect(html).toContain(item);
    expect(html).toContain("Gants anti-coupure");
    expect(html).not.toContain("<table");
    expect(html).not.toContain("REM-M1");
  });

  it("lit un délai ou des listes déjà présents, et garde la liste statique sinon", () => {
    const source = structuredClone(usine) as Usine;
    delete (source.organisation as { surcharges_niveau_1?: unknown }).surcharges_niveau_1;
    delete (source.organisation as { epi_hygiene_base?: unknown }).epi_hygiene_base;
    delete (source as { outillages?: unknown }).outillages;
    expect(lignesOutillage(source).map((ligne) => ligne.nom)).toEqual(OUTILLAGE.map((ligne) => ligne.nom));
    expect(listeEpi(source).hygiene).toEqual([...EPI.hygiene]);
    expect(htmlEpi(source)).toContain("Charlotte");

    const piece = source.pieces[0] as Piece & { delai_semaines?: number };
    piece.delai_semaines = 11;
    expect(lignesPieces(source, null)[0].delaiSemaines).toBe(11);
    expect(lignesPieces(usine, null)[0].delaiSemaines).toBe(2);

    const charge = source as Usine & { outillages?: unknown };
    charge.outillages = [
      { id_outil: "OUTIL-TEST", designation: "Tournevis de test", prix_eur: 12, disponible_au_depart: true },
      { id_outil: "OUTIL-ABSENT", designation: "Outil absent de test", prix_eur: 4, disponible_au_depart: false },
    ];
    (charge.organisation as { epi_hygiene_base?: unknown }).epi_hygiene_base = ["bonnet de test"];

    const outils = lignesOutillage(charge);
    expect(outils.map((ligne) => ligne.nom)).toEqual(["Tournevis de test", "Outil absent de test"]);
    expect(outils[0]).toMatchObject({ disponible: true, mention: "disponible" });
    expect(outils[1]).toMatchObject({ disponible: false, mention: "non disponible au départ" });
    expect(htmlOutillage(charge)).toContain("Tournevis de test");
    expect(htmlOutillage(charge)).not.toContain("Clé dynamométrique");
    expect(listeEpi(charge).hygiene).toEqual(["bonnet de test"]);
    expect(listeEpi(charge).autres).toEqual([...EPI.autres]);
    expect(listeEpi(charge).habilitation).toBe(EPI.habilitation);
    expect(htmlEpi(charge)).toContain("bonnet de test");
    expect(htmlEpi(charge)).not.toContain("Charlotte");
    expect(listeEpi(usine).hygiene).toEqual([...(usine.organisation.epi_hygiene_base ?? [])]);
  });

  it("applique les surcharges du niveau 1 et les ignore sinon", () => {
    const sans = fixture.sans as unknown as Usine;
    const avec = fixture.avec as unknown as Usine;

    const brut = lignesPieces(sans, null);
    expect(brut.map((ligne) => ligne.delaiSemaines)).toEqual([6, 1]);
    expect(brut.map((ligne) => ligne.stockMini)).toEqual([8, 0]);
    expect(brut[0].alerte).toBe("Sous le stock mini");
    expect(lignesOutillage(sans)[0]).toMatchObject({
      disponible: false,
      mention: "non disponible au départ",
    });

    const niveau1 = lignesPieces(avec, null, 1);
    expect(niveau1.map((ligne) => ligne.delaiSemaines)).toEqual([4, 4]);
    expect(niveau1.map((ligne) => ligne.stockMini)).toEqual([1, 0]);
    expect(niveau1[0].alerte).toBeNull();
    expect(niveau1[0].sousOuAuMini).toBe(false);
    expect(niveau1[1].alerte).toBe("Au stock mini");
    expect(lignesOutillage(avec, 1).every((ligne) => ligne.disponible && ligne.mention === "disponible")).toBe(true);
    expect(htmlOutillage(avec)).toContain("disponible");
    expect(htmlOutillage(avec)).not.toContain("non disponible au départ");
    expect(htmlPieces(niveau1, false)).toContain("4 semaines");

    const autreNiveau = lignesPieces(avec, null, 2);
    expect(autreNiveau.map((ligne) => ligne.delaiSemaines)).toEqual([6, 1]);
    expect(autreNiveau.map((ligne) => ligne.stockMini)).toEqual([8, 0]);
    expect(lignesOutillage(avec, 2)[0].disponible).toBe(false);

    const plusTard = structuredClone(avec) as Usine & { outillages: Array<Record<string, unknown>> };
    plusTard.outillages = [
      {
        id_outil: "OUTIL-PLUS-TARD",
        designation: "Outil plus tard",
        prix_eur: 1,
        disponible_au_depart: false,
        niveau_min: 4,
      },
    ];
    expect(lignesOutillage(plusTard, 1)[0]).toMatchObject({
      disponible: false,
      mention: "disponible à partir du niveau 4",
    });
  });
});
