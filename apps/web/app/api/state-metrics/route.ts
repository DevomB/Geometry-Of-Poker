import { NextResponse } from "next/server";
import { apiError } from "@/lib/server/api-errors";
import { computeExactRunoutMetrics } from "@/lib/server/exact-state-metrics";
import {
  isValidationFailure,
  readProjectBody,
  validateProjectRequest,
} from "@/lib/server/validate-project";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await readProjectBody(request);
    if (isValidationFailure(body)) {
      return apiError(body.status, body.code, body.message, body.field);
    }

    const validated = validateProjectRequest(body);
    if (isValidationFailure(validated)) {
      return apiError(validated.status, validated.code, validated.message, validated.field);
    }

    const metrics = computeExactRunoutMetrics({
      hero: validated.hero,
      board: validated.board,
    });

    return NextResponse.json({ metrics });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return apiError(500, "STATE_METRICS_FAILED", message);
  }
}
