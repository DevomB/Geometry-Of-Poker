import type { ColorMode, StreetDataset, ViewerFilters } from "@/lib/types";
import { CATEGORY_PALETTE, CLUSTER_PALETTE } from "@/lib/types";
import { CATEGORY_INDEX } from "@/lib/artifacts/load-street";

const INDEX_CATEGORY = Object.fromEntries(
  Object.entries(CATEGORY_INDEX).map(([name, index]) => [index, name]),
) as Record<number, string>;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function heatmapColor(t: number): [number, number, number] {
  const clamped = Math.max(0, Math.min(1, t));
  if (clamped < 0.5) {
    const u = clamped * 2;
    return [lerp(0.12, 0.22, u), lerp(0.18, 0.55, u), lerp(0.45, 0.85, u)];
  }
  const u = (clamped - 0.5) * 2;
  return [lerp(0.22, 0.95, u), lerp(0.55, 0.35, u), lerp(0.85, 0.25, u)];
}

function divergingColor(t: number): [number, number, number] {
  const clamped = Math.max(-1, Math.min(1, t));
  if (clamped < 0) {
    const u = (clamped + 1) / 2;
    return [lerp(0.15, 0.35, u), lerp(0.25, 0.45, u), lerp(0.75, 0.85, u)];
  }
  const u = clamped;
  return [lerp(0.35, 0.95, u), lerp(0.45, 0.55, u), lerp(0.85, 0.25, u)];
}

function normalizeChannel(values: Float32Array, count: number) {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < count; i++) {
    const v = values[i]!;
    if (Number.isFinite(v)) {
      min = Math.min(min, v);
      max = Math.max(max, v);
    }
  }
  if (!Number.isFinite(min) || min === max) return { min: 0, max: 1 };
  return { min, max };
}

export function applyColorMode(
  dataset: StreetDataset,
  mode: ColorMode,
  colors: Float32Array,
  lodIndices?: number[],
) {
  const { count, channels } = dataset;
  const indices = lodIndices ?? Array.from({ length: count }, (_, i) => i);

  if (mode === "equity") {
    for (const i of indices) {
      const [r, g, b] = heatmapColor(channels.equity[i]!);
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }
    return;
  }

  if (mode === "category") {
    for (const i of indices) {
      const cat = INDEX_CATEGORY[channels.categoryIndex[i]!] ?? "highCard";
      const [r, g, b] = CATEGORY_PALETTE[cat] ?? [0.6, 0.6, 0.6];
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }
    return;
  }

  if (mode === "cluster") {
    for (const i of indices) {
      const cid = channels.clusterId[i]!;
      if (cid < 0) {
        colors[i * 3] = 0.25;
        colors[i * 3 + 1] = 0.25;
        colors[i * 3 + 2] = 0.28;
      } else {
        const [r, g, b] = CLUSTER_PALETTE[cid % CLUSTER_PALETTE.length]!;
        colors[i * 3] = r;
        colors[i * 3 + 1] = g;
        colors[i * 3 + 2] = b;
      }
    }
    return;
  }

  if (mode === "pNuts") {
    const { min, max } = normalizeChannel(channels.pNuts, count);
    for (const i of indices) {
      const t = (channels.pNuts[i]! - min) / (max - min);
      const [r, g, b] = divergingColor(t * 2 - 1);
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }
    return;
  }

  if (mode === "equityVariance") {
    const { min, max } = normalizeChannel(channels.equityVariance, count);
    for (const i of indices) {
      const t = (channels.equityVariance[i]! - min) / (max - min);
      const [r, g, b] = heatmapColor(t);
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }
    return;
  }

  if (mode === "boardConnectivity") {
    const { min, max } = normalizeChannel(channels.boardConnectivity, count);
    for (const i of indices) {
      const t = (channels.boardConnectivity[i]! - min) / (max - min);
      const [r, g, b] = heatmapColor(t);
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }
  }
}

const HIDDEN_COLOR: [number, number, number] = [0.04, 0.04, 0.06];

export function applyFilters(
  dataset: StreetDataset,
  filters: ViewerFilters,
  visible: Uint8Array,
  colors: Float32Array,
) {
  const { count, channels } = dataset;
  const categorySet =
    filters.categories.length > 0 ? new Set(filters.categories) : null;
  const clusterSet = filters.clusters.length > 0 ? new Set(filters.clusters) : null;

  let neighborIndices: Set<number> | null = null;
  if (filters.searchNeighborOf) {
    const idx = dataset.idToIndex.get(filters.searchNeighborOf);
    if (idx !== undefined) {
      neighborIndices = new Set([idx]);
      const px = dataset.positions[idx * 3]!;
      const py = dataset.positions[idx * 3 + 1]!;
      const pz = dataset.positions[idx * 3 + 2]!;
      const candidates: { i: number; d: number }[] = [];
      for (let i = 0; i < count; i++) {
        const d =
          (dataset.positions[i * 3]! - px) ** 2 +
          (dataset.positions[i * 3 + 1]! - py) ** 2 +
          (dataset.positions[i * 3 + 2]! - pz) ** 2;
        candidates.push({ i, d });
      }
      candidates.sort((a, b) => a.d - b.d);
      for (const c of candidates.slice(0, 25)) neighborIndices.add(c.i);
    }
  }

  for (let i = 0; i < count; i++) {
    let show = true;
    const eq = channels.equity[i]!;
    if (eq < filters.equityMin || eq > filters.equityMax) show = false;
    if (categorySet && !categorySet.has(INDEX_CATEGORY[channels.categoryIndex[i]!] ?? "highCard"))
      show = false;
    if (clusterSet && !clusterSet.has(channels.clusterId[i]!)) show = false;
    if (filters.boardRainbow !== null && channels.boardRainbow[i] !== (filters.boardRainbow ? 1 : 0))
      show = false;
    if (filters.boardTwoTone !== null && channels.boardTwoTone[i] !== (filters.boardTwoTone ? 1 : 0))
      show = false;
    if (filters.boardMonotone !== null && channels.boardMonotone[i] !== (filters.boardMonotone ? 1 : 0))
      show = false;
    if (neighborIndices && !neighborIndices.has(i)) show = false;

    visible[i] = show ? 1 : 0;
    if (!show) {
      colors[i * 3] = HIDDEN_COLOR[0];
      colors[i * 3 + 1] = HIDDEN_COLOR[1];
      colors[i * 3 + 2] = HIDDEN_COLOR[2];
    }
  }
}

export function buildLodIndices(count: number, sampleRate: number): number[] {
  if (sampleRate >= 1) return Array.from({ length: count }, (_, i) => i);
  const step = Math.max(1, Math.floor(1 / sampleRate));
  const indices: number[] = [];
  for (let i = 0; i < count; i += step) indices.push(i);
  return indices;
}
