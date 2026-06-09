import { describe, expect, it } from "vitest";
import { computeCategoryTransitionSummary } from "@/lib/inspector/category-transition";

describe("category transition summary", () => {
  it("normalizes exact transition entropy against the 9x9 matrix maximum", () => {
    const summary = computeCategoryTransitionSummary({
      categoryTransitionAvailable: 1,
      transitionEntropy: Math.log(9),
      transitionMaxProbability: 0.2,
      transitionDiagonalMass: 0.55,
      transitionUpgradeMass: 0.3,
      transitionDowngradeMass: 0.15,
      transitionRiverPairOrBetterMass: 0.7,
      transitionRiverFlushOrBetterMass: 0.12,
    });

    expect(summary).not.toBeNull();
    expect(summary?.normalizedEntropy).toBeCloseTo(0.5);
    expect(summary?.directionalMass).toBeCloseTo(0.15);
    expect(summary?.diagonalMass).toBe(0.55);
  });

  it("clamps probability summaries and skips unavailable transitions", () => {
    expect(computeCategoryTransitionSummary({ categoryTransitionAvailable: 0 })).toBeNull();

    const summary = computeCategoryTransitionSummary({
      categoryTransitionAvailable: 1,
      transitionEntropy: Math.log(81) * 2,
      transitionMaxProbability: 1.5,
      transitionDiagonalMass: -0.2,
    });

    expect(summary?.normalizedEntropy).toBe(1);
    expect(summary?.maxProbability).toBe(1);
    expect(summary?.diagonalMass).toBe(0);
  });
});
