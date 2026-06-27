import type { CardValidationResult, PokerState, Street } from "@/lib/types";

const RANKS = new Set(["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"]);
const SUITS = new Set(["c", "d", "h", "s"]);

export function normalizeCard(card: string): string {
  return `${card[0]!.toUpperCase()}${card[1]!.toLowerCase()}`;
}

export function isValidCardString(card: string): boolean {
  if (card.length !== 2) return false;
  return RANKS.has(card[0]!.toUpperCase()) && SUITS.has(card[1]!.toLowerCase());
}

export function streetFromBoardLength(length: number): Street {
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

const VALID_BOARD_LENGTHS = new Set([0, 3, 4, 5]);

function invalid(errors: string[]): CardValidationResult {
  return { valid: false, errors };
}

function validateHeroCards(hero: [string, string], errors: string[]) {
  if (hero.length !== 2) errors.push("Hero must have exactly two hole cards.");
  for (const card of hero) {
    if (!isValidCardString(card)) errors.push(`Invalid hero card: ${card}`);
  }
}

function validateBoardCards(board: string[], errors: string[]) {
  if (!VALID_BOARD_LENGTHS.has(board.length)) {
    errors.push(`Board length must be 0, 3, 4, or 5 - got ${board.length}.`);
  }
  for (const card of board) {
    if (!isValidCardString(card)) errors.push(`Invalid board card: ${card}`);
  }
}

function duplicateCardErrors(hero: [string, string], board: string[]): string[] {
  const errors: string[] = [];
  const heroSet = new Set(hero);
  for (const card of board) {
    if (heroSet.has(card)) errors.push(`Hero card ${card} cannot appear on the board.`);
  }

  const all = [...hero, ...board];
  if (new Set(all).size !== all.length) {
    errors.push("Duplicate cards detected across hero and board.");
  }
  return errors;
}

function normalizeHero(hero: [string, string]): [string, string] {
  return [normalizeCard(hero[0]), normalizeCard(hero[1])] as [string, string];
}

function validateExpectedStreet(street: Street, expectedStreet?: Street): CardValidationResult | null {
  if (!expectedStreet || street === expectedStreet) return null;
  return invalid([`Selected cards imply ${street}, but viewer street is ${expectedStreet}.`]);
}

export function validateHandInput(
  hero: [string, string],
  board: string[],
  expectedStreet?: Street,
): CardValidationResult {
  const errors: string[] = [];
  validateHeroCards(hero, errors);
  validateBoardCards(board, errors);
  if (errors.length > 0) return invalid(errors);

  const normalizedHero = normalizeHero(hero);
  const normalizedBoard = board.map(normalizeCard);
  const duplicateErrors = duplicateCardErrors(normalizedHero, normalizedBoard);
  if (duplicateErrors.length > 0) return invalid(duplicateErrors);

  const street = streetFromBoardLength(normalizedBoard.length);
  const streetError = validateExpectedStreet(street, expectedStreet);
  if (streetError) return streetError;

  const normalizedState: PokerState = {
    heroHoleCards: normalizedHero,
    communityCards: normalizedBoard,
    street,
  };

  return { valid: true, errors: [], normalizedState };
}