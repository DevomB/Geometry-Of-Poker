import {
  isValidCardString,
  normalizeCard,
  streetFromBoardLength,
} from "./cards.js";
import type { PokerStateInput } from "./types.js";
import { GeometryFeatureError } from "./types.js";

export interface ValidatedState {
  hero: [string, string];
  board: string[];
  deadCards: string[];
  street: ReturnType<typeof streetFromBoardLength>;
}

export function validatePokerStateInput(input: PokerStateInput): ValidatedState {
  const errors: string[] = [];

  if (!Array.isArray(input.hero) || input.hero.length !== 2) {
    errors.push("Hero must have exactly two hole cards.");
  }

  for (const card of input.hero ?? []) {
    if (!isValidCardString(card)) {
      errors.push(`Invalid hero card: ${card}`);
    }
  }

  const board = input.board ?? [];
  if (![0, 3, 4, 5].includes(board.length)) {
    errors.push(`Board length must be 0, 3, 4, or 5 — got ${board.length}.`);
  }

  for (const card of board) {
    if (!isValidCardString(card)) {
      errors.push(`Invalid board card: ${card}`);
    }
  }

  const deadCards = input.deadCards ?? [];
  for (const card of deadCards) {
    if (!isValidCardString(card)) {
      errors.push(`Invalid dead card: ${card}`);
    }
  }

  if (errors.length > 0) {
    throw new GeometryFeatureError(errors[0]!, errors);
  }

  const hero = [normalizeCard(input.hero[0]!), normalizeCard(input.hero[1]!)] as [string, string];
  const normalizedBoard = board.map(normalizeCard);
  const normalizedDead = deadCards.map(normalizeCard);

  const heroSet = new Set(hero);
  for (const card of normalizedBoard) {
    if (heroSet.has(card)) {
      errors.push(`Hero card ${card} cannot appear on the board.`);
    }
  }

  const all = [...hero, ...normalizedBoard, ...normalizedDead];
  const unique = new Set(all);
  if (unique.size !== all.length) {
    errors.push("Duplicate cards detected across hero, board, and dead cards.");
  }

  if (errors.length > 0) {
    throw new GeometryFeatureError(errors[0]!, errors);
  }

  return {
    hero,
    board: normalizedBoard,
    deadCards: normalizedDead,
    street: streetFromBoardLength(normalizedBoard.length),
  };
}
