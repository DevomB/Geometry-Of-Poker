import { getPokerCalculations } from "../pc.js";
import { cardStringToDeckIndex } from "poker-calculations/encode";
import {
  l1Norm,
  l2Norm,
  mean,
  negativeMass,
  positiveMass,
  stdDev,
} from "../cards.js";
import { resolveVillainRange } from "../range.js";
import type { ValidatedState } from "../validate-input.js";

export interface RemovalFeatureResult {
  summaries: Record<string, number>;
  gradient?: number[];
  available: number;
}

const NEUTRAL_REMOVAL: Record<string, number> = {
  removalGradientMean: 0,
  removalGradientStdDev: 0,
  removalGradientMin: 0,
  removalGradientMax: 0,
  removalGradientL1: 0,
  removalGradientL2: 0,
  removalGradientPositiveMass: 0,
  removalGradientNegativeMass: 0,
  removalGradientAvailable: 0,
};

function summarizeGradient(activeGradient: number[]): Record<string, number> {
  if (activeGradient.length === 0) {
    return { ...NEUTRAL_REMOVAL };
  }
  return {
    removalGradientMean: mean(activeGradient),
    removalGradientStdDev: stdDev(activeGradient),
    removalGradientMin: Math.min(...activeGradient),
    removalGradientMax: Math.max(...activeGradient),
    removalGradientL1: l1Norm(activeGradient),
    removalGradientL2: l2Norm(activeGradient),
    removalGradientPositiveMass: positiveMass(activeGradient),
    removalGradientNegativeMass: negativeMass(activeGradient),
    removalGradientAvailable: 1,
  };
}

export function computeRemovalFeatures(
  state: ValidatedState,
  villainRange?: Float64Array,
  includeFullGradient = false,
): RemovalFeatureResult {
  try {
    const pc = getPokerCalculations();
    const range = resolveVillainRange(villainRange);
    const result = pc.exactEquityCardRemovalGradient(state.hero, state.board, range);
    const gradient = Array.from(result.gradient);

    const knownIndices = new Set(
      [...state.hero, ...state.board, ...state.deadCards].map((c) => cardStringToDeckIndex(c)),
    );
    const activeValues = gradient.filter((_, idx) => !knownIndices.has(idx));

    const summaries = summarizeGradient(activeValues);

    return {
      summaries,
      gradient: includeFullGradient ? gradient : undefined,
      available: 1,
    };
  } catch {
    return { summaries: { ...NEUTRAL_REMOVAL }, available: 0 };
  }
}

export const REMOVAL_SUMMARY_NAMES = Object.keys(NEUTRAL_REMOVAL);

export const REMOVAL_GRADIENT_NAMES = Array.from(
  { length: 52 },
  (_, i) => `removalGradientDeck${i}`,
);
