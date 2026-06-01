import { NextResponse } from "next/server";
import { apiError } from "@/lib/server/api-errors";
import {
  ARTIFACT_MODE,
  AVAILABLE_STREETS,
  browserSafeManifest,
  streetArtifactsExist,
} from "@/lib/server/artifacts";

export const runtime = "nodejs";

export async function GET() {
  try {
    const streets = Object.fromEntries(
      AVAILABLE_STREETS.filter(streetArtifactsExist).map((street) => [
        street,
        browserSafeManifest(street),
      ]),
    );

    return NextResponse.json({
      artifactMode: ARTIFACT_MODE,
      streets,
    });
  } catch (err) {
    return apiError(
      500,
      "MANIFEST_LOAD_FAILED",
      err instanceof Error ? err.message : "Failed to load manifests.",
    );
  }
}
