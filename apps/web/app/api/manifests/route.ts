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
  try {
    const entries = await Promise.all(
      AVAILABLE_STREETS.filter(streetArtifactsExist).map(async (street) => [
        street,
        await loadStreetManifest(street),
      ]),
    );
    const streets = Object.fromEntries(entries);

    return NextResponse.json({
      artifactMode: ARTIFACT_MODE,
      streets,
    });
  } catch (err) {
    if (isArtifactUnavailableError(err)) {
      return apiError(
        503,
        "ARTIFACTS_UNAVAILABLE",
        err instanceof Error ? err.message : "Artifact release is unavailable.",
      );
    }

    return apiError(
      500,
      "MANIFEST_LOAD_FAILED",
      err instanceof Error ? err.message : "Failed to load manifests.",
    );
  }
}
