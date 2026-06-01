import type { CardValidationResult, PokerState, Street } from "@geometry-of-poker/shared";

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

export function validateHandInput(
  hero: [string, string],
  board: string[],
  expectedStreet?: Street,
): CardValidationResult {
  const errors: string[] = [];

  if (hero.length !== 2) {
    errors.push("Hero must have exactly two hole cards.");
  }

  for (const card of hero) {
    if (!isValidCardString(card)) errors.push(`Invalid hero card: ${card}`);
  }

  if (![0, 3, 4, 5].includes(board.length)) {
    errors.push(`Board length must be 0, 3, 4, or 5 — got ${board.length}.`);
  }

  for (const card of board) {
    if (!isValidCardString(card)) errors.push(`Invalid board card: ${card}`);
  }

  if (errors.length > 0) return { valid: false, errors };

  const normalizedHero = [normalizeCard(hero[0]), normalizeCard(hero[1])] as [string, string];
  const normalizedBoard = board.map(normalizeCard);
  const heroSet = new Set(normalizedHero);

  for (const card of normalizedBoard) {
    if (heroSet.has(card)) errors.push(`Hero card ${card} cannot appear on the board.`);
  }

  const all = [...normalizedHero, ...normalizedBoard];
  if (new Set(all).size !== all.length) {
    errors.push("Duplicate cards detected across hero and board.");
  }

  if (errors.length > 0) return { valid: false, errors };

  const street = streetFromBoardLength(normalizedBoard.length);
  if (expectedStreet && street !== expectedStreet) {
    return {
      valid: false,
      errors: [`Selected cards imply ${street}, but viewer street is ${expectedStreet}.`],
    };
  }

  const normalizedState: PokerState = {
    heroHoleCards: normalizedHero,
    communityCards: normalizedBoard,
    street,
  };

  return { valid: true, errors: [], normalizedState };
}
