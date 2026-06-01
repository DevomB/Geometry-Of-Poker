import { getPokerCalculations } from "../pc.js";
import type { ValidatedState } from "../validate-input.js";

export interface CoreFeatureResult {
  core: Record<string, number>;
  runouts: Record<string, number>;
  vulnerability: Record<string, number>;
  metadata: { category: string; categoryIndex: number };
}

const CATEGORY_API_TO_ONE_HOT: Record<string, string> = {
  highCard: "categoryHighCard",
  onePair: "categoryPair",
  twoPair: "categoryTwoPair",
  threeOfAKind: "categoryThreeOfAKind",
  straight: "categoryStraight",
  flush: "categoryFlush",
  fullHouse: "categoryFullHouse",
  fourOfAKind: "categoryFourOfAKind",
  straightFlush: "categoryStraightFlush",
  royalFlush: "categoryRoyalFlush",
};

const ONE_HOT_KEYS = Object.values(CATEGORY_API_TO_ONE_HOT);

function neutralRunouts(): Record<string, number> {
  return {
    equityMean: 0,
    equityVariance: 0,
    equityP05: 0,
    equityP50: 0,
    equityP95: 0,
    equityRunoutAvailable: 0,
  };
}

function neutralVulnerability(): Record<string, number> {
  return {
    pNuts: 0,
    pDominated: 0,
    runoutVulnerabilityAvailable: 0,
  };
}

function buildCategoryOneHot(category: string): Record<string, number> {
  const oneHot: Record<string, number> = {};
  for (const key of ONE_HOT_KEYS) {
    oneHot[key] = 0;
  }
  const featureKey = CATEGORY_API_TO_ONE_HOT[category];
  if (featureKey) {
    oneHot[featureKey] = 1;
  }
  return oneHot;
}

export function computeCoreFeatures(state: ValidatedState): CoreFeatureResult {
  const pc = getPokerCalculations();
  const category = pc.evaluateHandCategory(state.hero, state.board);
  const categoryIndex = pc.handRankCategoryOrder(category);

  const core: Record<string, number> = {
    equityVsRandom: pc.exactHuEquityVsRandomHand(state.hero, state.board),
    categoryIndex,
    streetIndex:
      state.street === "preflop"
        ? 0
        : state.street === "flop"
          ? 1
          : state.street === "turn"
            ? 2
            : 3,
    ...buildCategoryOneHot(category),
  };

  const runouts = neutralRunouts();
  if (state.board.length <= 3) {
    try {
      const q = pc.exactHeroEquityRunoutQuantiles(state.hero, state.board);
      runouts.equityMean = q.mean;
      runouts.equityVariance = q.variance;
      runouts.equityP05 = q.p05;
      runouts.equityP50 = q.p50;
      runouts.equityP95 = q.p95;
      runouts.equityRunoutAvailable = 1;
    } catch {
      // keep neutral
    }
  }

  const vulnerability = neutralVulnerability();
  if (state.board.length >= 3 && state.board.length <= 4) {
    try {
      const v = pc.exactHeroRunoutVulnerability(
        state.hero,
        state.board,
        state.deadCards,
      );
      vulnerability.pNuts = v.pNuts;
      vulnerability.pDominated = v.pDominated;
      vulnerability.runoutVulnerabilityAvailable = 1;
    } catch {
      // keep neutral
    }
  }

  return {
    core,
    runouts,
    vulnerability,
    metadata: { category, categoryIndex },
  };
}

export const CORE_SCALAR_NAMES = [
  "equityVsRandom",
  "categoryIndex",
  "streetIndex",
] as const;

export const CATEGORY_ONE_HOT_NAMES = ONE_HOT_KEYS;

export const RUNOUT_NAMES = [
  "equityMean",
  "equityVariance",
  "equityP05",
  "equityP50",
  "equityP95",
  "equityRunoutAvailable",
] as const;

export const VULNERABILITY_NAMES = [
  "pNuts",
  "pDominated",
  "runoutVulnerabilityAvailable",
] as const;
