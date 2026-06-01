import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isPokerCalculationsAvailable } from "@geometry-of-poker/feature-engine";
import type { ArtifactMode, Street } from "@geometry-of-poker/shared";
import type { BrowserMetadata, StreetDataset, StreetManifest } from "@/lib/types";
import { parsePointsBin } from "@/lib/artifacts/parse-points-bin";
import { parseChannelsBin } from "@/lib/artifacts/parse-channels-bin";
import { CATEGORY_INDEX } from "@/lib/artifacts/load-street";

export const AVAILABLE_STREETS: Street[] = ["preflop", "flop", "turn", "river"];
export const APP_VERSION = "0.1.0";
export const ARTIFACT_MODE: ArtifactMode = process.env.GOP_ARTIFACT_BASE_URL ? "blob" : "public";

const ARTIFACTS_ROOT = join(process.cwd(), "public/artifacts/embeddings");
const cache = new Map<Street, StreetDataset>();
const remoteManifestCache = new Map<Street, Promise<StreetManifest>>();
const remoteDatasetCache = new Map<Street, Promise<StreetDataset>>();

export function artifactDir(street: Street) {
  return join(ARTIFACTS_ROOT, street);
}

export function publicArtifactBase(street: Street) {
  const blobBase = process.env.GOP_ARTIFACT_BASE_URL?.replace(/\/$/, "");
  if (blobBase) return `${blobBase}/embeddings/${street}`;
  return `/artifacts/embeddings/${street}`;
}

export function streetArtifactsExist(street: Street) {
  if (ARTIFACT_MODE === "blob") return true;
  const dir = artifactDir(street);
  return (
    existsSync(join(dir, "viewer-manifest.json")) &&
    existsSync(join(dir, "browser-metadata.json")) &&
    existsSync(join(dir, "browser-points.bin"))
  );
}

export function loadStreetManifestSync(street: Street): StreetManifest {
  const dir = artifactDir(street);
  return JSON.parse(readFileSync(join(dir, "viewer-manifest.json"), "utf8")) as StreetManifest;
}

export function browserSafeManifest(street: Street): StreetManifest {
  const manifest = loadStreetManifestSync(street);
  const base = publicArtifactBase(street);
  return {
    ...manifest,
    artifacts: {
      pointsBin: `${base}/browser-points.bin`,
      channelsBin: `${base}/browser-channels.bin`,
      metadataJson: `${base}/browser-metadata.json`,
    },
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "force-cache" });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json() as Promise<T>;
}

async function fetchArrayBuffer(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url, { cache: "force-cache" });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.arrayBuffer();
}

export async function loadStreetManifest(street: Street): Promise<StreetManifest> {
  if (ARTIFACT_MODE === "public") return browserSafeManifest(street);
  const cached = remoteManifestCache.get(street);
  if (cached) return cached;
  const promise = fetchJson<StreetManifest>(`${publicArtifactBase(street)}/viewer-manifest.json`).then(
    (manifest) => ({
      ...manifest,
      artifacts: {
        pointsBin: `${publicArtifactBase(street)}/browser-points.bin`,
        channelsBin: `${publicArtifactBase(street)}/browser-channels.bin`,
        metadataJson: `${publicArtifactBase(street)}/browser-metadata.json`,
      },
    }),
  );
  remoteManifestCache.set(street, promise);
  return promise;
}

export function loadStreetDatasetSync(street: Street): StreetDataset {
  const cached = cache.get(street);
  if (cached) return cached;

  const dir = artifactDir(street);
  const manifest = loadStreetManifestSync(street);
  const metadata = JSON.parse(
    readFileSync(join(dir, "browser-metadata.json"), "utf8"),
  ) as BrowserMetadata;
  const bin = readFileSync(join(dir, "browser-points.bin"));
  const arrayBuffer = bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength);
  const parsed = parsePointsBin(arrayBuffer as ArrayBuffer);
  const count = parsed.count;
  const points = metadata.points;

  if (manifest.street !== street || metadata.street !== street) {
    throw new Error(`Artifact street mismatch for ${street}.`);
  }
  if (manifest.pointCount !== count || metadata.count !== count || points.length !== count) {
    throw new Error(`Artifact point-count mismatch for ${street}.`);
  }

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
  const idToIndex = new Map<string, number>();

  points.forEach((p, i) => {
    idToIndex.set(p.id, i);
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
  });

  const dataset: StreetDataset = {
    street,
    manifest,
    positions: parsed.positions,
    colors: new Float32Array(count * 3),
    sizes: new Float32Array(count),
    visible: new Uint8Array(count),
    count,
    metadata: points,
    channels: {
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
    },
    idToIndex,
  };
  cache.set(street, dataset);
  return dataset;
}

function buildDataset(
  street: Street,
  manifest: StreetManifest,
  metadata: BrowserMetadata,
  bin: ArrayBuffer,
  channelsBin?: ArrayBuffer | null,
): StreetDataset {
  const parsed = parsePointsBin(bin);
  const count = parsed.count;
  const points = metadata.points;

  if (manifest.street !== street || metadata.street !== street) {
    throw new Error(`Artifact street mismatch for ${street}.`);
  }
  if (manifest.pointCount !== count || metadata.count !== count || points.length !== count) {
    throw new Error(`Artifact point-count mismatch for ${street}.`);
  }

  const idToIndex = new Map<string, number>();
  points.forEach((p, i) => idToIndex.set(p.id, i));

  let channels: StreetDataset["channels"];
  if (channelsBin) {
    const parsedChannels = parseChannelsBin(channelsBin);
    if (parsedChannels.count !== count) {
      throw new Error(`Channel point-count mismatch for ${street}.`);
    }
    channels = parsedChannels.channels;
  } else {
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

    points.forEach((p, i) => {
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
    });
    channels = {
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

  return {
    street,
    manifest,
    positions: parsed.positions,
    colors: new Float32Array(count * 3),
    sizes: new Float32Array(count),
    visible: new Uint8Array(count),
    count,
    metadata: points,
    channels,
    idToIndex,
  };
}

export async function loadStreetDatasetForApi(street: Street): Promise<StreetDataset> {
  if (ARTIFACT_MODE === "public") return loadStreetDatasetSync(street);
  const cached = remoteDatasetCache.get(street);
  if (cached) return cached;
  const promise = (async () => {
    const manifest = await loadStreetManifest(street);
    const [metadata, bin, channelsResult] = await Promise.all([
      fetchJson<BrowserMetadata>(manifest.artifacts.metadataJson),
      fetchArrayBuffer(manifest.artifacts.pointsBin),
      manifest.artifacts.channelsBin
        ? fetchArrayBuffer(manifest.artifacts.channelsBin).catch(() => null)
        : Promise.resolve(null),
    ]);
    return buildDataset(street, manifest, metadata, bin, channelsResult);
  })();
  remoteDatasetCache.set(street, promise);
  return promise;
}

export function availableArtifactStreets() {
  if (ARTIFACT_MODE === "blob") return AVAILABLE_STREETS;
  return AVAILABLE_STREETS.filter(streetArtifactsExist);
}

export function pokerCalculationsStatus() {
  return {
    available: isPokerCalculationsAvailable(),
    platform: process.platform,
    arch: process.arch,
    napi: String(process.versions.napi ?? "unknown"),
  };
}
