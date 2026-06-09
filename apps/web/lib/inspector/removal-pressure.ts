import type { PointSummary } from "@/lib/types";

export interface RemovalPressure {
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  l1: number;
  l2: number;
  positiveMass: number;
  negativeMass: number;
  signedMass: number;
  concentration: number;
  uniformConcentrationFloor: number | null;
  activeCardCount: number | null;
}

export function computeRemovalPressure(
  summary: PointSummary,
  activeCardCount?: number,
): RemovalPressure | null {
  if (!isAvailable(summary.removalGradientAvailable)) return null;

  const l1 = finitePositive(summary.removalGradientL1);
  const l2 = finitePositive(summary.removalGradientL2);
  if (l1 === null || l2 === null) return null;

  const positiveMass = finiteNonNegative(summary.removalGradientPositiveMass) ?? 0;
  const negativeMass = finiteNonNegative(summary.removalGradientNegativeMass) ?? 0;
  const active =
    typeof activeCardCount === "number" && Number.isInteger(activeCardCount) && activeCardCount > 0
      ? activeCardCount
      : null;

  return {
    mean: finite(summary.removalGradientMean) ?? 0,
    stdDev: finiteNonNegative(summary.removalGradientStdDev) ?? 0,
    min: finite(summary.removalGradientMin) ?? 0,
    max: finite(summary.removalGradientMax) ?? 0,
    l1,
    l2,
    positiveMass,
    negativeMass,
    signedMass: positiveMass - negativeMass,
    concentration: l2 / l1,
    uniformConcentrationFloor: active === null ? null : 1 / Math.sqrt(active),
    activeCardCount: active,
  };
}

function isAvailable(value: number | undefined): boolean {
  return typeof value === "number" && Number.isFinite(value) && value > 0.5;
}

function finite(value: number | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function finitePositive(value: number | undefined): number | null {
  const n = finite(value);
  return n !== null && n > 0 ? n : null;
}

function finiteNonNegative(value: number | undefined): number | null {
  const n = finite(value);
  return n !== null && n >= 0 ? n : null;
}
