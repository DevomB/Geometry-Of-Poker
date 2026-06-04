/**
 * Shared type definitions for Geometry of Poker.
 *
 * These interfaces define the contract between:
 * - feature-engine (TypeScript)
 * - Python embedding pipeline
 * - web viewer (Next.js)
 *
 * Implementation is deferred to later phases.
 */

/** Canonical card encoding: rank + suit, e.g. "As", "Td", "2c". */
export type CardString = string;

/** Betting street derived from community card count. */
export type Street = "preflop" | "flop" | "turn" | "river";

/** Numeric street index for pipeline serialization. */
export const STREET_INDEX: Record<Street, number> = {
  preflop: 0,
  flop: 1,
  turn: 2,
  river: 3,
} as const;

/** A valid Texas Hold'em state for hero-centric analysis. */
export interface PokerState {
  /** Exactly two hero hole cards. */
  heroHoleCards: [CardString, CardString];
  /** Zero to five community cards (preflop through river). */
  communityCards: CardString[];
  /** Derived street; must match community card count. */
  street: Street;
}

/** Metadata describing one dimension of the feature vector. */
export interface FeatureDescriptor {
  /** Stable column name used in Parquet/JSON artifacts. */
  name: string;
  /** Human-readable label for UI tooltips. */
  label: string;
  /** Feature group for coloring / filtering in the viewer. */
  group: FeatureGroup;
  /** Whether higher values are strategically "better" for hero. */
  higherIsBetter?: boolean;
}

export type FeatureGroup =
  | "equity"
  | "draw"
  | "vulnerability"
  | "category"
  | "runout"
  | "texture"
  | "blocker"
  | "removal"
  | "transition"
  | "meta";

/** Dense numeric feature vector aligned to FEATURE_SCHEMA order. */
export type FeatureVector = Float64Array;

/** Standardization parameters fit on the training corpus. */
export interface ScalerParams {
  version: string;
  featureNames: string[];
  mean: number[];
  scale: number[];
  /** Optional winsorization clip bounds per feature. */
  clipMin?: number[];
  clipMax?: number[];
}

/** 3D coordinates after manifold learning. */
export interface EmbeddingCoordinates {
  x: number;
  y: number;
  z: number;
}

/** Optional density-based cluster assignment from HDBSCAN. */
export interface ClusterInfo {
  clusterId: number;
  /** -1 indicates noise/outlier in HDBSCAN. */
  probability?: number;
}

/** Single record in the precomputed research dataset. */
export interface DatasetPoint {
  id: string;
  state: PokerState;
  features: FeatureVector;
  embedding: EmbeddingCoordinates;
  cluster?: ClusterInfo;
}

/** Serialized artifact bundle consumed by the web viewer. */
export interface ViewerArtifacts {
  version: string;
  generatedAt: string;
  featureSchemaVersion: string;
  scaler: ScalerParams;
  /** Binary or JSON sidecar paths relative to artifacts root. */
  pointCloudPath: string;
  metadataPath: string;
  /** Optional UMAP transform for manual-hand projection. */
  projectionModelPath?: string;
  clusterSummaryPath?: string;
}

/** Result of embedding a manually entered hand into the learned geometry. */
export interface ManualHandProjection {
  state: PokerState;
  normalizedFeatures: FeatureVector;
  embedding: EmbeddingCoordinates;
  /** Nearest neighbors in the precomputed dataset. */
  nearestNeighborIds: string[];
  distances: number[];
}

/** Application mode selector. */
export type AppMode = "research-explorer" | "manual-hand-explorer";

/** Camera fly-to target for manual hand exploration. */
export interface CameraTarget {
  position: [number, number, number];
  lookAt: [number, number, number];
}

/** Validation result for user-entered cards. */
export interface CardValidationResult {
  valid: boolean;
  errors: string[];
  normalizedState?: PokerState;
}

/** Point cloud GPU buffer layout (typed arrays, no per-point React nodes). */
export interface PointCloudBuffers {
  positions: Float32Array;
  colors: Float32Array;
  /** Optional cluster id per point for GPU coloring. */
  clusterIds?: Uint16Array;
  count: number;
}

/** Feature extraction input — wraps poker-calculations primitives. */
export interface FeatureExtractionContext {
  state: PokerState;
  /** Reserved for villain range configuration in Mode 2. */
  villainRangeId?: string;
}

/** Placeholder result from feature-engine (not yet implemented). */
export interface FeatureExtractionResult {
  state: PokerState;
  vector: FeatureVector;
  descriptors: FeatureDescriptor[];
}
