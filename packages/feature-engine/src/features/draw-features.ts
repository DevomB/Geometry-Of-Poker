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

function classifyStraightDrawType(straightOutCount: number, outCards: string[]): {
  oesd: number;
  gutshot: number;
  doubleGutshot: number;
} {
  if (straightOutCount === 0) {
    return { oesd: 0, gutshot: 0, doubleGutshot: 0 };
  }
  if (straightOutCount === 8) {
    const ranks = outCards.map(cardRankIndex);
    const unique = [...new Set(ranks)].sort((a, b) => a - b);
    const span = unique[unique.length - 1]! - unique[0]!;
    if (span <= 4) {
      return { oesd: 1, gutshot: 0, doubleGutshot: 0 };
    }
    return { oesd: 0, gutshot: 0, doubleGutshot: 1 };
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

  const flushOutCards: string[] = [];
  const straightOutCards: string[] = [];
  const improveCards: string[] = [];
  const cleanImproveCards: string[] = [];

  let leapfrogSet = new Set<number>();
  if (state.board.length >= 3 && state.board.length <= 4) {
    try {
      const leap = pc.exactVillainLeapfrogOutCounts(
        state.hero,
        state.board,
        state.deadCards,
      );
      leapfrogSet = new Set(leap.leapfrogDeckIndices);
    } catch {
      // unavailable — treat all improvements as clean
    }
  }

  for (const idx of remaining) {
    const card = indexToCard(idx);
    if (completesFlushOnNext(state.hero, state.board, card)) {
      flushOutCards.push(card);
    }
    if (completesStraightOnNext(state.hero, state.board, card)) {
      straightOutCards.push(card);
    }
    if (improvesHand(state.hero, state.board, card)) {
      improveCards.push(card);
      if (!leapfrogSet.has(idx)) {
        cleanImproveCards.push(card);
      }
    }
  }

  const flushOutCount = flushOutCards.length;
  const straightOutCount = straightOutCards.length;
  const straightType = classifyStraightDrawType(straightOutCount, straightOutCards);

  const backdoorFlushFlag =
    state.street === "flop" && flushOutCount === 0 && isBackdoorFlushPossible(
      state.hero,
      state.board,
      state.deadCards,
    )
      ? 1
      : 0;

  const improvementOutCount = improveCards.length;
  const cleanImprovementOutCount = cleanImproveCards.length;
  const improvementProbabilityNextCard =
    unseen > 0
      ? pc.hypergeometricOneCardHitProbability(improvementOutCount, unseen)
      : 0;

  const values: Record<string, number> = {
    flushOutCount,
    backdoorFlushFlag,
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
