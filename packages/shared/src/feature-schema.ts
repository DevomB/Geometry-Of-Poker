import type { FeatureDescriptor, Street } from "./types.js";

/** Bump when feature column order or semantics change. */
export const FEATURE_SCHEMA_VERSION = "1.0.0";

export const COMPACT_FEATURE_ORDER = [
  "equityVsRandom",
  "categoryIndex",
  "streetIndex",
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
  "equityMean",
  "equityVariance",
  "equityP05",
  "equityP50",
  "equityP95",
  "equityRunoutAvailable",
  "pNuts",
  "pDominated",
  "runoutVulnerabilityAvailable",
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
  "removalGradientMean",
  "removalGradientStdDev",
  "removalGradientMin",
  "removalGradientMax",
  "removalGradientL1",
  "removalGradientL2",
  "removalGradientPositiveMass",
  "removalGradientNegativeMass",
  "removalGradientAvailable",
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

function groupForFeature(name: string): FeatureDescriptor["group"] {
  if (name === "streetIndex") return "meta";
  if (name.startsWith("category")) return "category";
  if (name.startsWith("equity") && !name.includes("Runout")) return "equity";
  if (name.includes("Runout")) return "runout";
  if (name === "pNuts" || name === "pDominated" || name.includes("Vulnerability")) {
    return "vulnerability";
  }
  if (name.startsWith("board")) return "texture";
  if (
    name.includes("Draw") ||
    name.includes("OutCount") ||
    name.includes("Flush") ||
    name.includes("Straight") ||
    name.startsWith("improvement") ||
    name.startsWith("cleanImprovement") ||
    name === "gutshotFlag"
  ) {
    return "draw";
  }
  if (name.startsWith("removal")) return "removal";
  if (name.startsWith("transition")) return "transition";
  return "meta";
}

function labelForFeature(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());
}

export const FEATURE_SCHEMA: readonly FeatureDescriptor[] = COMPACT_FEATURE_ORDER.map((name) => ({
  name,
  label: labelForFeature(name),
  group: groupForFeature(name),
  higherIsBetter:
    name.includes("Equity") ||
    name === "equityVsRandom" ||
    name === "pNuts" ||
    name.includes("Upgrade") ||
    name.includes("FlushOrBetter") ||
    name.includes("PairOrBetter"),
}));

export function streetFromCommunityCount(count: number): Street {
  switch (count) {
    case 0:
      return "preflop";
    case 3:
      return "flop";
    case 4:
      return "turn";
    case 5:
      return "river";
    default:
      throw new Error(`Invalid community card count: ${count}`);
  }
}

export function communityCountFromStreet(street: Street): number {
  switch (street) {
    case "preflop":
      return 0;
    case "flop":
      return 3;
    case "turn":
      return 4;
    case "river":
      return 5;
  }
}
