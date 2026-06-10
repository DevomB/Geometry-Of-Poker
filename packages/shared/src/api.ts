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

export type ExactFeatureBudget = "production" | "full";

export interface ProjectRequest {
  hero: [string, string];
  board: string[];
  deadCards?: string[];
  street?: Street;
}

export interface StateRequest extends ProjectRequest {
  /** Defaults to "full" for standalone analysis. */
  exactFeatureBudget?: ExactFeatureBudget;
}

export interface StateFeatureGroups {
  core: Record<string, number>;
  runouts: Record<string, number>;
  vulnerability: Record<string, number>;
  board: Record<string, number>;
  draws: Record<string, number>;
  removal: Record<string, number>;
  transitions: Record<string, number>;
}

export interface StateAvailability {
  equityRunout: boolean;
  runoutVulnerability: boolean;
  removalGradient: boolean;
  categoryTransition: boolean;
  drawFeatures: boolean;
}

export interface StateCombinatoricsResponse {
  knownCards: number;
  remainingCards: number;
  legalVillainHands: string;
  terminalLeaves: string;
  flushOuts: number | null;
  straightOutCount: number | null;
  improvementOutCount: number | null;
  cleanImprovementOutCount: number | null;
}

export interface StateResponse {
  state: {
    hero: [string, string];
    board: string[];
    deadCards: string[];
    street: Street;
  };
  metadata: {
    category: string;
    categoryIndex: number;
  };
  equityVsRandom: number;
  exactFeatureBudget: ExactFeatureBudget;
  features: StateFeatureGroups;
  combinatorics: StateCombinatoricsResponse;
  availability: StateAvailability;
  limitations: string[];
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
  | "exact-match"
  | "pca-knn-interpolation"
  | "precomputed-nearest-neighbor";

export interface ProjectResponse {
  state: {
    hero: [string, string];
    board: string[];
    deadCards: string[];
    street: Street;
  };
  projectedPoint: ProjectedPoint;
  nearestNeighbors: ProjectNeighbor[];
  metrics: Record<string, number | string | boolean>;
  projectionMethod: ProjectionMethod;
  warnings: string[];
}
