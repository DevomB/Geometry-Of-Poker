import { categoryIndexForLabel, INDEX_CATEGORY } from "@geometry-of-poker/shared";
import type {
  BrowserMetadata,
  BrowserPointMeta,
  Street,
  StreetDataset,
  StreetManifest,
} from "@/lib/types";
import { parsePointsBin } from "@/lib/artifacts/parse-points-bin";
import { parseChannelsBin } from "@/lib/artifacts/parse-channels-bin";
import {
  buildChannelsFromMetadata,
  buildEmptyChannels,
} from "@/lib/artifacts/build-channels";

export { INDEX_CATEGORY, categoryIndexForLabel };

interface ManifestsResponse {
  artifactMode: "public" | "blob";
  streets: Partial<Record<Street, StreetManifest>>;
}

let manifestCache: Promise<ManifestsResponse> | null = null;

export function clearManifestCache(): void {
  manifestCache = null;
}

function loadManifests() {
  if (!manifestCache) {
    manifestCache = fetch("/api/manifests")
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          const message =
            typeof body?.error?.message === "string"
              ? body.error.message
              : `Failed to load artifact manifests: ${res.status}`;
          throw new Error(message);
        }
        return res.json() as Promise<ManifestsResponse>;
      })
      .catch((err) => {
        manifestCache = null;
        throw err;
      });
  }
  return manifestCache;
}

async function fetchArtifact(url: string, label: string): Promise<Response> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to fetch ${label} artifact from CDN: ${reason}`);
  }
}

export async function fetchStreetManifest(street: Street): Promise<StreetManifest> {
  const manifests = await loadManifests();
  const manifest = manifests.streets[street];
  if (!manifest) throw new Error(`No manifest available for ${street}`);
  return manifest;
}

export async function fetchPointsBin(street: Street): Promise<ArrayBuffer> {
  const manifest = await fetchStreetManifest(street);
  const res = await fetchArtifact(manifest.artifacts.pointsBin, `${street} points`);
  return res.arrayBuffer();
}

export async function fetchBrowserMetadata(street: Street): Promise<BrowserMetadata> {
  const manifest = await fetchStreetManifest(street);
  const res = await fetchArtifact(manifest.artifacts.metadataJson, `${street} metadata`);
  return res.json() as Promise<BrowserMetadata>;
}

export async function fetchChannelsBin(street: Street): Promise<ArrayBuffer | null> {
  const manifest = await fetchStreetManifest(street);
  if (!manifest.artifacts.channelsBin) return null;
  const res = await fetchArtifact(manifest.artifacts.channelsBin, `${street} channels`);
  return res.arrayBuffer();
}

export const buildChannels = buildChannelsFromMetadata;

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
  const baseColors = new Float32Array(count * 3);
  baseColors.fill(0.75);
  const baseSizes = new Float32Array(count);
  baseSizes.fill(1.5);
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
    baseColors,
    baseSizes,
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
  const baseColors = new Float32Array(count * 3);
  const baseSizes = new Float32Array(count);
  const partial: StreetDataset = {
    street,
    manifest,
    positions: parsed.positions,
    baseColors,
    baseSizes,
    colors: new Float32Array(count * 3),
    sizes: new Float32Array(count),
    visible: new Uint8Array(count),
    count,
    metadata: [],
    channels,
    idToIndex: new Map(),
  };
  partial.baseColors.fill(0.75);
  partial.baseSizes.fill(1.5);
  partial.colors.fill(0.75);
  partial.sizes.fill(1.5);
  partial.visible.fill(1);
  onPartial?.(partial);

  const metadataPayload = await fetchBrowserMetadata(street);
  const metadata = metadataPayload.points;
  const finalChannels = channelsBuffer ? channels : buildChannels(metadata, count);

  const finalBaseColors = new Float32Array(count * 3);
  finalBaseColors.fill(0.75);
  const finalBaseSizes = new Float32Array(count);
  finalBaseSizes.fill(1.5);
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
    baseColors: finalBaseColors,
    baseSizes: finalBaseSizes,
    colors,
    sizes,
    visible,
    count,
    metadata,
    channels: finalChannels,
    idToIndex: idToIndex(metadata),
  };
}

export { parsePointsBin };
