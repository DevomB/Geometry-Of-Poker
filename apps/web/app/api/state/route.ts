import { NextResponse } from "next/server";
import { analyzePokerState } from "@/lib/server/analyze-state";
import { apiError } from "@/lib/server/api-errors";
import {
  isValidationFailure,
  readProjectBody,
} from "@/lib/server/validate-project";
import {
  validateStateRequest,
  type ValidatedStateRequest,
} from "@/lib/server/validate-state-request";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await readProjectBody(request);
    if (isValidationFailure(body)) {
      return apiError(body.status, body.code, body.message, body.field);
    }

    const validated = validateStateRequest(body);
    if (isValidationFailure(validated)) {
      return apiError(validated.status, validated.code, validated.message, validated.field);
    }

    const state = validated as ValidatedStateRequest;
    const payload = analyzePokerState({
      hero: state.hero,
      board: state.board,
      deadCards: state.deadCards,
      street: state.street,
      exactFeatureBudget: state.exactFeatureBudget,
    });

    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("Unable to load poker-calculations")) {
      return apiError(
        503,
        "FEATURE_ENGINE_UNAVAILABLE",
        "Native poker-calculations binding is required for state analysis.",
      );
    }
    return apiError(500, "STATE_ANALYSIS_FAILED", message);
  }
}
