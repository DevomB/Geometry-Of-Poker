import { NextResponse } from "next/server";
import { extractGeometryFeatures } from "@geometry-of-poker/feature-engine";
import type { ProjectNeighbor, ProjectResponse } from "@geometry-of-poker/shared";
import { projectIntoGeometry } from "@/lib/projection/project-point";
import { apiError } from "@/lib/server/api-errors";
import { loadStreetDatasetSync, streetArtifactsExist } from "@/lib/server/artifacts";
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

    if (!streetArtifactsExist(validated.street)) {
      return apiError(
        404,
        "MISSING_ARTIFACTS",
        `No runtime artifacts are available for ${validated.street}.`,
        "street",
      );
    }

    const warnings: string[] = [];
    const dataset = loadStreetDatasetSync(validated.street);
    let featureVector: number[] | undefined;
    let featureNames: string[] | undefined;

    try {
      const extracted = extractGeometryFeatures(
        {
          hero: validated.hero,
          board: validated.board,
          deadCards: validated.deadCards.length > 0 ? validated.deadCards : undefined,
        },
        { mode: "compact" },
      );
      featureVector = extracted.vector;
      featureNames = extracted.featureNames;
    } catch (err) {
      warnings.push(
        `Native feature extraction unavailable; using precomputed state lookup only. ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }

    const projection = projectIntoGeometry(dataset, {
      hero: validated.hero,
      board: validated.board,
      featureVector,
      featureNames,
    });

    if (projection.method !== "exact_match") {
      warnings.push(
        "No saved UMAP transform or PCA/scaler projection artifact is present; projection uses nearest precomputed metadata features.",
      );
    }

    const nearestNeighbors: ProjectNeighbor[] = projection.neighborIds.map((id, i) => {
      const index = dataset.idToIndex.get(id);
      if (index === undefined) {
        throw new Error(`Projection returned unknown neighbor id: ${id}`);
      }
      const point = dataset.metadata[index]!;
      return {
        id,
        distance: projection.neighborDistances[i] ?? 0,
        x: point.x,
        y: point.y,
        z: point.z,
        hero: point.hero,
        board: point.board,
        category: point.category,
        equityVsRandom: point.equityVsRandom,
      };
    });

    const payload: ProjectResponse = {
      state: {
        hero: validated.hero,
        board: validated.board,
        street: validated.street,
      },
      projectedPoint: {
        x: projection.position[0],
        y: projection.position[1],
        z: projection.position[2],
      },
      nearestNeighbors,
      metrics: {
        ...projection.features,
        category: projection.category,
        equityVsRandom: projection.equityVsRandom ?? false,
        clusterId: projection.clusterId ?? "noise",
        sourceMethod: projection.method,
      },
      projectionMethod: "precomputed-nearest-neighbor",
      warnings,
    };

    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Projection failed.";
    return apiError(422, "PROJECTION_FAILED", message);
  }
}
