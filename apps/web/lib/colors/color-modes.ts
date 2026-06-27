import type { ColorMode, StreetDataset, ViewerFilters } from "@/lib/types";
import { CATEGORY_PALETTE, CLUSTER_PALETTE } from "@/lib/types";
import { INDEX_CATEGORY } from "@geometry-of-poker/shared";

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

function forEachIndex(count: number, indices: number[] | undefined, visit: (i: number) => void) {
  if (indices) {
    for (const i of indices) visit(i);
    return;
  }
  for (let i = 0; i < count; i++) visit(i);
}

export function applyColorMode(
  dataset: StreetDataset,
  mode: ColorMode,
  colors: Float32Array,
  lodIndices?: number[],
) {
  const { count, channels } = dataset;

  if (mode === "equity") {
    forEachIndex(count, lodIndices, (i) => {
      const [r, g, b] = heatmapColor(channels.equity[i]!);
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    });
    return;
  }

  if (mode === "category") {
    forEachIndex(count, lodIndices, (i) => {
      const cat = INDEX_CATEGORY[channels.categoryIndex[i]!] ?? "highCard";
      const [r, g, b] = CATEGORY_PALETTE[cat] ?? [0.6, 0.6, 0.6];
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    });
    return;
  }

  if (mode === "cluster") {
    forEachIndex(count, lodIndices, (i) => {
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
    });
    return;
  }

  if (mode === "pNuts") {
    const { min, max } = normalizeChannel(channels.pNuts, count);
    forEachIndex(count, lodIndices, (i) => {
      const t = (channels.pNuts[i]! - min) / (max - min);
      const [r, g, b] = divergingColor(t * 2 - 1);
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    });
    return;
  }

  if (mode === "equityVariance") {
    const { min, max } = normalizeChannel(channels.equityVariance, count);
    forEachIndex(count, lodIndices, (i) => {
      const t = (channels.equityVariance[i]! - min) / (max - min);
      const [r, g, b] = heatmapColor(t);
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    });
    return;
  }

  if (mode === "boardConnectivity") {
    const { min, max } = normalizeChannel(channels.boardConnectivity, count);
    forEachIndex(count, lodIndices, (i) => {
      const t = (channels.boardConnectivity[i]! - min) / (max - min);
      const [r, g, b] = heatmapColor(t);
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    });
  }
}

const HIDDEN_COLOR: [number, number, number] = [0.04, 0.04, 0.06];
interface FilterContext {
  categorySet: Set<string> | null;
  clusterSet: Set<number> | null;
  neighborIndices: Set<number> | null;
}

function insertTopK(top: { i: number; d: number }[], candidate: { i: number; d: number }, k: number) {
  if (top.length === k && candidate.d >= top[top.length - 1]!.d) return;
  let at = top.length;
  while (at > 0 && candidate.d < top[at - 1]!.d) at--;
  top.splice(at, 0, candidate);
  if (top.length > k) top.pop();
}

export function applyFilters(
  dataset: StreetDataset,
  filters: ViewerFilters,
  visible: Uint8Array,
  colors: Float32Array,
) {
  const context = buildFilterContext(dataset, filters);

  for (let i = 0; i < dataset.count; i++) {
    const show = isPointVisible(dataset, filters, context, i);
    visible[i] = show ? 1 : 0;
    if (!show) paintHidden(colors, i);
  }
}

function buildFilterContext(dataset: StreetDataset, filters: ViewerFilters): FilterContext {
  return {
    categorySet: filters.categories.length > 0 ? new Set(filters.categories) : null,
    clusterSet: filters.clusters.length > 0 ? new Set(filters.clusters) : null,
    neighborIndices: filters.searchNeighborOf
      ? nearestNeighborSet(dataset, filters.searchNeighborOf, 25)
      : null,
  };
}

function nearestNeighborSet(dataset: StreetDataset, pointId: string, k: number) {
  const idx = dataset.idToIndex.get(pointId);
  if (idx === undefined) return null;

  const neighborIndices = new Set([idx]);
  const px = dataset.positions[idx * 3]!;
  const py = dataset.positions[idx * 3 + 1]!;
  const pz = dataset.positions[idx * 3 + 2]!;
  const candidates: { i: number; d: number }[] = [];

  for (let i = 0; i < dataset.count; i++) {
    const d =
      (dataset.positions[i * 3]! - px) ** 2 +
      (dataset.positions[i * 3 + 1]! - py) ** 2 +
      (dataset.positions[i * 3 + 2]! - pz) ** 2;
    insertTopK(candidates, { i, d }, k);
  }
  for (const c of candidates) neighborIndices.add(c.i);
  return neighborIndices;
}

function isPointVisible(
  dataset: StreetDataset,
  filters: ViewerFilters,
  context: FilterContext,
  index: number,
) {
  const { channels } = dataset;
  const eq = channels.equity[index]!;
  if (eq < filters.equityMin || eq > filters.equityMax) return false;
  if (
    context.categorySet &&
    !context.categorySet.has(INDEX_CATEGORY[channels.categoryIndex[index]!] ?? "highCard")
  ) {
    return false;
  }
  if (context.clusterSet && !context.clusterSet.has(channels.clusterId[index]!)) return false;
  if (!matchesBinaryFilter(channels.boardRainbow[index], filters.boardRainbow)) return false;
  if (!matchesBinaryFilter(channels.boardTwoTone[index], filters.boardTwoTone)) return false;
  if (!matchesBinaryFilter(channels.boardMonotone[index], filters.boardMonotone)) return false;
  return !context.neighborIndices || context.neighborIndices.has(index);
}

function matchesBinaryFilter(value: number | undefined, expected: boolean | null) {
  return expected === null || value === (expected ? 1 : 0);
}

function paintHidden(colors: Float32Array, index: number) {
  colors[index * 3] = HIDDEN_COLOR[0];
  colors[index * 3 + 1] = HIDDEN_COLOR[1];
  colors[index * 3 + 2] = HIDDEN_COLOR[2];
}

export function buildLodIndices(count: number, sampleRate: number): number[] {
  if (sampleRate >= 1) return Array.from({ length: count }, (_, i) => i);
  const step = Math.max(1, Math.floor(1 / sampleRate));
  const indices: number[] = [];
  for (let i = 0; i < count; i += step) indices.push(i);
  return indices;
}
