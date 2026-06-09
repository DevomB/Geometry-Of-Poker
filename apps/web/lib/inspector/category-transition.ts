import type { PointSummary } from "@/lib/types";

export interface CategoryTransitionSummary {
  entropy: number;
  normalizedEntropy: number;
  maxProbability: number;
  diagonalMass: number;
  upgradeMass: number;
  downgradeMass: number;
  directionalMass: number;
  riverPairOrBetterMass: number;
  riverFlushOrBetterMass: number;
}

const CATEGORY_MATRIX_CELLS = 81;

export function computeCategoryTransitionSummary(
  summary: PointSummary,
): CategoryTransitionSummary | null {
  if (!isAvailable(summary.categoryTransitionAvailable)) return null;

  const entropy = finiteNonNegative(summary.transitionEntropy);
  if (entropy === null) return null;

  return {
    entropy,
    normalizedEntropy: clamp01(entropy / Math.log(CATEGORY_MATRIX_CELLS)),
    maxProbability: probability(summary.transitionMaxProbability) ?? 0,
    diagonalMass: probability(summary.transitionDiagonalMass) ?? 0,
    upgradeMass: probability(summary.transitionUpgradeMass) ?? 0,
    downgradeMass: probability(summary.transitionDowngradeMass) ?? 0,
    directionalMass:
      (probability(summary.transitionUpgradeMass) ?? 0) -
      (probability(summary.transitionDowngradeMass) ?? 0),
    riverPairOrBetterMass: probability(summary.transitionRiverPairOrBetterMass) ?? 0,
    riverFlushOrBetterMass: probability(summary.transitionRiverFlushOrBetterMass) ?? 0,
  };
}

function isAvailable(value: number | undefined): boolean {
  return typeof value === "number" && Number.isFinite(value) && value > 0.5;
}

function finiteNonNegative(value: number | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function probability(value: number | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return clamp01(value);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
