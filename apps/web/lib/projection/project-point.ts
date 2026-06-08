import type { BrowserPointMeta, ProjectionResponse, StreetDataset } from "@/lib/types";

function normalizeCard(card: string) {
  return `${card[0]?.toUpperCase() ?? ""}${card[1]?.toLowerCase() ?? ""}`;
}

function cardSetKey(cards: string[]) {
  return cards.map(normalizeCard).sort().join(",");
}

function cardsKey(hero: [string, string], board: string[]) {
  return `${cardSetKey(hero)}|${cardSetKey(board)}`;
}

export function findExactMatch(
  dataset: StreetDataset,
  hero: [string, string],
  board: string[],
): number | null {
  const key = cardsKey(hero, board);
  for (let i = 0; i < dataset.metadata.length; i++) {
    const p = dataset.metadata[i]!;
    if (cardsKey(p.hero, p.board) === key) return i;
  }
  return null;
}

export interface ProjectInput {
  hero: [string, string];
  board: string[];
  featureVector?: number[];
  featureNames?: string[];
  features?: Record<string, number>;
  category?: string;
  equityVsRandom?: number;
}

interface ScoredIndex {
  index: number;
  distance: number;
}

function insertTopK(top: ScoredIndex[], candidate: ScoredIndex, k: number) {
  if (top.length === k && candidate.distance >= top[top.length - 1]!.distance) return;

  let insertAt = top.length;
  while (insertAt > 0 && candidate.distance < top[insertAt - 1]!.distance) {
    insertAt--;
  }
  top.splice(insertAt, 0, candidate);
  if (top.length > k) top.pop();
}

function nearestByPosition(dataset: StreetDataset, index: number, k: number): ScoredIndex[] {
  const px = dataset.positions[index * 3]!;
  const py = dataset.positions[index * 3 + 1]!;
  const pz = dataset.positions[index * 3 + 2]!;
  const top: ScoredIndex[] = [];

  for (let i = 0; i < dataset.count; i++) {
    if (i === index) continue;
    const dx = dataset.positions[i * 3]! - px;
    const dy = dataset.positions[i * 3 + 1]! - py;
    const dz = dataset.positions[i * 3 + 2]! - pz;
    insertTopK(top, { index: i, distance: dx * dx + dy * dy + dz * dz }, k);
  }

  return top.map((n) => ({ ...n, distance: Math.sqrt(n.distance) }));
}

function alignFeatureVector(vector: number[], names: string[], retained: string[]): Float64Array {
  const byName = new Map<string, number>();
  for (let i = 0; i < names.length; i++) byName.set(names[i]!, vector[i] ?? 0);
  return Float64Array.from(retained.map((name) => byName.get(name) ?? 0));
}

function transformToPca(dataset: StreetDataset, vector: number[], names: string[]): Float64Array {
  const index = dataset.projectionIndex;
  if (!index) throw new Error("Projection index artifact is required for manual projection.");

  const aligned = alignFeatureVector(vector, names, index.retainedFeatures);
  const scaled = new Float64Array(index.featureCount);
  for (let i = 0; i < index.featureCount; i++) {
    const scale = index.scalerScale[i] || 1;
    scaled[i] = (aligned[i]! - index.scalerMean[i]!) / scale;
  }

  const projected = new Float64Array(index.pcaDimension);
  for (let component = 0; component < index.pcaDimension; component++) {
    let sum = 0;
    const componentOffset = component * index.featureCount;
    for (let feature = 0; feature < index.featureCount; feature++) {
      sum += (scaled[feature]! - index.pcaMean[feature]!) * index.pcaComponents[componentOffset + feature]!;
    }
    projected[component] = sum;
  }
  return projected;
}

function nearestByPca(dataset: StreetDataset, query: Float64Array, k: number): ScoredIndex[] {
  const index = dataset.projectionIndex;
  if (!index) throw new Error("Projection index artifact is required for manual projection.");

  const top: ScoredIndex[] = [];
  for (let row = 0; row < index.count; row++) {
    let d = 0;
    const offset = row * index.pcaDimension;
    for (let dim = 0; dim < index.pcaDimension; dim++) {
      const delta = index.pcaTrain[offset + dim]! - query[dim]!;
      d += delta * delta;
    }
    insertTopK(top, { index: row, distance: d }, k);
  }
  return top.map((n) => ({ ...n, distance: Math.sqrt(n.distance) }));
}

function pluralityCluster(dataset: StreetDataset, top: ScoredIndex[]): number | null {
  const index = dataset.projectionIndex;
  if (!index) return null;

  const counts = new Map<number, number>();
  for (const n of top) {
    const label = index.labels[n.index]!;
    if (label < 0) continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  let best: number | null = null;
  let bestCount = 0;
  for (const [label, count] of counts) {
    if (count > bestCount) {
      best = label;
      bestCount = count;
    }
  }
  return best;
}

function interpolateEmbedding(dataset: StreetDataset, top: ScoredIndex[]): [number, number, number] {
  const index = dataset.projectionIndex;
  if (!index) throw new Error("Projection index artifact is required for manual projection.");

  let wSum = 0;
  let x = 0;
  let y = 0;
  let z = 0;
  for (const n of top) {
    const w = 1 / (n.distance + 1e-9);
    const offset = n.index * 3;
    x += index.embeddingTrain[offset]! * w;
    y += index.embeddingTrain[offset + 1]! * w;
    z += index.embeddingTrain[offset + 2]! * w;
    wSum += w;
  }
  return [x / wSum, y / wSum, z / wSum];
}

function pointFeatures(p: BrowserPointMeta) {
  return { ...p.summary, equityVsRandom: p.equityVsRandom };
}

export function projectIntoGeometry(
  dataset: StreetDataset,
  input: ProjectInput,
  k = 5,
): ProjectionResponse {
  const exact = findExactMatch(dataset, input.hero, input.board);
  if (exact !== null) {
    const p = dataset.metadata[exact]!;
    const neighbors = nearestByPosition(dataset, exact, k);
    return {
      position: [p.x, p.y, p.z],
      method: "exact_match",
      neighborIds: neighbors.map((n) => dataset.metadata[n.index]!.id),
      neighborDistances: neighbors.map((n) => n.distance),
      clusterId: p.clusterId,
      features: pointFeatures(p),
      featureNames: Object.keys(p.summary),
      category: p.category,
      equityVsRandom: p.equityVsRandom,
    };
  }

  if (!input.featureVector || !input.featureNames) {
    throw new Error("Feature extraction is required for non-dataset manual projection.");
  }

  const query = transformToPca(dataset, input.featureVector, input.featureNames);
  const top = nearestByPca(dataset, query, k);
  if (top.length === 0) throw new Error("Projection index contains no neighbors.");

  const position = interpolateEmbedding(dataset, top);
  const bestPoint = dataset.metadata[top[0]!.index]!;

  return {
    position,
    method: "pca_knn_interpolation",
    neighborIds: top.map((n) => dataset.metadata[n.index]!.id),
    neighborDistances: top.map((n) => n.distance),
    clusterId: pluralityCluster(dataset, top),
    features: input.features ?? pointFeatures(bestPoint),
    featureNames: input.features ? Object.keys(input.features) : Object.keys(bestPoint.summary),
    category: input.category ?? bestPoint.category,
    equityVsRandom: input.equityVsRandom ?? bestPoint.equityVsRandom,
  };
}

export function getPointById(dataset: StreetDataset, id: string): BrowserPointMeta | null {
  const idx = dataset.idToIndex.get(id);
  return idx !== undefined ? dataset.metadata[idx]! : null;
}
