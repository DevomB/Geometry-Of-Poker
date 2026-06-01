import {
  cardRankIndex,
  cardSuitIndex,
} from "../cards.js";
import type { ValidatedState } from "../validate-input.js";

export interface BoardFeatureResult {
  values: Record<string, number>;
  available: number;
}

const NEUTRAL_BOARD: Record<string, number> = {
  boardRankDistinctCount: 0,
  boardPairCount: 0,
  boardTripsFlag: 0,
  boardQuadsFlag: 0,
  boardPairednessScore: 0,
  boardMaxSuitCount: 0,
  boardDistinctSuitCount: 0,
  boardRainbowFlag: 0,
  boardTwoToneFlag: 0,
  boardMonotoneFlag: 0,
  boardConnectivityScore: 0,
  boardBroadwayDensity: 0,
  boardHighCardNormalized: 0,
  boardLowCardNormalized: 0,
  boardFeaturesAvailable: 0,
};

/**
 * Board texture metrics — suit-invariant (uses counts, not suit labels).
 */
export function computeBoardFeatures(state: ValidatedState): BoardFeatureResult {
  if (state.board.length === 0) {
    return { values: { ...NEUTRAL_BOARD }, available: 0 };
  }

  const ranks = state.board.map(cardRankIndex);
  const suits = state.board.map(cardSuitIndex);

  const rankCounts = new Map<number, number>();
  for (const r of ranks) {
    rankCounts.set(r, (rankCounts.get(r) ?? 0) + 1);
  }

  const suitCounts = new Map<number, number>();
  for (const s of suits) {
    suitCounts.set(s, (suitCounts.get(s) ?? 0) + 1);
  }

  const distinctRanks = rankCounts.size;
  const n = state.board.length;

  let pairCount = 0;
  let tripsFlag = 0;
  let quadsFlag = 0;
  for (const count of rankCounts.values()) {
    if (count === 2) pairCount += 1;
    if (count >= 3) tripsFlag = 1;
    if (count === 4) quadsFlag = 1;
  }

  const maxSuitCount = Math.max(...suitCounts.values());
  const distinctSuits = suitCounts.size;

  const sortedUniqueRanks = [...new Set(ranks)].sort((a, b) => a - b);
  let adjacencyPairs = 0;
  for (let i = 1; i < sortedUniqueRanks.length; i++) {
    if (sortedUniqueRanks[i]! - sortedUniqueRanks[i - 1]! === 1) {
      adjacencyPairs += 1;
    }
  }
  const connectivityScore =
    sortedUniqueRanks.length <= 1
      ? 0
      : adjacencyPairs / (sortedUniqueRanks.length - 1);

  const broadwayCount = ranks.filter((r) => r >= 8).length;
  const highRank = Math.max(...ranks);
  const lowRank = Math.min(...ranks);

  const values: Record<string, number> = {
    boardRankDistinctCount: distinctRanks,
    boardPairCount: pairCount,
    boardTripsFlag: tripsFlag,
    boardQuadsFlag: quadsFlag,
    boardPairednessScore: n <= 1 ? 0 : (n - distinctRanks) / (n - 1),
    boardMaxSuitCount: maxSuitCount,
    boardDistinctSuitCount: distinctSuits,
    boardRainbowFlag: distinctSuits === n && n >= 3 ? 1 : 0,
    boardTwoToneFlag: maxSuitCount === 2 && distinctSuits >= 2 ? 1 : 0,
    boardMonotoneFlag: distinctSuits === 1 ? 1 : 0,
    boardConnectivityScore: connectivityScore,
    boardBroadwayDensity: broadwayCount / n,
    boardHighCardNormalized: highRank / 12,
    boardLowCardNormalized: lowRank / 12,
    boardFeaturesAvailable: 1,
  };

  return { values, available: 1 };
}

export const BOARD_FEATURE_NAMES = Object.keys(NEUTRAL_BOARD);
