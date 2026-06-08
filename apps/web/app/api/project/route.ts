import { NextResponse } from "next/server";
import { extractGeometryFeatures } from "@geometry-of-poker/feature-engine";
import type { ProjectNeighbor, ProjectResponse } from "@geometry-of-poker/shared";
import { projectIntoGeometry } from "@/lib/projection/project-point";
import { apiError } from "@/lib/server/api-errors";
import { loadStreetDatasetForApi, streetArtifactsExist } from "@/lib/server/artifacts";
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
    const dataset = await loadStreetDatasetForApi(validated.street);
    let featureVector: number[] | undefined;
    let featureNames: string[] | undefined;
    let extractedFeatures: Record<string, number> | undefined;
    let extractedCategory: string | undefined;
    let extractedEquity: number | undefined;
    let featureExtractionError: string | null = null;

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
      extractedFeatures = {
        ...extracted.groups.core,
        ...extracted.groups.runouts,
        ...extracted.groups.vulnerability,
        ...extracted.groups.board,
        ...extracted.groups.draws,
        ...extracted.groups.removal,
        ...extracted.groups.transitions,
      };
      extractedCategory = extracted.metadata.category;
      extractedEquity = extracted.groups.core.equityVsRandom;
    } catch (err) {
      featureExtractionError = err instanceof Error ? err.message : String(err);
    }

    let projection: ReturnType<typeof projectIntoGeometry>;
    try {
      projection = projectIntoGeometry(dataset, {
        hero: validated.hero,
        board: validated.board,
        featureVector,
        featureNames,
        features: extractedFeatures,
        category: extractedCategory,
        equityVsRandom: extractedEquity,
      });
    } catch (err) {
      if (featureExtractionError) {
        return apiError(
          503,
          "FEATURE_ENGINE_UNAVAILABLE",
          `Native feature extraction is required for non-dataset manual projection: ${featureExtractionError}`,
        );
      }
      throw err;
    }

    if (featureExtractionError) {
      warnings.push(`Native feature extraction unavailable; exact dataset lookup only: ${featureExtractionError}`);
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
      projectionMethod:
        projection.method === "exact_match"
          ? "exact-match"
          : projection.method === "pca_knn_interpolation"
            ? "pca-knn-interpolation"
            : "precomputed-nearest-neighbor",
      warnings,
    };

    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Projection failed.";
    return apiError(422, "PROJECTION_FAILED", message);
  }
}
