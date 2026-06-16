import { NextResponse } from "next/server";
import { apiError } from "@/lib/server/api-errors";
import {
  ARTIFACT_MODE,
  AVAILABLE_STREETS,
  isArtifactUnavailableError,
  loadStreetManifest,
  streetArtifactsExist,
} from "@/lib/server/artifacts";

export const runtime = "nodejs";

export async function GET() {
  const streets: Partial<Record<string, Awaited<ReturnType<typeof loadStreetManifest>>>> = {};

  for (const street of AVAILABLE_STREETS.filter(streetArtifactsExist)) {
    try {
      streets[street] = await loadStreetManifest(street);
    } catch (err) {
      if (!isArtifactUnavailableError(err)) {
        return apiError(
          500,
          "MANIFEST_LOAD_FAILED",
          err instanceof Error ? err.message : "Failed to load manifests.",
        );
      }
    }
  }

  return NextResponse.json({
    artifactMode: ARTIFACT_MODE,
    streets,
  });
}
