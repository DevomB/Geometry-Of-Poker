import type { Street } from "./types.js";

export type ArtifactMode = "public" | "blob";

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    field?: string;
  };
}

export interface HealthResponse {
  ok: boolean;
  status: "ready" | "degraded" | "misconfigured";
  version: string;
  artifactMode: ArtifactMode;
  availableStreets: Street[];
  pokerCalculations: {
    available: boolean;
    platform: string;
    arch: string;
    napi: string;
    error?: string;
  };
}

export interface ProjectRequest {
  hero: [string, string];
  board: string[];
  deadCards?: string[];
  street?: Street;
}

export interface ProjectedPoint {
  x: number;
  y: number;
  z: number;
}

export interface ProjectNeighbor {
  id: string;
  distance: number;
  x: number;
  y: number;
  z: number;
  hero: [string, string];
  board: string[];
  category: string;
  equityVsRandom: number;
}

export type ProjectionMethod =
  | "pca-knn-interpolation"
  | "precomputed-nearest-neighbor";

export interface ProjectResponse {
  state: {
    hero: [string, string];
    board: string[];
    street: Street;
  };
  projectedPoint: ProjectedPoint;
  nearestNeighbors: ProjectNeighbor[];
  metrics: Record<string, number | string | boolean>;
  projectionMethod: ProjectionMethod;
  warnings: string[];
}
