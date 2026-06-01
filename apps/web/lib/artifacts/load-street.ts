import type { Street } from "@geometry-of-poker/shared";
import type {
  BrowserMetadata,
  BrowserPointMeta,
  StreetDataset,
  StreetManifest,
} from "@/lib/types";
import { parsePointsBin } from "@/lib/artifacts/parse-points-bin";

const CATEGORY_INDEX: Record<string, number> = {
  highCard: 0,
  pair: 1,
  twoPair: 2,
  threeOfAKind: 3,
  straight: 4,
  flush: 5,
  fullHouse: 6,
  fourOfAKind: 7,
  straightFlush: 8,
  royalFlush: 9,
};

interface ManifestsResponse {
  artifactMode: "public" | "blob";
  streets: Partial<Record<Street, StreetManifest>>;
}

let manifestCache: Promise<ManifestsResponse> | null = null;

function loadManifests() {
  manifestCache ??= fetch("/api/manifests").then(async (res) => {
    if (!res.ok) throw new Error(`Failed to load artifact manifests: ${res.status}`);
    return res.json() as Promise<ManifestsResponse>;
  });
  return manifestCache;
}

export async function fetchStreetManifest(street: Street): Promise<StreetManifest> {
  const manifests = await loadManifests();
  const manifest = manifests.streets[street];
  if (!manifest) throw new Error(`No manifest available for ${street}`);
  return manifest;
}

export async function fetchPointsBin(street: Street): Promise<ArrayBuffer> {
  const manifest = await fetchStreetManifest(street);
  const res = await fetch(manifest.artifacts.pointsBin);
  if (!res.ok) throw new Error(`Failed to load points for ${street}: ${res.status}`);
  return res.arrayBuffer();
}

export async function fetchBrowserMetadata(street: Street): Promise<BrowserMetadata> {
  const manifest = await fetchStreetManifest(street);
  const res = await fetch(manifest.artifacts.metadataJson);
  if (!res.ok) throw new Error(`Failed to load metadata for ${street}: ${res.status}`);
  return res.json() as Promise<BrowserMetadata>;
}

function buildChannels(metadata: BrowserPointMeta[], count: number) {
  const equity = new Float32Array(count);
  const clusterId = new Int16Array(count);
  const categoryIndex = new Uint8Array(count);
  const pNuts = new Float32Array(count);
  const equityVariance = new Float32Array(count);
  const boardConnectivity = new Float32Array(count);
  const boardRainbow = new Uint8Array(count);
  const boardTwoTone = new Uint8Array(count);
  const boardMonotone = new Uint8Array(count);
  const boardPairedness = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const p = metadata[i]!;
    equity[i] = p.equityVsRandom;
    clusterId[i] = p.clusterId;
    categoryIndex[i] = CATEGORY_INDEX[p.category] ?? 0;
    pNuts[i] = p.summary.pNuts ?? 0;
    equityVariance[i] = p.summary.equityVariance ?? 0;
    boardConnectivity[i] = p.summary.boardConnectivityScore ?? 0;
    boardRainbow[i] = (p.summary.boardRainbowFlag ?? 0) > 0.5 ? 1 : 0;
    boardTwoTone[i] = (p.summary.boardTwoToneFlag ?? 0) > 0.5 ? 1 : 0;
    boardMonotone[i] = (p.summary.boardMonotoneFlag ?? 0) > 0.5 ? 1 : 0;
    boardPairedness[i] = p.summary.boardPairednessScore ?? 0;
  }

  return {
    equity,
    clusterId,
    categoryIndex,
    pNuts,
    equityVariance,
    boardConnectivity,
    boardRainbow,
    boardTwoTone,
    boardMonotone,
    boardPairedness,
  };
}

export async function loadStreetDataset(street: Street): Promise<StreetDataset> {
  const [manifest, binBuffer, metadataPayload] = await Promise.all([
    fetchStreetManifest(street),
    fetchPointsBin(street),
    fetchBrowserMetadata(street),
  ]);

  const parsed = parsePointsBin(binBuffer);
  const count = parsed.count;
  const metadata = metadataPayload.points;

  if (metadata.length !== count) {
    throw new Error(
      `Point count mismatch for ${street}: bin=${count}, metadata=${metadata.length}`,
    );
  }

  const colors = new Float32Array(count * 3);
  colors.fill(0.75);
  const sizes = new Float32Array(count);
  sizes.fill(1.5);
  const visible = new Uint8Array(count);
  visible.fill(1);

  const idToIndex = new Map<string, number>();
  metadata.forEach((p, i) => idToIndex.set(p.id, i));

  return {
    street,
    manifest,
    positions: parsed.positions,
    colors,
    sizes,
    visible,
    count,
    metadata,
    channels: buildChannels(metadata, count),
    idToIndex,
  };
}

/** Progressive loader: positions first, metadata second */
export async function loadStreetDatasetProgressive(
  street: Street,
  onPartial?: (partial: Pick<StreetDataset, "street" | "manifest" | "positions" | "count">) => void,
): Promise<StreetDataset> {
  const [manifest, binBuffer] = await Promise.all([
    fetchStreetManifest(street),
    fetchPointsBin(street),
  ]);
  const parsed = parsePointsBin(binBuffer);
  onPartial?.({
    street,
    manifest,
    positions: parsed.positions,
    count: parsed.count,
  });
  const metadataPayload = await fetchBrowserMetadata(street);
  const metadata = metadataPayload.points;
  const count = parsed.count;

  const colors = new Float32Array(count * 3);
  colors.fill(0.75);
  const sizes = new Float32Array(count);
  sizes.fill(1.5);
  const visible = new Uint8Array(count);
  visible.fill(1);

  const idToIndex = new Map<string, number>();
  metadata.forEach((p, i) => idToIndex.set(p.id, i));

  return {
    street,
    manifest,
    positions: parsed.positions,
    colors,
    sizes,
    visible,
    count,
    metadata,
    channels: buildChannels(metadata, count),
    idToIndex,
  };
}

export { parsePointsBin, CATEGORY_INDEX };
