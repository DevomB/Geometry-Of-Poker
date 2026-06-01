import { computeBoardFeatures } from "./features/board-features.js";
import { computeCoreFeatures } from "./features/core-features.js";
import { computeDrawFeatures } from "./features/draw-features.js";
import { computeRemovalFeatures } from "./features/removal-features.js";
import { computeTransitionFeatures } from "./features/transition-features.js";
import { featureOrderForMode } from "./feature-order.js";
import type {
  GeometryFeatureOptions,
  GeometryFeatureResult,
  PokerStateInput,
} from "./types.js";
import { validatePokerStateInput } from "./validate-input.js";

function buildFeatureMap(
  core: ReturnType<typeof computeCoreFeatures>,
  board: ReturnType<typeof computeBoardFeatures>,
  draws: ReturnType<typeof computeDrawFeatures>,
  removal: ReturnType<typeof computeRemovalFeatures>,
  transitions: ReturnType<typeof computeTransitionFeatures>,
): Record<string, number> {
  return {
    ...core.core,
    ...core.runouts,
    ...core.vulnerability,
    ...board.values,
    ...draws.values,
    ...removal.summaries,
    ...transitions.summaries,
    ...(removal.gradient
      ? Object.fromEntries(
          removal.gradient.map((value, index) => [`removalGradientDeck${index}`, value]),
        )
      : {}),
    ...(transitions.jointMatrix
      ? Object.fromEntries(
          transitions.jointMatrix.map((value, index) => [
            `categoryJointTurn${Math.floor(index / 9)}River${index % 9}`,
            value,
          ]),
        )
      : {}),
  };
}

/**
 * Deterministic feature extraction for a hero-centric Texas Hold'em state.
 */
export function extractGeometryFeatures(
  state: PokerStateInput,
  options: GeometryFeatureOptions = {},
): GeometryFeatureResult {
  const mode = options.mode ?? "compact";
  const validated = validatePokerStateInput(state);

  const core = computeCoreFeatures(validated);
  const board = computeBoardFeatures(validated);
  const draws = computeDrawFeatures(validated);
  const removal = computeRemovalFeatures(
    validated,
    options.villainRange,
    mode === "extended",
  );
  const transitions = computeTransitionFeatures(validated, mode === "extended");

  const featureMap = buildFeatureMap(core, board, draws, removal, transitions);
  const featureNames = [...featureOrderForMode(mode)];

  const vector = featureNames.map((name) => {
    const value = featureMap[name];
    if (value === undefined) {
      throw new Error(`Missing feature value for ${name}`);
    }
    if (!Number.isFinite(value)) {
      throw new Error(`Non-finite feature value for ${name}: ${value}`);
    }
    return value;
  });

  return {
    state: {
      hero: validated.hero,
      board: validated.board,
      deadCards: validated.deadCards.length > 0 ? validated.deadCards : undefined,
    },
    street: validated.street,
    featureNames,
    vector,
    groups: {
      core: {
        ...Object.fromEntries(
          [...CORE_GROUP_KEYS].map((k) => [k, featureMap[k] ?? 0]),
        ),
        ...Object.fromEntries(
          CATEGORY_ONE_HOT_FOR_GROUP.map((k) => [k, featureMap[k] ?? 0]),
        ),
      },
      board: Object.fromEntries(BOARD_GROUP_KEYS.map((k) => [k, featureMap[k] ?? 0])),
      draws: Object.fromEntries(DRAW_GROUP_KEYS.map((k) => [k, featureMap[k] ?? 0])),
      runouts: Object.fromEntries(RUNOUT_GROUP_KEYS.map((k) => [k, featureMap[k] ?? 0])),
      vulnerability: Object.fromEntries(
        VULNERABILITY_GROUP_KEYS.map((k) => [k, featureMap[k] ?? 0]),
      ),
      removal: Object.fromEntries(
        REMOVAL_SUMMARY_GROUP_KEYS.map((k) => [k, featureMap[k] ?? 0]),
      ),
      transitions: Object.fromEntries(
        TRANSITION_SUMMARY_GROUP_KEYS.map((k) => [k, featureMap[k] ?? 0]),
      ),
    },
    metadata: core.metadata,
  };
}

const CORE_GROUP_KEYS = ["equityVsRandom", "categoryIndex", "streetIndex"] as const;
const CATEGORY_ONE_HOT_FOR_GROUP = [
  "categoryHighCard",
  "categoryPair",
  "categoryTwoPair",
  "categoryThreeOfAKind",
  "categoryStraight",
  "categoryFlush",
  "categoryFullHouse",
  "categoryFourOfAKind",
  "categoryStraightFlush",
  "categoryRoyalFlush",
] as const;
const BOARD_GROUP_KEYS = [
  "boardRankDistinctCount",
  "boardPairCount",
  "boardTripsFlag",
  "boardQuadsFlag",
  "boardPairednessScore",
  "boardMaxSuitCount",
  "boardDistinctSuitCount",
  "boardRainbowFlag",
  "boardTwoToneFlag",
  "boardMonotoneFlag",
  "boardConnectivityScore",
  "boardBroadwayDensity",
  "boardHighCardNormalized",
  "boardLowCardNormalized",
  "boardFeaturesAvailable",
] as const;
const DRAW_GROUP_KEYS = [
  "flushOutCount",
  "backdoorFlushFlag",
  "straightOutCount",
  "openEndedStraightDrawFlag",
  "gutshotFlag",
  "doubleGutshotFlag",
  "comboDrawFlag",
  "improvementOutCount",
  "cleanImprovementOutCount",
  "improvementProbabilityNextCard",
  "drawFeaturesAvailable",
] as const;
const RUNOUT_GROUP_KEYS = [
  "equityMean",
  "equityVariance",
  "equityP05",
  "equityP50",
  "equityP95",
  "equityRunoutAvailable",
] as const;
const VULNERABILITY_GROUP_KEYS = [
  "pNuts",
  "pDominated",
  "runoutVulnerabilityAvailable",
] as const;
const REMOVAL_SUMMARY_GROUP_KEYS = [
  "removalGradientMean",
  "removalGradientStdDev",
  "removalGradientMin",
  "removalGradientMax",
  "removalGradientL1",
  "removalGradientL2",
  "removalGradientPositiveMass",
  "removalGradientNegativeMass",
  "removalGradientAvailable",
] as const;
const TRANSITION_SUMMARY_GROUP_KEYS = [
  "transitionEntropy",
  "transitionMaxProbability",
  "transitionStdDev",
  "transitionDiagonalMass",
  "transitionUpgradeMass",
  "transitionDowngradeMass",
  "transitionRiverPairOrBetterMass",
  "transitionRiverFlushOrBetterMass",
  "categoryTransitionAvailable",
] as const;
