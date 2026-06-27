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

const VALID_BOARD_LENGTHS = new Set([0, 3, 4, 5]);

function cardList(value: string[] | undefined): string[] {
  return Array.isArray(value) ? value : [];
}

function validateHeroShape(input: PokerStateInput, errors: string[]) {
  if (!Array.isArray(input.hero) || input.hero.length !== 2) {
    errors.push("Hero must have exactly two hole cards.");
  }
}

function validateCards(label: string, cards: string[], errors: string[]) {
  for (const card of cards) {
    if (!isValidCardString(card)) {
      errors.push(`Invalid ${label} card: ${card}`);
    }
  }
}

function validateBoardLength(board: string[], errors: string[]) {
  if (!VALID_BOARD_LENGTHS.has(board.length)) {
    errors.push(`Board length must be 0, 3, 4, or 5 - got ${board.length}.`);
  }
}

function throwIfInvalid(errors: string[]) {
  if (errors.length > 0) throw new GeometryFeatureError(errors[0]!, errors);
}

function normalizeHero(hero: string[]): [string, string] {
  return [normalizeCard(hero[0]!), normalizeCard(hero[1]!)] as [string, string];
}

function validateNoDuplicateCards(
  hero: [string, string],
  board: string[],
  deadCards: string[],
  errors: string[],
) {
  const heroSet = new Set(hero);
  for (const card of board) {
    if (heroSet.has(card)) {
      errors.push(`Hero card ${card} cannot appear on the board.`);
    }
  }

  const all = [...hero, ...board, ...deadCards];
  if (new Set(all).size !== all.length) {
    errors.push("Duplicate cards detected across hero, board, and dead cards.");
  }
}

export function validatePokerStateInput(input: PokerStateInput): ValidatedState {
  const errors: string[] = [];
  const heroInput = cardList(input.hero);
  const boardInput = cardList(input.board);
  const deadCardsInput = cardList(input.deadCards);

  validateHeroShape(input, errors);
  validateCards("hero", heroInput, errors);
  validateBoardLength(boardInput, errors);
  validateCards("board", boardInput, errors);
  validateCards("dead", deadCardsInput, errors);
  throwIfInvalid(errors);

  const hero = normalizeHero(heroInput);
  const normalizedBoard = boardInput.map(normalizeCard);
  const normalizedDead = deadCardsInput.map(normalizeCard);
  validateNoDuplicateCards(hero, normalizedBoard, normalizedDead, errors);
  throwIfInvalid(errors);

  return {
    hero,
    board: normalizedBoard,
    deadCards: normalizedDead,
    street: streetFromBoardLength(normalizedBoard.length),
  };
}