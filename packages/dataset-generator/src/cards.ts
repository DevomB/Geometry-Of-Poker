import { cardStringToDeckIndex, deckIndexToCardString } from "poker-calculations/encode";
import type { Street } from "@geometry-of-poker/feature-engine";

const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"] as const;

export function normalizeCard(card: string): string {
  return `${card[0]!.toUpperCase()}${card[1]!.toLowerCase()}`;
}

/** Suit-invariant key for strategic equivalence tracking. */
export function suitCanonicalKey(cards: readonly string[]): string {
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

/** All C(52,2) = 1326 ordered hole-card combinations (low index first). */
export function enumerateAll1326HoleCombos(): Array<[string, string]> {
  const combos: Array<[string, string]> = [];
  for (let i = 0; i < 52; i++) {
    for (let j = i + 1; j < 52; j++) {
      combos.push([deckIndexToCardString(i), deckIndexToCardString(j)]);
    }
  }
  return combos;
}

/** One representative combo per suit-canonical hole-card class (≤169). */
export function enumerateCanonical169HoleCombos(): Array<[string, string]> {
  const seen = new Map<string, [string, string]>();
  for (const combo of enumerateAll1326HoleCombos()) {
    const key = suitCanonicalKey(combo);
    if (!seen.has(key)) {
      seen.set(key, combo);
    }
  }
  return [...seen.values()].sort((a, b) => suitCanonicalKey(a).localeCompare(suitCanonicalKey(b)));
}

export function boardLengthForStreet(street: Street): number {
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

export function canonicalStateKey(hero: [string, string], board: string[]): string {
  return `${suitCanonicalKey(hero)}|${suitCanonicalKey(board)}`;
}

export function allDeckCards(): string[] {
  return Array.from({ length: 52 }, (_, i) => deckIndexToCardString(i));
}

export function assertUniqueCards(cards: string[]): void {
  const set = new Set(cards.map(normalizeCard));
  if (set.size !== cards.length) {
    throw new Error("Duplicate cards in sampled state");
  }
}

export { RANKS };
