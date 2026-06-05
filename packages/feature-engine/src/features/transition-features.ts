import { getPokerCalculations } from "../pc.js";
import { entropy, stdDev } from "../cards.js";
import type { ExactFeatureBudget } from "../types.js";
import type { ValidatedState } from "../validate-input.js";

export interface TransitionFeatureResult {
  summaries: Record<string, number>;
  jointMatrix?: number[];
  available: number;
}

const NEUTRAL_TRANSITION: Record<string, number> = {
  transitionEntropy: 0,
  transitionMaxProbability: 0,
  transitionStdDev: 0,
  transitionDiagonalMass: 0,
  transitionUpgradeMass: 0,
  transitionDowngradeMass: 0,
  transitionRiverPairOrBetterMass: 0,
  transitionRiverFlushOrBetterMass: 0,
  categoryTransitionAvailable: 0,
};

const PAIR_CATEGORY_INDEX = 1;
const FLUSH_CATEGORY_INDEX = 5;

function summarizeJointMatrix(matrix: number[]): Record<string, number> {
  let diagonalMass = 0;
  let upgradeMass = 0;
  let downgradeMass = 0;
  let riverPairOrBetter = 0;
  let riverFlushOrBetter = 0;

  for (let turn = 0; turn < 9; turn++) {
    for (let river = 0; river < 9; river++) {
      const p = matrix[turn * 9 + river] ?? 0;
      if (turn === river) diagonalMass += p;
      if (river > turn) upgradeMass += p;
      if (river < turn) downgradeMass += p;
      if (river >= PAIR_CATEGORY_INDEX) riverPairOrBetter += p;
      if (river >= FLUSH_CATEGORY_INDEX) riverFlushOrBetter += p;
    }
  }

  return {
    transitionEntropy: entropy(matrix),
    transitionMaxProbability: Math.max(...matrix),
    transitionStdDev: stdDev(matrix),
    transitionDiagonalMass: diagonalMass,
    transitionUpgradeMass: upgradeMass,
    transitionDowngradeMass: downgradeMass,
    transitionRiverPairOrBetterMass: riverPairOrBetter,
    transitionRiverFlushOrBetterMass: riverFlushOrBetter,
    categoryTransitionAvailable: 1,
  };
}

export function computeTransitionFeatures(
  state: ValidatedState,
  includeFullMatrix = false,
  exactFeatureBudget: ExactFeatureBudget = "production",
): TransitionFeatureResult {
  if (exactFeatureBudget !== "full") {
    return { summaries: { ...NEUTRAL_TRANSITION }, available: 0 };
  }

  if (state.street !== "flop" || state.board.length !== 3) {
    return { summaries: { ...NEUTRAL_TRANSITION }, available: 0 };
  }

  try {
    const pc = getPokerCalculations();
    const { jointMatrix } = pc.exactHeroCategoryJointFlopToRiver(
      state.hero,
      state.board,
      state.deadCards,
    );
    const matrix = Array.from(jointMatrix);
    return {
      summaries: summarizeJointMatrix(matrix),
      jointMatrix: includeFullMatrix ? matrix : undefined,
      available: 1,
    };
  } catch {
    return { summaries: { ...NEUTRAL_TRANSITION }, available: 0 };
  }
}

export const TRANSITION_SUMMARY_NAMES = Object.keys(NEUTRAL_TRANSITION);

export const TRANSITION_MATRIX_NAMES = Array.from(
  { length: 81 },
  (_, i) => `categoryJointTurn${Math.floor(i / 9)}River${i % 9}`,
);
