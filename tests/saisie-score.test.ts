import { describe, expect, it } from "vitest";
import { calculerScore, etoiles, noteSur20, pointsCout, pointsDisponibilite } from "../src/sim/score";
import { evaluerSaisie, parserNombre, type ContexteSaisie } from "../src/sim/saisie";

const CTX: ContexteSaisie = {
  tr: 800,
  n: 4,
  sommeTA: 80,
  sommeReparation: 30,
  mtbf: 180,
  mttr: 7.5,
  mdt: 20,
  ai: 96,
  dispo: 90,
};

describe("saisie des indicateurs", () => {
  it("accepte la virgule, le point et une tolérance de 0,05", () => {
    expect(parserNombre("180")).toBe(180);
    expect(parserNombre("7,5")).toBe(7.5);
    expect(parserNombre("7.5 h")).toBe(7.5);
    expect(parserNombre("90 %")).toBe(90);
    expect(parserNombre("1 800")).toBe(1800);
    expect(evaluerSaisie("mtbf", "180,04", CTX).ok).toBe(true);
    expect(evaluerSaisie("mtbf", "180,2", CTX).ok).toBe(false);
    expect(evaluerSaisie("mttr", "7,5", CTX).ok).toBe(true);
    expect(evaluerSaisie("ao", "90", CTX).ok).toBe(true);
    expect(evaluerSaisie("ao", "89,96", CTX).ok).toBe(true);
  });

  it("reconnaît Tr/N, le MDT saisi à la place du MTTR, et l'Ai saisie à la place de l'Ao", () => {
    expect(evaluerSaisie("mtbf", "200", CTX).indice).toMatch(/Tr \/ N/);
    expect(evaluerSaisie("mttr", "20", CTX).indice).toMatch(/MDT/);
    expect(evaluerSaisie("ao", "96", CTX).indice).toMatch(/Ao/);
    expect(evaluerSaisie("ao", "96", CTX).indice).not.toMatch(/Do/);
    expect(evaluerSaisie("ao", "100", CTX).indice).toMatch(/100 %/);
    expect(evaluerSaisie("ao", "0,90", CTX).indice).toMatch(/pourcent/);
    expect(evaluerSaisie("ao", "10", CTX).correction).toMatch(/Ao = /);
    expect(evaluerSaisie("ao", "10", CTX).correction).not.toMatch(/Do/);
  });

  it("la deuxième erreur porte la correction chiffrée", () => {
    const correction = evaluerSaisie("mtbf", "10", CTX).correction;
    expect(correction).toMatch(/180/);
    expect(correction).toMatch(/MTBF/);
  });
});

describe("score et note", () => {
  it("arrondit au demi-point et place les étoiles à 60 / 75 / 90", () => {
    expect(noteSur20(100)).toBe(20);
    expect(noteSur20(87.5)).toBe(17.5);
    expect(noteSur20(88)).toBe(17.5);
    expect(noteSur20(90)).toBe(18);
    expect(etoiles(59.9)).toBe(0);
    expect(etoiles(60)).toBe(1);
    expect(etoiles(75)).toBe(2);
    expect(etoiles(90)).toBe(3);
  });

  it("donne 40 points de disponibilité à l'objectif 92 % et 0 à 70 %", () => {
    expect(pointsDisponibilite(92)).toBeCloseTo(40, 6);
    expect(pointsDisponibilite(98)).toBeCloseTo(50, 6);
    expect(pointsDisponibilite(70)).toBe(0);
    expect(pointsDisponibilite(100)).toBe(50);
    expect(pointsDisponibilite(60)).toBe(0);
  });

  it("compare le coût à la référence, plafonné entre 0 et 25", () => {
    expect(pointsCout(1000, 1000)).toBe(25);
    expect(pointsCout(800, 1000)).toBe(25);
    expect(pointsCout(2000, 1000)).toBe(0);
    expect(pointsCout(1500, 1000)).toBeCloseTo(12.5, 6);
  });

  it("une partie parfaite atteint 100 et 20/20", () => {
    const score = calculerScore({
      aoPct: 99,
      coutGlobal: 100,
      coutReference: 120,
      questions: [{ credit: 1 }, { credit: 1 }],
    });
    expect(score.total).toBeCloseTo(100, 6);
    expect(score.note20).toBe(20);
    expect(score.etoiles).toBe(3);
    expect(score.passage).toBe(true);
  });

  it("la justesse partielle pèse 25 points", () => {
    const score = calculerScore({
      aoPct: 70,
      coutGlobal: 999,
      coutReference: 1,
      questions: [{ credit: 1 }, { credit: 0.5 }, { credit: 0 }],
    });
    expect(score.pointsAo).toBe(0);
    expect(score.pointsCout).toBe(0);
    expect(score.pointsJustesse).toBeCloseTo(12.5, 6);
    expect(score.passage).toBe(false);
  });

  it("réussit le niveau 1 seulement si Ao ≥ 92 %, au moins 2 étoiles et 70 % de calculs justes", () => {
    const juste = Array.from({ length: 7 }, () => ({ credit: 1 }));
    const rate = Array.from({ length: 3 }, () => ({ credit: 0 }));
    const reussi = calculerScore({
      aoPct: 92,
      coutGlobal: 100,
      coutReference: 100,
      questions: [...juste, ...rate],
    });
    expect(reussi.etoiles).toBeGreaterThanOrEqual(2);
    expect(reussi.justesseRatio).toBeCloseTo(0.7, 6);
    expect(reussi.objectifAo).toBe(true);
    expect(reussi.passage).toBe(true);

    const aoInsuffisant = calculerScore({
      aoPct: 91.99,
      coutGlobal: 100,
      coutReference: 100,
      questions: [{ credit: 1 }],
    });
    expect(aoInsuffisant.passage).toBe(false);

    const uneEtoile = calculerScore({
      aoPct: 92,
      coutGlobal: 200,
      coutReference: 100,
      questions: [{ credit: 1 }],
    });
    expect(uneEtoile.etoiles).toBe(1);
    expect(uneEtoile.passage).toBe(false);

    const calculs = calculerScore({
      aoPct: 92,
      coutGlobal: 100,
      coutReference: 100,
      questions: [...Array.from({ length: 6 }, () => ({ credit: 1 })), ...Array.from({ length: 4 }, () => ({ credit: 0 }))],
    });
    expect(calculs.justesseRatio).toBeCloseTo(0.6, 6);
    expect(calculs.etoiles).toBeGreaterThanOrEqual(2);
    expect(calculs.passage).toBe(false);
  });
});
