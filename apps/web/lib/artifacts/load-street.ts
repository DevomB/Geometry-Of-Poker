import type { Street } from "@geometry-of-poker/shared";
import type {
  BrowserMetadata,
  BrowserPointMeta,
  StreetDataset,
  StreetManifest,
} from "@/lib/types";
import { parsePointsBin } from "@/lib/artifacts/parse-points-bin";
import { parseChannelsBin, type BrowserChannels } from "@/lib/artifacts/parse-channels-bin";

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
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const message =
        typeof body?.error?.message === "string"
          ? body.error.message
          : `Failed to load artifact manifests: ${res.status}`;
      throw new Error(message);
    }
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

export async function fetchChannelsBin(street: Street): Promise<ArrayBuffer | null> {
  const manifest = await fetchStreetManifest(street);
  if (!manifest.artifacts.channelsBin) return null;
  const res = await fetch(manifest.artifacts.channelsBin);
  if (!res.ok) throw new Error(`Failed to load channels for ${street}: ${res.status}`);
  return res.arrayBuffer();
}

export function buildChannels(metadata: BrowserPointMeta[], count: number): BrowserChannels {
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

function buildEmptyChannels(count: number): BrowserChannels {
  return {
    equity: new Float32Array(count),
    clusterId: new Int16Array(count),
    categoryIndex: new Uint8Array(count),
    pNuts: new Float32Array(count),
    equityVariance: new Float32Array(count),
    boardConnectivity: new Float32Array(count),
    boardRainbow: new Uint8Array(count),
    boardTwoTone: new Uint8Array(count),
    boardMonotone: new Uint8Array(count),
    boardPairedness: new Float32Array(count),
  };
}

function idToIndex(metadata: BrowserPointMeta[]) {
  const map = new Map<string, number>();
  metadata.forEach((p, i) => map.set(p.id, i));
  return map;
}

export async function loadStreetDataset(street: Street): Promise<StreetDataset> {
  const [manifest, binBuffer, metadataPayload, channelsBuffer] = await Promise.all([
    fetchStreetManifest(street),
    fetchPointsBin(street),
    fetchBrowserMetadata(street),
    fetchChannelsBin(street),
  ]);

  const parsed = parsePointsBin(binBuffer);
  const count = parsed.count;
  const metadata = metadataPayload.points;

  if (metadata.length !== count) {
    throw new Error(
      `Point count mismatch for ${street}: bin=${count}, metadata=${metadata.length}`,
    );
  }

  const channels = channelsBuffer ? parseChannelsBin(channelsBuffer).channels : buildChannels(metadata, count);
  const colors = new Float32Array(count * 3);
  colors.fill(0.75);
  const sizes = new Float32Array(count);
  sizes.fill(1.5);
  const visible = new Uint8Array(count);
  visible.fill(1);

  return {
    street,
    manifest,
    positions: parsed.positions,
    colors,
    sizes,
    visible,
    count,
    metadata,
    channels,
    idToIndex: idToIndex(metadata),
  };
}

/** Progressive loader: positions first, metadata second */
export async function loadStreetDatasetProgressive(
  street: Street,
  onPartial?: (partial: StreetDataset) => void,
): Promise<StreetDataset> {
  const [manifest, binBuffer, channelsBuffer] = await Promise.all([
    fetchStreetManifest(street),
    fetchPointsBin(street),
    fetchChannelsBin(street),
  ]);
  const parsed = parsePointsBin(binBuffer);
  const count = parsed.count;
  const channels = channelsBuffer ? parseChannelsBin(channelsBuffer).channels : buildEmptyChannels(count);
  const partial: StreetDataset = {
    street,
    manifest,
    positions: parsed.positions,
    colors: new Float32Array(count * 3),
    sizes: new Float32Array(count),
    visible: new Uint8Array(count),
    count,
    metadata: [],
    channels,
    idToIndex: new Map(),
  };
  partial.colors.fill(0.75);
  partial.sizes.fill(1.5);
  partial.visible.fill(1);
  onPartial?.(partial);

  const metadataPayload = await fetchBrowserMetadata(street);
  const metadata = metadataPayload.points;
  const finalChannels = channelsBuffer ? channels : buildChannels(metadata, count);

  const colors = new Float32Array(count * 3);
  colors.fill(0.75);
  const sizes = new Float32Array(count);
  sizes.fill(1.5);
  const visible = new Uint8Array(count);
  visible.fill(1);

  return {
    street,
    manifest,
    positions: parsed.positions,
    colors,
    sizes,
    visible,
    count,
    metadata,
    channels: finalChannels,
    idToIndex: idToIndex(metadata),
  };
}

export { parsePointsBin, CATEGORY_INDEX };
