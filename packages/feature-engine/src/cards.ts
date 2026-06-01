import { cardStringToDeckIndex, deckIndexToCardString } from "poker-calculations/encode";

export const RANK_CHARS = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"] as const;
export const SUITS = ["c", "d", "h", "s"] as const;

const RANK_SET = new Set<string>(RANK_CHARS);
const SUIT_SET = new Set<string>(SUITS);

export function normalizeCard(card: string): string {
  if (card.length !== 2) {
    throw new Error(`Invalid card length: ${card}`);
  }
  return `${card[0]!.toUpperCase()}${card[1]!.toLowerCase()}`;
}

export function isValidCardString(card: string): boolean {
  if (card.length !== 2) return false;
  const rank = card[0]!.toUpperCase();
  const suit = card[1]!.toLowerCase();
  return RANK_SET.has(rank) && SUIT_SET.has(suit);
}

export function cardRankIndex(card: string): number {
  return Math.floor(cardStringToDeckIndex(normalizeCard(card)) / 4);
}

export function cardSuitIndex(card: string): number {
  return cardStringToDeckIndex(normalizeCard(card)) % 4;
}

export function deckIndex(card: string): number {
  return cardStringToDeckIndex(normalizeCard(card));
}

export function allDeckIndices(): number[] {
  return Array.from({ length: 52 }, (_, i) => i);
}

export function remainingDeckIndices(known: Iterable<number>): number[] {
  const blocked = new Set(known);
  return allDeckIndices().filter((i) => !blocked.has(i));
}

export function indexToCard(index: number): string {
  return deckIndexToCardString(index);
}

export function streetFromBoardLength(length: number): "preflop" | "flop" | "turn" | "river" {
  switch (length) {
    case 0:
      return "preflop";
    case 3:
      return "flop";
    case 4:
      return "turn";
    case 5:
      return "river";
    default:
      throw new Error(`Invalid board length: ${length}`);
  }
}

/** Suit-invariant canonical key: ranks sorted, suits replaced by canonical 0..k-1 by first appearance. */
export function suitCanonicalKey(cards: string[]): string {
  const normalized = cards.map(normalizeCard);
  const suitMap = new Map<string, number>();
  let nextSuit = 0;
  const parts = normalized.map((card) => {
    const rank = card[0]!;
    const suit = card[1]!;
    if (!suitMap.has(suit)) {
      suitMap.set(suit, nextSuit++);
    }
    return `${rank}${suitMap.get(suit)}`;
  });
  parts.sort();
  return parts.join(",");
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const m = mean(values);
  const v = values.reduce((acc, x) => acc + (x - m) ** 2, 0) / values.length;
  return Math.sqrt(v);
}

export function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

export function l1Norm(values: number[]): number {
  return values.reduce((acc, x) => acc + Math.abs(x), 0);
}

export function l2Norm(values: number[]): number {
  return Math.sqrt(values.reduce((acc, x) => acc + x * x, 0));
}

export function positiveMass(values: number[]): number {
  return values.reduce((acc, x) => acc + (x > 0 ? x : 0), 0);
}

export function negativeMass(values: number[]): number {
  return values.reduce((acc, x) => acc + (x < 0 ? -x : 0), 0);
}

export function entropy(probs: number[]): number {
  let h = 0;
  for (const p of probs) {
    if (p > 0) h -= p * Math.log(p);
  }
  return h;
}
