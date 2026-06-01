import type { Street } from "@geometry-of-poker/shared";
import type { CardValidationResult } from "@geometry-of-poker/shared";
import { validateHandInput } from "@/lib/cards/validate-hand";

export const RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"] as const;
export const SUITS = ["s", "h", "d", "c"] as const;
export const SUIT_SYMBOLS: Record<string, string> = { s: "♠", h: "♥", d: "♦", c: "♣" };
export const SUIT_COLORS: Record<string, string> = {
  s: "text-zinc-100",
  h: "text-rose-400",
  d: "text-sky-400",
  c: "text-emerald-400",
};

export interface CardPickerState {
  hero: [string | null, string | null];
  board: (string | null)[];
}

export function emptyPickerState(): CardPickerState {
  return { hero: [null, null], board: [null, null, null, null, null] };
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

export function pickerToInput(state: CardPickerState, street: Street) {
  const expectedBoard = boardLengthForStreet(street);
  const hero = state.hero.filter(Boolean) as [string, string];
  const board = state.board.slice(0, expectedBoard).filter(Boolean) as string[];
  return { hero, board, expectedBoard };
}

export function validateCardPicker(state: CardPickerState, street: Street): CardValidationResult {
  const { hero, board, expectedBoard } = pickerToInput(state, street);
  const errors: string[] = [];

  if (hero.length !== 2) {
    errors.push("Select exactly two hero cards.");
  }

  if (board.length !== expectedBoard) {
    errors.push(
      `Board must have ${expectedBoard} cards for ${street} — selected ${board.length}.`,
    );
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return validateHandInput(hero as [string, string], board, street);
}

export function cardKey(rank: string, suit: string) {
  return `${rank}${suit}`;
}

export function formatCard(card: string) {
  const rank = card.slice(0, -1);
  const suit = card.slice(-1);
  return { rank, suit, symbol: SUIT_SYMBOLS[suit] ?? suit };
}

export function cardsUsed(state: CardPickerState): Set<string> {
  const used = new Set<string>();
  for (const c of state.hero) if (c) used.add(c);
  for (const c of state.board) if (c) used.add(c);
  return used;
}

export function streetFromBoardCount(count: number): Street | null {
  if (count === 0) return "preflop";
  if (count === 3) return "flop";
  if (count === 4) return "turn";
  if (count === 5) return "river";
  return null;
}
