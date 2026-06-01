import type { ProjectRequest, Street } from "@geometry-of-poker/shared";
import { isValidCardString, normalizeCard, streetFromBoardLength } from "@/lib/cards/validate-hand";

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

  const heroRaw = input.hero;
  const boardRaw = input.board;
  const deadRaw = input.deadCards ?? [];

  for (let i = 0; i < heroRaw.length; i++) {
    if (typeof heroRaw[i] !== "string" || !isValidCardString(heroRaw[i] as string)) {
      return failure("MALFORMED_CARD", `Malformed hero card: ${String(heroRaw[i])}.`, `hero.${i}`);
    }
  }
  for (let i = 0; i < boardRaw.length; i++) {
    if (typeof boardRaw[i] !== "string" || !isValidCardString(boardRaw[i] as string)) {
      return failure("MALFORMED_CARD", `Malformed board card: ${String(boardRaw[i])}.`, `board.${i}`);
    }
  }
  for (let i = 0; i < deadRaw.length; i++) {
    if (typeof deadRaw[i] !== "string" || !isValidCardString(deadRaw[i] as string)) {
      return failure("MALFORMED_CARD", `Malformed dead card: ${String(deadRaw[i])}.`, `deadCards.${i}`);
    }
  }
  if (![0, 3, 4, 5].includes(boardRaw.length)) {
    return failure("INVALID_BOARD_LENGTH", "Board length must be 0, 3, 4, or 5.", "board");
  }
  if (deadRaw.length > 45) {
    return failure("TOO_MANY_DEAD_CARDS", "deadCards contains too many cards.", "deadCards");
  }

  const hero = [normalizeCard(heroRaw[0] as string), normalizeCard(heroRaw[1] as string)] as [string, string];
  const board = boardRaw.map((card) => normalizeCard(card as string));
  const deadCards = deadRaw.map((card) => normalizeCard(card as string));
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

function failure(code: string, message: string, field?: string): ValidationFailure {
  return { status: 400, code, message, field };
}

export function isValidationFailure(value: unknown): value is ValidationFailure {
  return Boolean(value && typeof value === "object" && "code" in value && "status" in value);
}

