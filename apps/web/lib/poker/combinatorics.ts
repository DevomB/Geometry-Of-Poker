export interface StateCombinatoricsInput {
  hero: readonly string[];
  board: readonly string[];
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
  remainingCards: number;
  runoutCardsToRiver: number;
  legalVillainHands: bigint;
  publicRunoutsAfterVillain: bigint;
  terminalLeaves: bigint;
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
  const knownCards = input.hero.length + input.board.length;
  const remainingCards = 52 - knownCards;
  const runoutCardsToRiver = Math.max(0, RIVER_BOARD_LENGTH - input.board.length);
  const legalVillainHands = choose(remainingCards, 2);
  const publicRunoutsAfterVillain = choose(remainingCards - 2, runoutCardsToRiver);
  const terminalLeaves = legalVillainHands * publicRunoutsAfterVillain;
  const nextCardUniverse = runoutCardsToRiver > 0 ? remainingCards : null;
  const improvementOutCount = finiteCount(input.summary?.improvementOutCount);
  const cleanImprovementOutCount = finiteCount(input.summary?.cleanImprovementOutCount);
  const flushOutCount = finiteCount(input.summary?.flushOutCount);
  const straightOutCount = finiteCount(input.summary?.straightOutCount);

  return {
    knownCards,
    remainingCards,
    runoutCardsToRiver,
    legalVillainHands,
    publicRunoutsAfterVillain,
    terminalLeaves,
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

function equityStandardError(equity: number | undefined, leaves: bigint): number | null {
  if (typeof equity !== "number" || !Number.isFinite(equity) || leaves <= 0n) return null;
  const n = Number(leaves);
  if (!Number.isFinite(n) || n <= 0) return null;
  const p = Math.min(1, Math.max(0, equity));
  return Math.sqrt((p * (1 - p)) / n);
}
