export interface StateCombinatoricsInput {
  hero: readonly string[];
  board: readonly string[];
  deadCards?: readonly string[];
  equityVsRandom?: number;
  summary?: {
    improvementOutCount?: number;
    cleanImprovementOutCount?: number;
    flushOutCount?: number;
    straightOutCount?: number;
  };
}

export interface StateCombinatorics {
  knownCards: number;
  deadCards: number;
  remainingCards: number;
  runoutCardsToRiver: number;
  streetBoardCards: number;
  heroFixedPublicBoards: bigint;
  boardFixedHeroHands: bigint;
  streetStateUniverse: bigint;
  nextStreetCardsToDeal: number | null;
  nextStreetPublicContinuations: bigint | null;
  legalVillainHands: bigint;
  publicRunoutsAfterVillain: bigint;
  terminalLeaves: bigint;
  baselineTerminalLeavesNoDead: bigint;
  removedTerminalLeavesByDeadCards: bigint;
  terminalLeafFractionOfNoDead: number | null;
  baselineStreetStateUniverseNoDead: bigint;
  removedStreetStatesByDeadCards: bigint;
  streetStateFractionOfNoDead: number | null;
  nextCardUniverse: number | null;
  improvementOutCount: number | null;
  cleanImprovementOutCount: number | null;
  improvementProbability: number | null;
  cleanImprovementProbability: number | null;
  flushOutCount: number | null;
  straightOutCount: number | null;
  equityLeafStandardError: number | null;
}

const RIVER_BOARD_LENGTH = 5;

export function choose(n: number, k: number): bigint {
  if (!Number.isInteger(n) || !Number.isInteger(k)) {
    throw new Error("choose expects integer inputs");
  }
  if (k < 0 || n < 0 || k > n) return 0n;
  const m = Math.min(k, n - k);
  let result = 1n;
  for (let i = 1; i <= m; i++) {
    result = (result * BigInt(n - m + i)) / BigInt(i);
  }
  return result;
}

export function computeStateCombinatorics(input: StateCombinatoricsInput): StateCombinatorics {
  const deadCards = input.deadCards?.length ?? 0;
  const knownCards = input.hero.length + input.board.length + deadCards;
  const remainingCards = 52 - knownCards;
  const runoutCardsToRiver = Math.max(0, RIVER_BOARD_LENGTH - input.board.length);
  const streetBoardCards = input.board.length;
  const liveDeckBeforeHero = 52 - deadCards;
  const heroFixedPublicBoards = choose(liveDeckBeforeHero - input.hero.length, streetBoardCards);
  const boardFixedHeroHands = choose(liveDeckBeforeHero - streetBoardCards, input.hero.length);
  const streetStateUniverse = choose(liveDeckBeforeHero, input.hero.length) * heroFixedPublicBoards;
  const nextStreetCardsToDeal = cardsToNextStreet(streetBoardCards);
  const nextStreetPublicContinuations =
    nextStreetCardsToDeal === null ? null : choose(remainingCards, nextStreetCardsToDeal);
  const legalVillainHands = choose(remainingCards, 2);
  const publicRunoutsAfterVillain = choose(remainingCards - 2, runoutCardsToRiver);
  const terminalLeaves = legalVillainHands * publicRunoutsAfterVillain;
  const baselineKnownCards = input.hero.length + input.board.length;
  const baselineRemainingCards = 52 - baselineKnownCards;
  const baselineTerminalLeavesNoDead =
    choose(baselineRemainingCards, 2) *
    choose(baselineRemainingCards - 2, runoutCardsToRiver);
  const baselineStreetStateUniverseNoDead =
    choose(52, input.hero.length) * choose(52 - input.hero.length, streetBoardCards);
  const removedTerminalLeavesByDeadCards = baselineTerminalLeavesNoDead - terminalLeaves;
  const removedStreetStatesByDeadCards = baselineStreetStateUniverseNoDead - streetStateUniverse;
  const nextCardUniverse = runoutCardsToRiver > 0 ? remainingCards : null;
  const improvementOutCount = finiteCount(input.summary?.improvementOutCount);
  const cleanImprovementOutCount = finiteCount(input.summary?.cleanImprovementOutCount);
  const flushOutCount = finiteCount(input.summary?.flushOutCount);
  const straightOutCount = finiteCount(input.summary?.straightOutCount);

  return {
    knownCards,
    deadCards,
    remainingCards,
    runoutCardsToRiver,
    streetBoardCards,
    heroFixedPublicBoards,
    boardFixedHeroHands,
    streetStateUniverse,
    nextStreetCardsToDeal,
    nextStreetPublicContinuations,
    legalVillainHands,
    publicRunoutsAfterVillain,
    terminalLeaves,
    baselineTerminalLeavesNoDead,
    removedTerminalLeavesByDeadCards,
    terminalLeafFractionOfNoDead: bigintRatio(terminalLeaves, baselineTerminalLeavesNoDead),
    baselineStreetStateUniverseNoDead,
    removedStreetStatesByDeadCards,
    streetStateFractionOfNoDead: bigintRatio(streetStateUniverse, baselineStreetStateUniverseNoDead),
    nextCardUniverse,
    improvementOutCount,
    cleanImprovementOutCount,
    improvementProbability: nextCardProbability(improvementOutCount, nextCardUniverse),
    cleanImprovementProbability: nextCardProbability(cleanImprovementOutCount, nextCardUniverse),
    flushOutCount,
    straightOutCount,
    equityLeafStandardError: equityStandardError(input.equityVsRandom, terminalLeaves),
  };
}

export function formatBigInt(value: bigint): string {
  return value.toLocaleString("en-US");
}

function finiteCount(value: number | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.round(value));
}

function nextCardProbability(outs: number | null, universe: number | null): number | null {
  if (outs === null || universe === null || universe <= 0) return null;
  return outs / universe;
}

function bigintRatio(numerator: bigint, denominator: bigint): number | null {
  if (denominator <= 0n) return null;
  const n = Number(numerator);
  const d = Number(denominator);
  if (!Number.isFinite(n) || !Number.isFinite(d) || d <= 0) return null;
  return n / d;
}

function cardsToNextStreet(boardCards: number): number | null {
  switch (boardCards) {
    case 0:
      return 3;
    case 3:
    case 4:
      return 1;
    case 5:
      return null;
    default:
      return null;
  }
}

function equityStandardError(equity: number | undefined, leaves: bigint): number | null {
  if (typeof equity !== "number" || !Number.isFinite(equity) || leaves <= 0n) return null;
  const n = Number(leaves);
  if (!Number.isFinite(n) || n <= 0) return null;
  const p = Math.min(1, Math.max(0, equity));
  return Math.sqrt((p * (1 - p)) / n);
}
