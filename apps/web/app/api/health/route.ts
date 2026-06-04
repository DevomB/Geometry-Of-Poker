import { NextResponse } from "next/server";
import type { HealthResponse } from "@geometry-of-poker/shared";
import {
  APP_VERSION,
  ARTIFACT_MODE,
  availableArtifactStreets,
  pokerCalculationsStatus,
} from "@/lib/server/artifacts";

export const runtime = "nodejs";

export async function GET() {
  const pokerCalculations = pokerCalculationsStatus();
  let availableStreets: HealthResponse["availableStreets"] = [];
  let status: HealthResponse["status"] = pokerCalculations.available ? "ready" : "degraded";

  try {
    availableStreets = availableArtifactStreets();
  } catch {
    status = "misconfigured";
  }

  const payload: HealthResponse = {
    ok: status === "ready" && availableStreets.length > 0,
    status,
    version: APP_VERSION,
    artifactMode: ARTIFACT_MODE,
    availableStreets,
    pokerCalculations,
  };
  return NextResponse.json(payload);
}
