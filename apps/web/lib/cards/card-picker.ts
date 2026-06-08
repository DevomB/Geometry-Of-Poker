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

export interface HandScenarioPreset {
  id: string;
  label: string;
  detail: string;
  hero: [string, string];
  board: string[];
}

export const HAND_SCENARIO_PRESETS: HandScenarioPreset[] = [
  {
    id: "flop-nut-flush-draw",
    label: "Nut flush draw",
    detail: "Flop draw pressure with overcard equity",
    hero: ["As", "Ks"],
    board: ["Qs", "7s", "2d"],
  },
  {
    id: "flop-set-wet-board",
    label: "Set on wet board",
    detail: "Strong made hand with straight/flush pressure",
    hero: ["8h", "8d"],
    board: ["8s", "9s", "Ts"],
  },
  {
    id: "turn-overpair",
    label: "Turn overpair",
    detail: "Made-hand vulnerability before the river",
    hero: ["Ah", "Ad"],
    board: ["Kh", "7c", "3s", "9d"],
  },
  {
    id: "river-bluff-catcher",
    label: "River bluff catcher",
    detail: "Terminal no-runout comparison state",
    hero: ["Ac", "Jd"],
    board: ["As", "Kh", "7h", "4c", "2d"],
  },
];

export function emptyPickerState(): CardPickerState {
  return { hero: [null, null], board: [null, null, null, null, null] };
}

export function presetToPickerState(preset: HandScenarioPreset): CardPickerState {
  return {
    hero: [...preset.hero],
    board: Array.from({ length: 5 }, (_, i) => preset.board[i] ?? null),
  };
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

export type PickerTarget = "hero" | "board";

/** Place a card into the next available slot of a target zone. */
export function placeCardInZone(
  state: CardPickerState,
  card: string,
  target: PickerTarget,
  maxBoard = 5,
): CardPickerState {
  if (cardsUsed(state).has(card)) return state;
  const next: CardPickerState = {
    hero: [...state.hero] as [string | null, string | null],
    board: [...state.board],
  };
  if (target === "hero") {
    const slot = next.hero.findIndex((c) => c === null);
    if (slot === -1) return state;
    next.hero[slot] = card;
  } else {
    const filled = next.board.filter(Boolean).length;
    if (filled >= maxBoard) return state;
    const slot = next.board.findIndex((c) => c === null);
    if (slot === -1) return state;
    next.board[slot] = card;
  }
  return next;
}

/** Remove a specific card from anywhere in the picker. */
export function removeCard(state: CardPickerState, card: string): CardPickerState {
  return {
    hero: state.hero.map((c) => (c === card ? null : c)) as [string | null, string | null],
    board: state.board.map((c) => (c === card ? null : c)),
  };
}

/** Whether picker is fully ready for projection (2 hero + valid board count). */
export function pickerReady(state: CardPickerState): boolean {
  const hero = state.hero.filter(Boolean).length;
  const board = state.board.filter(Boolean).length;
  if (hero !== 2) return false;
  return [0, 3, 4, 5].includes(board);
}

export function inferredStreet(state: CardPickerState): Street | null {
  const board = state.board.filter(Boolean).length;
  return streetFromBoardCount(board);
}

export function nextTargetZone(state: CardPickerState): PickerTarget {
  if (state.hero.some((c) => c === null)) return "hero";
  return "board";
}
