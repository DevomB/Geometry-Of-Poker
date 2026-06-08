import type { ColorMode } from "@/lib/types";

/**
 * Centralized visualization theme constants. Keep components free of
 * hardcoded color literals; pull palettes and explanations from here.
 */

export const SCENE_BACKGROUND = "#08080c";
export const SCENE_FOG_NEAR = 30;
export const SCENE_FOG_FAR = 80;

/** Selected-point color must contrast against every active palette. */
export const SELECTION_COLOR: [number, number, number] = [1.0, 0.96, 0.78];
export const HOVER_COLOR: [number, number, number] = [0.95, 0.96, 0.98];
export const NEIGHBOR_LINK_COLOR = "#5eead4";
export const MANUAL_MARKER_COLOR = "#fbbf24";
export const MANUAL_MARKER_CORE = "#fef3c7";
export const AXIS_COLORS = {
  x: "#fb7185",
  y: "#34d399",
  z: "#5eead4",
} as const;

export const POINT_SIZES = {
  base: 1.0,
  hover: 1.75,
  selected: 2.35,
  manualNeighbor: 1.65,
} as const;

export interface ColorModeMeta {
  id: ColorMode;
  label: string;
  description: string;
  legendKind: "continuous" | "diverging" | "categorical" | "cluster";
  unit?: string;
  legend: { stops: string[]; labels: [string, string] };
}

export const COLOR_MODE_META: Record<ColorMode, ColorModeMeta> = {
  equity: {
    id: "equity",
    label: "Equity heatmap",
    description: "Hero equity vs a uniform random villain (exact combinatorial output).",
    legendKind: "continuous",
    unit: "%",
    legend: {
      stops: ["#1f3873", "#385f9e", "#7a87c0", "#cf8b6f", "#e64a3f"],
      labels: ["0%", "100%"],
    },
  },
  category: {
    id: "category",
    label: "Hand category",
    description: "Best 5-card classification; discrete strength buckets.",
    legendKind: "categorical",
    legend: { stops: [], labels: ["-", "-"] },
  },
  cluster: {
    id: "cluster",
    label: "Cluster (HDBSCAN)",
    description: "Density-based clusters in the embedding. Grey = noise.",
    legendKind: "cluster",
    legend: { stops: [], labels: ["-", "-"] },
  },
  pNuts: {
    id: "pNuts",
    label: "pNuts (vulnerability)",
    description: "Probability the hand is the nuts on this runout (diverging around median).",
    legendKind: "diverging",
    legend: {
      stops: ["#26417a", "#5572a4", "#8794b3", "#cf8b73", "#d94839"],
      labels: ["low", "high"],
    },
  },
  equityVariance: {
    id: "equityVariance",
    label: "Equity variance",
    description: "Spread of equity across hypothetical runouts; uncertainty over future cards.",
    legendKind: "continuous",
    legend: {
      stops: ["#1f3873", "#385f9e", "#7a87c0", "#cf8b6f", "#e64a3f"],
      labels: ["stable", "volatile"],
    },
  },
  boardConnectivity: {
    id: "boardConnectivity",
    label: "Board connectivity",
    description: "Density of straight-completing structure on the board.",
    legendKind: "continuous",
    legend: {
      stops: ["#1f3873", "#385f9e", "#7a87c0", "#cf8b6f", "#e64a3f"],
      labels: ["sparse", "connected"],
    },
  },
};

export const ACCENT = {
  cyan: "#5eead4",
  amber: "#fbbf24",
  rose: "#fb7185",
  violet: "#a78bfa",
  emerald: "#34d399",
} as const;

export const STATUS = {
  ok: "#22c55e",
  warn: "#f59e0b",
  error: "#ef4444",
  unknown: "#71717a",
} as const;

/** Friendly description for a projection method string returned by /api/project. */
export function describeProjectionMethod(method: string): string {
  switch (method) {
    case "exact-match":
    case "exact_match":
      return "Exact dataset match";
    case "pca-knn-interpolation":
      return "PCA kNN interpolation";
    case "precomputed-nearest-neighbor":
      return "Nearest precomputed state";
    default:
      return method;
  }
}

/** RGB triplet to CSS rgb() string for HTML legend rendering. */
export function rgbCss(rgb: [number, number, number]): string {
  return `rgb(${Math.round(rgb[0] * 255)}, ${Math.round(rgb[1] * 255)}, ${Math.round(rgb[2] * 255)})`;
}
