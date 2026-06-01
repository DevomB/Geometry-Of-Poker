import type { Street } from "@geometry-of-poker/shared";

export type ColorMode =
  | "equity"
  | "category"
  | "cluster"
  | "pNuts"
  | "equityVariance"
  | "boardConnectivity";

export const COLOR_MODES: { id: ColorMode; label: string }[] = [
  { id: "equity", label: "Equity heatmap" },
  { id: "category", label: "Hand category" },
  { id: "cluster", label: "Cluster" },
  { id: "pNuts", label: "pNuts" },
  { id: "equityVariance", label: "Equity variance" },
  { id: "boardConnectivity", label: "Board connectivity" },
];

export const STREETS: Street[] = ["preflop", "flop", "turn", "river"];

export interface PointSummary {
  equityVsRandom?: number;
  equityMean?: number;
  equityVariance?: number;
  pNuts?: number;
  pDominated?: number;
  flushOutCount?: number;
  straightOutCount?: number;
  removalGradientMean?: number;
  transitionEntropy?: number;
  boardConnectivityScore?: number;
  boardRainbowFlag?: number;
  boardTwoToneFlag?: number;
  boardMonotoneFlag?: number;
  boardPairednessScore?: number;
  [key: string]: number | undefined;
}

export interface BrowserPointMeta {
  id: string;
  hero: [string, string];
  board: string[];
  clusterId: number;
  category: string;
  equityVsRandom: number;
  x: number;
  y: number;
  z: number;
  summary: PointSummary;
}

export interface BrowserMetadata {
  version: string;
  street: Street;
  count: number;
  points: BrowserPointMeta[];
}

export interface ClusterCentroid {
  id: number;
  size: number;
  centroid: [number, number, number];
}

export interface StreetManifest {
  version: string;
  street: Street;
  pointCount: number;
  embeddingMethod: string;
  retainedFeatures: string[];
  retainedDimension: number | null;
  originalDimension: number | null;
  pcaDimensions?: number | null;
  pcaVariance?: number | null;
  umap?: Record<string, string | number>;
  hdbscan?: { clusters: number | null; noiseFraction: number | null };
  trustworthiness?: number | null;
  knnOverlap?: number | null;
  categories: string[];
  clusters: ClusterCentroid[];
  artifacts: {
    pointsBin: string;
    metadataJson: string;
  };
}

export interface StreetDataset {
  street: Street;
  manifest: StreetManifest;
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  visible: Uint8Array;
  count: number;
  metadata: BrowserPointMeta[];
  /** Per-point scalar channels for color modes and filters */
  channels: {
    equity: Float32Array;
    clusterId: Int16Array;
    categoryIndex: Uint8Array;
    pNuts: Float32Array;
    equityVariance: Float32Array;
    boardConnectivity: Float32Array;
    boardRainbow: Uint8Array;
    boardTwoTone: Uint8Array;
    boardMonotone: Uint8Array;
    boardPairedness: Float32Array;
  };
  idToIndex: Map<string, number>;
}

export interface ViewerFilters {
  equityMin: number;
  equityMax: number;
  categories: string[];
  clusters: number[];
  boardRainbow: boolean | null;
  boardTwoTone: boolean | null;
  boardMonotone: boolean | null;
  searchNeighborOf: string | null;
}

export const DEFAULT_FILTERS: ViewerFilters = {
  equityMin: 0,
  equityMax: 1,
  categories: [],
  clusters: [],
  boardRainbow: null,
  boardTwoTone: null,
  boardMonotone: null,
  searchNeighborOf: null,
};

export interface SelectionState {
  index: number;
  locked: boolean;
}

export interface ManualMarker {
  id: string;
  hero: [string, string];
  board: string[];
  position: [number, number, number];
  method: string;
  neighborIds: string[];
  neighborDistances: number[];
  clusterId: number | null;
  features: Record<string, number | string | boolean>;
}

export interface ProjectionResponse {
  position: [number, number, number];
  method: string;
  neighborIds: string[];
  neighborDistances: number[];
  clusterId: number | null;
  features: Record<string, number>;
  featureNames: string[];
  category: string;
  equityVsRandom: number | null;
}

export interface CameraFlyTarget {
  position: [number, number, number];
  target: [number, number, number];
}

export const CATEGORY_PALETTE: Record<string, [number, number, number]> = {
  highCard: [0.55, 0.58, 0.62],
  pair: [0.35, 0.62, 0.95],
  twoPair: [0.42, 0.78, 0.72],
  threeOfAKind: [0.92, 0.62, 0.28],
  straight: [0.78, 0.42, 0.88],
  flush: [0.32, 0.82, 0.55],
  fullHouse: [0.95, 0.45, 0.38],
  fourOfAKind: [0.98, 0.78, 0.22],
  straightFlush: [0.98, 0.32, 0.55],
  royalFlush: [1.0, 0.85, 0.35],
};

export const CLUSTER_PALETTE: [number, number, number][] = [
  [0.42, 0.65, 0.95],
  [0.95, 0.55, 0.38],
  [0.48, 0.85, 0.62],
  [0.88, 0.48, 0.72],
  [0.72, 0.72, 0.38],
  [0.58, 0.48, 0.92],
  [0.92, 0.72, 0.48],
  [0.38, 0.82, 0.82],
  [0.82, 0.42, 0.42],
  [0.62, 0.62, 0.62],
];
