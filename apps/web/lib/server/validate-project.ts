import type { ProjectRequest } from "@geometry-of-poker/shared";
import { isValidCardString, normalizeCard, streetFromBoardLength } from "@/lib/cards/validate-hand";
import type { Street } from "@/lib/types";

export interface ValidationFailure {
  status: number;
  code: string;
  message: string;
  field?: string;
}

export interface ValidatedProjectRequest {
  hero: [string, string];
  board: string[];
  deadCards: string[];
  street: Street;
}

const MAX_BODY_BYTES = 2048;
const STREET_VALUES = new Set<Street>(["preflop", "flop", "turn", "river"]);
const VALID_BOARD_LENGTHS = new Set([0, 3, 4, 5]);

export async function readProjectBody(request: Request): Promise<ProjectRequest | ValidationFailure> {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) {
    return {
      status: 413,
      code: "PAYLOAD_TOO_LARGE",
      message: "Request body exceeds the 2KB limit.",
    };
  }
  try {
    return JSON.parse(text) as ProjectRequest;
  } catch {
    return {
      status: 400,
      code: "MALFORMED_JSON",
      message: "Request body must be valid JSON.",
    };
  }
}

export function validateProjectRequest(body: unknown): ValidatedProjectRequest | ValidationFailure {
  const input = validateProjectShape(body);
  if (isValidationFailure(input)) return input;

  const cardFailure =
    validateCardList(input.hero, "hero") ??
    validateCardList(input.board, "board") ??
    validateCardList(input.deadCards, "deadCards");
  if (cardFailure) return cardFailure;

  if (!VALID_BOARD_LENGTHS.has(input.board.length)) {
    return failure("INVALID_BOARD_LENGTH", "Board length must be 0, 3, 4, or 5.", "board");
  }
  if (input.deadCards.length > 45) {
    return failure("TOO_MANY_DEAD_CARDS", "deadCards contains too many cards.", "deadCards");
  }

  const hero = normalizeHero(input.hero);
  const board = normalizeCards(input.board);
  const deadCards = normalizeCards(input.deadCards);
  const duplicateFailure = findDuplicateCardFailure(hero, board, deadCards);
  if (duplicateFailure) return duplicateFailure;

  const street = streetFromBoardLength(board.length);
  if (input.street && input.street !== street) {
    return failure(
      "STREET_MISMATCH",
      `Selected cards imply ${street}, but request street is ${input.street}.`,
      "street",
    );
  }

  return { hero, board, deadCards, street };
}

function validateProjectShape(body: unknown): Partial<ProjectRequest> & {
  hero: unknown[];
  board: unknown[];
  deadCards: unknown[];
} | ValidationFailure {
  if (!body || typeof body !== "object") {
    return failure("MALFORMED_BODY", "Request body must be an object.");
  }
  const input = body as Partial<ProjectRequest>;
  if (!Array.isArray(input.hero) || input.hero.length !== 2) {
    return failure("INVALID_HERO", "hero must contain exactly two card strings.", "hero");
  }
  if (!Array.isArray(input.board)) {
    return failure("INVALID_BOARD", "board must be an array.", "board");
  }
  if (input.deadCards !== undefined && !Array.isArray(input.deadCards)) {
    return failure("INVALID_DEAD_CARDS", "deadCards must be an array when provided.", "deadCards");
  }
  if (input.street !== undefined && !STREET_VALUES.has(input.street)) {
    return failure("INVALID_STREET", "street must be preflop, flop, turn, or river.", "street");
  }

  return { ...input, hero: input.hero, board: input.board, deadCards: input.deadCards ?? [] };
}

function validateCardList(cards: unknown[], field: "hero" | "board" | "deadCards") {
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    if (typeof card !== "string" || !isValidCardString(card)) {
      return failure("MALFORMED_CARD", `Malformed ${fieldLabel(field)} card: ${String(card)}.`, `${field}.${i}`);
    }
  }
  return null;
}

function fieldLabel(field: "hero" | "board" | "deadCards") {
  return field === "deadCards" ? "dead" : field;
}

function normalizeHero(hero: unknown[]): [string, string] {
  return [normalizeCard(hero[0] as string), normalizeCard(hero[1] as string)];
}

function normalizeCards(cards: unknown[]): string[] {
  return cards.map((card) => normalizeCard(card as string));
}

function findDuplicateCardFailure(
  hero: [string, string],
  board: string[],
  deadCards: string[],
) {
  const all = [...hero, ...board, ...deadCards];
  const seen = new Map<string, string>();
  for (const [index, card] of all.entries()) {
    const field = index < 2 ? "hero" : index < 2 + board.length ? "board" : "deadCards";
    const previous = seen.get(card);
    if (previous) {
      return failure(
        "DUPLICATE_CARD",
        `Card ${card} appears in both ${previous} and ${field}.`,
        field,
      );
    }
    seen.set(card, field);
  }
  return null;
}

function failure(code: string, message: string, field?: string): ValidationFailure {
  return { status: 400, code, message, field };
}

export function isValidationFailure(value: unknown): value is ValidationFailure {
  return Boolean(value && typeof value === "object" && "code" in value && "status" in value);
}
