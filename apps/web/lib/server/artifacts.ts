import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  isPokerCalculationsAvailable,
  pokerCalculationsAvailabilityError,
} from "@geometry-of-poker/feature-engine";
import type { ArtifactMode, Street } from "@geometry-of-poker/shared";
import type { BrowserMetadata, StreetDataset, StreetManifest } from "@/lib/types";
import { parsePointsBin } from "@/lib/artifacts/parse-points-bin";
import { parseChannelsBin } from "@/lib/artifacts/parse-channels-bin";
import { parseProjectionIndex } from "@/lib/artifacts/parse-projection-index";
import { buildChannelsFromMetadata } from "@/lib/artifacts/build-channels";

export const AVAILABLE_STREETS: Street[] = ["preflop", "flop", "turn", "river"];
export const APP_VERSION = "0.1.0";
export const ARTIFACT_MODE: ArtifactMode = process.env.GOP_ARTIFACT_BASE_URL ? "blob" : "public";

const ARTIFACTS_ROOT =
  process.env.GOP_PUBLIC_ARTIFACTS_ROOT ?? join(process.cwd(), "public/artifacts/embeddings");
const cache = new Map<Street, StreetDataset>();
const remoteManifestCache = new Map<Street, Promise<StreetManifest>>();
const remoteDatasetCache = new Map<Street, Promise<StreetDataset>>();

export function isArtifactUnavailableError(err: unknown) {
  if (!(err instanceof Error)) return false;
  return /Failed to fetch .*: (403|404|500|502|503|504)/.test(err.message);
}

function assertProductionArtifactConfig() {
  if (process.env.VERCEL_ENV === "production" && !process.env.GOP_ARTIFACT_BASE_URL) {
    throw new Error(
      "GOP_ARTIFACT_BASE_URL is required in Vercel production. Point it at the CloudFront release artifact base.",
    );
  }
}

export function artifactDir(street: Street) {
  return join(ARTIFACTS_ROOT, street);
}

export function publicArtifactBase(street: Street) {
  const blobBase = process.env.GOP_ARTIFACT_BASE_URL?.replace(/\/$/, "");
  if (blobBase) return `${blobBase}/embeddings/${street}`;
  return `/artifacts/embeddings/${street}`;
}

export function streetArtifactsExist(street: Street) {
  assertProductionArtifactConfig();
  if (ARTIFACT_MODE === "blob") return true;
  const dir = artifactDir(street);
  return (
    existsSync(join(dir, "viewer-manifest.json")) &&
    existsSync(join(dir, "browser-metadata.json")) &&
    existsSync(join(dir, "browser-points.bin")) &&
    existsSync(join(dir, "projection-index.bin"))
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
      projectionIndexBin: `${base}/projection-index.bin`,
      ...(manifest.artifacts.dimensionProfileJson
        ? { dimensionProfileJson: `${base}/dimension-profile.json` }
        : {}),
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
  assertProductionArtifactConfig();
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
        projectionIndexBin: `${publicArtifactBase(street)}/projection-index.bin`,
        ...(manifest.artifacts.dimensionProfileJson
          ? { dimensionProfileJson: `${publicArtifactBase(street)}/dimension-profile.json` }
          : {}),
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
  const channelsPath = join(dir, "browser-channels.bin");
  const channelsBin = existsSync(channelsPath) ? readFileSync(channelsPath) : null;
  const projectionIndexBin = readFileSync(join(dir, "projection-index.bin"));
  const dataset = buildDataset(
    street,
    manifest,
    metadata,
    bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength) as ArrayBuffer,
    channelsBin
      ? (channelsBin.buffer.slice(
          channelsBin.byteOffset,
          channelsBin.byteOffset + channelsBin.byteLength,
        ) as ArrayBuffer)
      : null,
    projectionIndexBin.buffer.slice(
      projectionIndexBin.byteOffset,
      projectionIndexBin.byteOffset + projectionIndexBin.byteLength,
    ) as ArrayBuffer,
  );
  cache.set(street, dataset);
  return dataset;
}

function buildDataset(
  street: Street,
  manifest: StreetManifest,
  metadata: BrowserMetadata,
  bin: ArrayBuffer,
  channelsBin?: ArrayBuffer | null,
  projectionIndexBin?: ArrayBuffer | null,
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
  const projectionIndex = projectionIndexBin ? parseProjectionIndex(projectionIndexBin) : undefined;
  if (!projectionIndex) {
    throw new Error(`Missing projection index artifact for ${street}.`);
  }
  if (projectionIndex.count !== count) {
    throw new Error(`Projection index point-count mismatch for ${street}.`);
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
    channels = buildChannelsFromMetadata(points, count);
  }

  return {
    street,
    manifest,
    positions: parsed.positions,
    baseColors: new Float32Array(count * 3),
    baseSizes: new Float32Array(count),
    colors: new Float32Array(count * 3),
    sizes: new Float32Array(count),
    visible: new Uint8Array(count),
    count,
    metadata: points,
    channels,
    idToIndex,
    projectionIndex,
  };
}

export async function loadStreetDatasetForApi(street: Street): Promise<StreetDataset> {
  if (ARTIFACT_MODE === "public") return loadStreetDatasetSync(street);
  const cached = remoteDatasetCache.get(street);
  if (cached) return cached;
  const promise = (async () => {
    const manifest = await loadStreetManifest(street);
    const [metadata, bin, channelsResult, projectionIndexResult] = await Promise.all([
      fetchJson<BrowserMetadata>(manifest.artifacts.metadataJson),
      fetchArrayBuffer(manifest.artifacts.pointsBin),
      manifest.artifacts.channelsBin
        ? fetchArrayBuffer(manifest.artifacts.channelsBin).catch(() => null)
        : Promise.resolve(null),
      manifest.artifacts.projectionIndexBin
        ? fetchArrayBuffer(manifest.artifacts.projectionIndexBin)
        : Promise.reject(new Error(`Missing projection index URL for ${street}.`)),
    ]);
    return buildDataset(street, manifest, metadata, bin, channelsResult, projectionIndexResult);
  })();
  remoteDatasetCache.set(street, promise);
  return promise;
}

export async function availableArtifactStreets() {
  assertProductionArtifactConfig();
  if (ARTIFACT_MODE === "blob") {
    const checks = await Promise.all(
      AVAILABLE_STREETS.map(async (street) => {
        try {
          await loadStreetManifest(street);
          return street;
        } catch (err) {
          if (isArtifactUnavailableError(err)) return null;
          throw err;
        }
      }),
    );
    return checks.filter((street): street is Street => street !== null);
  }
  return AVAILABLE_STREETS.filter(streetArtifactsExist);
}

export function pokerCalculationsStatus() {
  const available = isPokerCalculationsAvailable();
  return {
    available,
    platform: process.platform,
    arch: process.arch,
    napi: String(process.versions.napi ?? "unknown"),
    ...(available ? {} : { error: pokerCalculationsAvailabilityError() }),
  };
}
