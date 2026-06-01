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
  const payload: HealthResponse = {
    ok: true,
    version: APP_VERSION,
    artifactMode: ARTIFACT_MODE,
    availableStreets: availableArtifactStreets(),
    pokerCalculations: pokerCalculationsStatus(),
  };
  return NextResponse.json(payload);
}
