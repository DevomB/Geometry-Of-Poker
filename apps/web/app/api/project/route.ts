import { NextResponse } from "next/server";
import { extractGeometryFeatures } from "@geometry-of-poker/feature-engine";
import type { ProjectNeighbor, ProjectResponse } from "@geometry-of-poker/shared";
import { projectIntoGeometry } from "@/lib/projection/project-point";
import { apiError } from "@/lib/server/api-errors";
import {
  ARTIFACT_MODE,
  isArtifactUnavailableError,
  loadStreetDatasetForApi,
  streetArtifactsExist,
} from "@/lib/server/artifacts";
import {
  isValidationFailure,
  readProjectBody,
  type ValidatedProjectRequest,
  validateProjectRequest,
} from "@/lib/server/validate-project";
import type { ProjectionResponse, StreetDataset } from "@/lib/types";

export const runtime = "nodejs";

interface ExtractedProjectionFeatures {
  featureVector?: number[];
  featureNames?: string[];
  extractedFeatures?: Record<string, number>;
  extractedCategory?: string;
  extractedEquity?: number;
  error: string | null;
}

export async function POST(request: Request) {
  try {
    const validated = await readValidatedRequest(request);
    if (validated instanceof NextResponse) return validated;

    if (ARTIFACT_MODE === "public" && !streetArtifactsExist(validated.street)) {
      return apiError(
        404,
        "MISSING_ARTIFACTS",
        `No runtime artifacts are available for ${validated.street}.`,
        "street",
      );
    }

    const warnings: string[] = [];
    const dataset = await loadStreetDatasetForApi(validated.street);
    const extracted = extractProjectionFeatures(validated);
    const projection = runProjection(dataset, validated, extracted);

    if (extracted.error) {
      warnings.push(`Native feature extraction unavailable; exact dataset lookup only: ${extracted.error}`);
    }

    return NextResponse.json(buildProjectResponse(validated, dataset, projection, warnings));
  } catch (err) {
    if (err instanceof FeatureEngineUnavailableError) {
      return apiError(503, "FEATURE_ENGINE_UNAVAILABLE", err.message);
    }
    if (isArtifactUnavailableError(err)) {
      return apiError(
        503,
        "ARTIFACTS_UNAVAILABLE",
        err instanceof Error ? err.message : "Artifact release is unavailable.",
      );
    }
    const message = err instanceof Error ? err.message : "Projection failed.";
    return apiError(422, "PROJECTION_FAILED", message);
  }
}

async function readValidatedRequest(request: Request) {
  const body = await readProjectBody(request);
  if (isValidationFailure(body)) {
    return apiError(body.status, body.code, body.message, body.field);
  }

  const validated = validateProjectRequest(body);
  if (isValidationFailure(validated)) {
    return apiError(validated.status, validated.code, validated.message, validated.field);
  }
  return validated;
}

function extractProjectionFeatures(
  validated: ValidatedProjectRequest,
): ExtractedProjectionFeatures {
  try {
    const extracted = extractGeometryFeatures(
      {
        hero: validated.hero,
        board: validated.board,
        deadCards: validated.deadCards.length > 0 ? validated.deadCards : undefined,
      },
      { mode: "compact" },
    );
    return {
      featureVector: extracted.vector,
      featureNames: extracted.featureNames,
      extractedFeatures: {
        ...extracted.groups.core,
        ...extracted.groups.runouts,
        ...extracted.groups.vulnerability,
        ...extracted.groups.board,
        ...extracted.groups.draws,
        ...extracted.groups.removal,
        ...extracted.groups.transitions,
      },
      extractedCategory: extracted.metadata.category,
      extractedEquity: extracted.groups.core.equityVsRandom,
      error: null,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

function runProjection(
  dataset: StreetDataset,
  validated: ValidatedProjectRequest,
  extracted: ExtractedProjectionFeatures,
) {
  try {
    return projectIntoGeometry(dataset, {
      hero: validated.hero,
      board: validated.board,
      deadCards: validated.deadCards,
      featureVector: extracted.featureVector,
      featureNames: extracted.featureNames,
      features: extracted.extractedFeatures,
      category: extracted.extractedCategory,
      equityVsRandom: extracted.extractedEquity,
    });
  } catch (err) {
    if (!extracted.error) throw err;
    throw new FeatureEngineUnavailableError(extracted.error);
  }
}

function buildNearestNeighbors(
  dataset: StreetDataset,
  projection: ProjectionResponse,
): ProjectNeighbor[] {
  return projection.neighborIds.map((id, i) => {
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
}

function buildProjectResponse(
  validated: ValidatedProjectRequest,
  dataset: StreetDataset,
  projection: ProjectionResponse,
  warnings: string[],
): ProjectResponse {
  return {
    state: {
      hero: validated.hero,
      board: validated.board,
      deadCards: validated.deadCards,
      street: validated.street,
    },
    projectedPoint: {
      x: projection.position[0],
      y: projection.position[1],
      z: projection.position[2],
    },
    nearestNeighbors: buildNearestNeighbors(dataset, projection),
    metrics: {
      ...projection.features,
      category: projection.category,
      equityVsRandom: projection.equityVsRandom ?? null,
      clusterId: projection.clusterId ?? null,
      sourceMethod: projection.method,
    },
    projectionMethod:
      projection.method === "exact_match" ? "exact-match" : "pca-knn-interpolation",
    warnings,
  };
}

class FeatureEngineUnavailableError extends Error {
  constructor(reason: string) {
    super(`Native feature extraction is required for non-dataset manual projection: ${reason}`);
  }
}
