import { describe, expect, it } from "vitest";
import { QUANTITE_MAX, QUANTITE_MIN, bornerQuantite, filtrerChiffres } from "../src/ui/quantite";

describe("quantité commandée", () => {
  it("borne la saisie entre 0 et 20, comme la validation du planning", () => {
    expect(QUANTITE_MIN).toBe(0);
    expect(QUANTITE_MAX).toBe(20);
    expect(bornerQuantite(0)).toBe(0);
    expect(bornerQuantite(20)).toBe(20);
    expect(bornerQuantite(4)).toBe(4);
    expect(bornerQuantite(21)).toBe(20);
    expect(bornerQuantite(99)).toBe(20);
    expect(bornerQuantite(-1)).toBe(0);
    expect(bornerQuantite(-3.2)).toBe(0);
    expect(bornerQuantite(5.9)).toBe(5);
    expect(bornerQuantite(Number.NaN)).toBe(0);
    expect(bornerQuantite(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it("ne garde que les chiffres saisis au clavier", () => {
    expect(filtrerChiffres("12")).toBe("12");
    expect(filtrerChiffres("2 pièces")).toBe("2");
    expect(filtrerChiffres("")).toBe("");
  });
});
