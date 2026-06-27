import { getPokerCalculations } from "../pc.js";
import {
  cardRankIndex,
  deckIndex,
  indexToCard,
  remainingDeckIndices,
} from "../cards.js";
import type { ValidatedState } from "../validate-input.js";

export interface DrawFeatureResult {
  values: Record<string, number>;
  available: number;
}

const NEUTRAL_DRAWS: Record<string, number> = {
  flushOutCount: 0,
  backdoorFlushFlag: 0,
  straightOutCount: 0,
  openEndedStraightDrawFlag: 0,
  gutshotFlag: 0,
  doubleGutshotFlag: 0,
  comboDrawFlag: 0,
  improvementOutCount: 0,
  cleanImprovementOutCount: 0,
  improvementProbabilityNextCard: 0,
  drawFeaturesAvailable: 0,
};

const STRAIGHT_CATEGORY_ORDER = 4;

function hasFlush(hero: [string, string], board: string[]): boolean {
  const pc = getPokerCalculations();
  const category = pc.evaluateHandCategory(hero, board);
  const order = pc.handRankCategoryOrder(category);
  return order >= pc.handRankCategoryOrder("flush");
}

function hasStraight(hero: [string, string], board: string[]): boolean {
  const pc = getPokerCalculations();
  const order = pc.handRankCategoryOrder(pc.evaluateHandCategory(hero, board));
  return order >= STRAIGHT_CATEGORY_ORDER;
}

function completesFlushOnNext(hero: [string, string], board: string[], nextCard: string): boolean {
  const nextBoard = [...board, nextCard];
  return hasFlush(hero, nextBoard as string[]) && !hasFlush(hero, board);
}

function completesStraightOnNext(hero: [string, string], board: string[], nextCard: string): boolean {
  const nextBoard = [...board, nextCard];
  return hasStraight(hero, nextBoard as string[]) && !hasStraight(hero, board);
}

function improvesHand(hero: [string, string], board: string[], nextCard: string): boolean {
  const pc = getPokerCalculations();
  const before = pc.evaluateHandStrengthFast(hero, board);
  const after = pc.evaluateHandStrengthFast(hero, [...board, nextCard]);
  return after > before;
}

function isBackdoorFlushPossible(hero: [string, string], board: string[], dead: string[]): boolean {
  if (board.length !== 3) return false;
  const known = [...hero, ...board, ...dead].map(deckIndex);
  const remaining = remainingDeckIndices(known);
  for (const idx of remaining) {
    for (const idx2 of remaining) {
      if (idx2 <= idx) continue;
      const c1 = indexToCard(idx);
      const c2 = indexToCard(idx2);
      const turnBoard = [...board, c1];
      if (hasFlush(hero, [...turnBoard, c2])) return true;
    }
  }
  return false;
}

function leapfrogDeckSet(state: ValidatedState): Set<number> {
  if (state.board.length < 3 || state.board.length > 4) return new Set();

  try {
    const leap = getPokerCalculations().exactVillainLeapfrogOutCounts(
      state.hero,
      state.board,
      state.deadCards,
    );
    return new Set(leap.leapfrogDeckIndices);
  } catch {
    return new Set();
  }
}

function collectDrawOuts(state: ValidatedState, remaining: number[]) {
  const flushOutCards: string[] = [];
  const straightOutCards: string[] = [];
  const improveCards: string[] = [];
  const cleanImproveCards: string[] = [];
  const leapfrogSet = leapfrogDeckSet(state);

  for (const idx of remaining) {
    const card = indexToCard(idx);
    if (completesFlushOnNext(state.hero, state.board, card)) flushOutCards.push(card);
    if (completesStraightOnNext(state.hero, state.board, card)) straightOutCards.push(card);
    if (!improvesHand(state.hero, state.board, card)) continue;
    improveCards.push(card);
    if (!leapfrogSet.has(idx)) cleanImproveCards.push(card);
  }

  return { flushOutCards, straightOutCards, improveCards, cleanImproveCards };
}

function backdoorFlushFlag(state: ValidatedState, flushOutCount: number) {
  return state.street === "flop" &&
    flushOutCount === 0 &&
    isBackdoorFlushPossible(state.hero, state.board, state.deadCards)
    ? 1
    : 0;
}

function straightWindows(): number[][] {
  const windows: number[][] = [];
  for (let start = 0; start <= 8; start++) {
    windows.push([start, start + 1, start + 2, start + 3, start + 4]);
  }
  windows.push([12, 0, 1, 2, 3]);
  return windows;
}

function classifyEightOutStraightDraw(
  outCards: string[],
  currentCards: string[],
): {
  oesd: number;
  gutshot: number;
  doubleGutshot: number;
} {
  const outRanks = new Set(outCards.map(cardRankIndex));
  const currentRanks = new Set(currentCards.map(cardRankIndex));
  const edgeMisses = new Set<number>();
  const internalMisses = new Set<number>();

  for (const window of straightWindows()) {
    const missing = window.filter((rank) => !currentRanks.has(rank));
    if (missing.length !== 1 || !outRanks.has(missing[0]!)) continue;
    const missingIndex = window.indexOf(missing[0]!);
    if (missingIndex === 0 || missingIndex === window.length - 1) {
      edgeMisses.add(missing[0]!);
    } else {
      internalMisses.add(missing[0]!);
    }
  }

  if (edgeMisses.size >= 2) return { oesd: 1, gutshot: 0, doubleGutshot: 0 };
  if (internalMisses.size >= 2) return { oesd: 0, gutshot: 0, doubleGutshot: 1 };
  return { oesd: 0, gutshot: 0, doubleGutshot: 1 };
}

function classifyStraightDrawType(
  straightOutCount: number,
  outCards: string[],
  currentCards: string[],
): {
  oesd: number;
  gutshot: number;
  doubleGutshot: number;
} {
  if (straightOutCount === 0) {
    return { oesd: 0, gutshot: 0, doubleGutshot: 0 };
  }
  if (straightOutCount === 8) {
    return classifyEightOutStraightDraw(outCards, currentCards);
  }
  if (straightOutCount === 4) {
    return { oesd: 0, gutshot: 1, doubleGutshot: 0 };
  }
  return { oesd: 0, gutshot: 0, doubleGutshot: 0 };
}

/**
 * Exact next-card draw enumeration over the remaining deck.
 */
export function computeDrawFeatures(state: ValidatedState): DrawFeatureResult {
  if (state.street === "preflop" || state.street === "river") {
    return { values: { ...NEUTRAL_DRAWS }, available: 0 };
  }

  const pc = getPokerCalculations();
  const known = [...state.hero, ...state.board, ...state.deadCards].map(deckIndex);
  const remaining = remainingDeckIndices(known);
  const unseen = remaining.length;
  const { flushOutCards, straightOutCards, improveCards, cleanImproveCards } =
    collectDrawOuts(state, remaining);

  const flushOutCount = flushOutCards.length;
  const straightOutCount = straightOutCards.length;
  const straightType = classifyStraightDrawType(
    straightOutCount,
    straightOutCards,
    [...state.hero, ...state.board],
  );

  const improvementOutCount = improveCards.length;
  const cleanImprovementOutCount = cleanImproveCards.length;
  const improvementProbabilityNextCard =
    unseen > 0
      ? pc.hypergeometricOneCardHitProbability(improvementOutCount, unseen)
      : 0;

  const values: Record<string, number> = {
    flushOutCount,
    backdoorFlushFlag: backdoorFlushFlag(state, flushOutCount),
    straightOutCount,
    openEndedStraightDrawFlag: straightType.oesd,
    gutshotFlag: straightType.gutshot,
    doubleGutshotFlag: straightType.doubleGutshot,
    comboDrawFlag: flushOutCount > 0 && straightOutCount > 0 ? 1 : 0,
    improvementOutCount,
    cleanImprovementOutCount,
    improvementProbabilityNextCard,
    drawFeaturesAvailable: 1,
  };

  return { values, available: 1 };
}
export const DRAW_FEATURE_NAMES = Object.keys(NEUTRAL_DRAWS);
