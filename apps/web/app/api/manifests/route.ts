import { NextResponse } from "next/server";
import { apiError } from "@/lib/server/api-errors";
import {
  ARTIFACT_MODE,
  AVAILABLE_STREETS,
  loadStreetManifest,
  streetArtifactsExist,
} from "@/lib/server/artifacts";

export const runtime = "nodejs";

function isArtifactUnavailable(err: unknown) {
  if (!(err instanceof Error)) return false;
  return /Failed to fetch .*viewer-manifest\.json: (403|404|500|502|503|504)/.test(err.message);
}

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
    if (isArtifactUnavailable(err)) {
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
