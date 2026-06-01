import type { BrowserPointMeta, ProjectionResponse, StreetDataset } from "@/lib/types";

const SUMMARY_FEATURES = [
  "equityVsRandom",
  "equityMean",
  "equityVariance",
  "pNuts",
  "pDominated",
  "flushOutCount",
  "straightOutCount",
  "removalGradientMean",
  "transitionEntropy",
  "boardConnectivityScore",
] as const;

function cardsKey(hero: [string, string], board: string[]) {
  return `${hero.join(",")}|${board.join(",")}`;
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

function featureVectorFromSummary(summary: Record<string, number | undefined>): number[] {
  return SUMMARY_FEATURES.map((name) => {
    if (name === "equityVsRandom") return summary.equityVsRandom ?? 0;
    return summary[name as keyof typeof summary] ?? 0;
  });
}

function distance(a: number[], b: number[]) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i]! - b[i]!) ** 2;
  return Math.sqrt(sum);
}

export interface ProjectInput {
  hero: [string, string];
  board: string[];
  featureVector?: number[];
  featureNames?: string[];
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
      features: { ...p.summary, equityVsRandom: p.equityVsRandom },
      featureNames: Object.keys(p.summary),
      category: p.category,
      equityVsRandom: p.equityVsRandom,
    };
  }

  let queryFeatures: number[] | null = null;
  if (input.featureVector && input.featureNames) {
    queryFeatures = alignFeatures(input.featureVector, input.featureNames);
  }

  if (queryFeatures) {
    return knnProject(dataset, queryFeatures, k, "feature_knn");
  }

  throw new Error(
    "Hand not found in dataset and feature extraction unavailable for projection.",
  );
}

function alignFeatures(vector: number[], names: string[]): number[] {
  return SUMMARY_FEATURES.map((name) => {
    const idx = names.indexOf(name);
    return idx >= 0 ? vector[idx]! : 0;
  });
}

function knnProject(
  dataset: StreetDataset,
  query: number[],
  k: number,
  method: string,
): ProjectionResponse {
  const scored: { index: number; distance: number }[] = [];
  for (let i = 0; i < dataset.count; i++) {
    const p = dataset.metadata[i]!;
    const fv = featureVectorFromSummary({ ...p.summary, equityVsRandom: p.equityVsRandom });
    scored.push({ index: i, distance: distance(query, fv) });
  }
  scored.sort((a, b) => a.distance - b.distance);
  const top = scored.slice(0, k);
  const weights = top.map((n) => 1 / (n.distance + 1e-9));
  const wSum = weights.reduce((a, b) => a + b, 0);

  let x = 0;
  let y = 0;
  let z = 0;
  for (let j = 0; j < top.length; j++) {
    const w = weights[j]! / wSum;
    const idx = top[j]!.index;
    x += dataset.positions[idx * 3]! * w;
    y += dataset.positions[idx * 3 + 1]! * w;
    z += dataset.positions[idx * 3 + 2]! * w;
  }

  const labels = top.map((n) => dataset.channels.clusterId[n.index]!);
  const valid = labels.filter((l) => l >= 0);
  const clusterId =
    valid.length > 0
      ? valid.sort((a, b) => valid.filter((v) => v === b).length - valid.filter((v) => v === a).length)[0]!
      : null;

  const best = dataset.metadata[top[0]!.index]!;

  return {
    position: [x, y, z],
    method,
    neighborIds: top.map((n) => dataset.metadata[n.index]!.id),
    neighborDistances: top.map((n) => n.distance),
    clusterId,
    features: inputFeaturesFromPoint(best),
    featureNames: Object.keys(best.summary),
    category: best.category,
    equityVsRandom: best.equityVsRandom,
  };
}

function inputFeaturesFromPoint(p: BrowserPointMeta) {
  return { ...p.summary, equityVsRandom: p.equityVsRandom };
}

function nearestByPosition(dataset: StreetDataset, index: number, k: number) {
  const px = dataset.positions[index * 3]!;
  const py = dataset.positions[index * 3 + 1]!;
  const pz = dataset.positions[index * 3 + 2]!;
  const scored: { index: number; distance: number }[] = [];
  for (let i = 0; i < dataset.count; i++) {
    if (i === index) continue;
    const d = Math.sqrt(
      (dataset.positions[i * 3]! - px) ** 2 +
        (dataset.positions[i * 3 + 1]! - py) ** 2 +
        (dataset.positions[i * 3 + 2]! - pz) ** 2,
    );
    scored.push({ index: i, distance: d });
  }
  scored.sort((a, b) => a.distance - b.distance);
  return scored.slice(0, k);
}

export function getPointById(dataset: StreetDataset, id: string): BrowserPointMeta | null {
  const idx = dataset.idToIndex.get(id);
  return idx !== undefined ? dataset.metadata[idx]! : null;
}

export { SUMMARY_FEATURES };
