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
const CATEGORY_COUNT = 9;

interface TransitionMasses {
  diagonal: number;
  upgrade: number;
  downgrade: number;
  riverPairOrBetter: number;
  riverFlushOrBetter: number;
}

function emptyTransitionMasses(): TransitionMasses {
  return {
    diagonal: 0,
    upgrade: 0,
    downgrade: 0,
    riverPairOrBetter: 0,
    riverFlushOrBetter: 0,
  };
}

function addCategoryTransition(masses: TransitionMasses, turn: number, river: number, p: number) {
  if (turn === river) masses.diagonal += p;
  if (river > turn) masses.upgrade += p;
  if (river < turn) masses.downgrade += p;
  if (river >= PAIR_CATEGORY_INDEX) masses.riverPairOrBetter += p;
  if (river >= FLUSH_CATEGORY_INDEX) masses.riverFlushOrBetter += p;
}

function transitionMasses(matrix: number[]): TransitionMasses {
  const masses = emptyTransitionMasses();
  for (let turn = 0; turn < CATEGORY_COUNT; turn++) {
    for (let river = 0; river < CATEGORY_COUNT; river++) {
      addCategoryTransition(masses, turn, river, matrix[turn * CATEGORY_COUNT + river] ?? 0);
    }
  }
  return masses;
}

function summarizeJointMatrix(matrix: number[]): Record<string, number> {
  const masses = transitionMasses(matrix);
  return {
    transitionEntropy: entropy(matrix),
    transitionMaxProbability: Math.max(...matrix),
    transitionStdDev: stdDev(matrix),
    transitionDiagonalMass: masses.diagonal,
    transitionUpgradeMass: masses.upgrade,
    transitionDowngradeMass: masses.downgrade,
    transitionRiverPairOrBetterMass: masses.riverPairOrBetter,
    transitionRiverFlushOrBetterMass: masses.riverFlushOrBetter,
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
