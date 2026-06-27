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

const META_FEATURES = new Set(["streetIndex"]);
const VULNERABILITY_FEATURES = new Set(["pNuts", "pDominated"]);
const DRAW_FEATURES = new Set(["gutshotFlag"]);
const DRAW_TOKENS = ["Draw", "OutCount", "Flush", "Straight"];
const HIGHER_IS_BETTER_TOKENS = ["Equity", "Upgrade", "FlushOrBetter", "PairOrBetter"];

function hasToken(name: string, tokens: readonly string[]): boolean {
  return tokens.some((token) => name.includes(token));
}

function groupForFeature(name: string): FeatureDescriptor["group"] {
  if (META_FEATURES.has(name)) return "meta";
  if (name.startsWith("category")) return "category";
  if (name.startsWith("equity") && !name.includes("Runout")) return "equity";
  if (name.includes("Runout")) return "runout";
  if (VULNERABILITY_FEATURES.has(name) || name.includes("Vulnerability")) return "vulnerability";
  if (name.startsWith("board")) return "texture";
  if (isDrawFeature(name)) return "draw";
  if (name.startsWith("removal")) return "removal";
  if (name.startsWith("transition")) return "transition";
  return "meta";
}

function isDrawFeature(name: string): boolean {
  return (
    DRAW_FEATURES.has(name) ||
    hasToken(name, DRAW_TOKENS) ||
    name.startsWith("improvement") ||
    name.startsWith("cleanImprovement")
  );
}

function labelForFeature(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());
}

function higherIsBetter(name: string): boolean {
  return (
    name === "equityVsRandom" ||
    name === "pNuts" ||
    hasToken(name, HIGHER_IS_BETTER_TOKENS)
  );
}

export const FEATURE_SCHEMA: readonly FeatureDescriptor[] = COMPACT_FEATURE_ORDER.map((name) => ({
  name,
  label: labelForFeature(name),
  group: groupForFeature(name),
  higherIsBetter: higherIsBetter(name),
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
