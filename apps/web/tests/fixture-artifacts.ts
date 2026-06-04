import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Street } from "@geometry-of-poker/shared";
import { parseChannelsBin } from "@/lib/artifacts/parse-channels-bin";
import { parsePointsBin } from "@/lib/artifacts/parse-points-bin";
import { parseProjectionIndex } from "@/lib/artifacts/parse-projection-index";
import type { BrowserMetadata, StreetDataset, StreetManifest } from "@/lib/types";

const STREETS: Street[] = ["preflop", "flop", "turn", "river"];

function pointsFor(street: Street) {
  const board: Record<Street, string[]> = {
    preflop: [],
    flop: ["2c", "7h", "Jh"],
    turn: ["2c", "7h", "Jh", "Qc"],
    river: ["2c", "7h", "Jh", "Qc", "3d"],
  };
  return [
    {
      id: `${street}-fixture-0`,
      hero: ["As", "Kd"] as [string, string],
      board: board[street],
      clusterId: 0,
      category: "highCard",
      equityVsRandom: 0.42,
      x: 0,
      y: 0,
      z: 0,
      summary: { equityVsRandom: 0.42, equityMean: 0.42, pNuts: 0.1 },
    },
    {
      id: `${street}-fixture-1`,
      hero: ["Qh", "Qs"] as [string, string],
      board: board[street],
      clusterId: 1,
      category: "pair",
      equityVsRandom: 0.74,
      x: 1,
      y: 0.5,
      z: 0,
      summary: { equityVsRandom: 0.74, equityMean: 0.74, pNuts: 0.3 },
    },
    {
      id: `${street}-fixture-2`,
      hero: ["9c", "8c"] as [string, string],
      board: board[street],
      clusterId: -1,
      category: "highCard",
      equityVsRandom: 0.36,
      x: 0,
      y: 1,
      z: 0.5,
      summary: { equityVsRandom: 0.36, equityMean: 0.36, pNuts: 0.05 },
    },
  ];
}

function writePoints(path: string, points: ReturnType<typeof pointsFor>) {
  const header = Buffer.alloc(16);
  header.write("GOPK", 0, "ascii");
  header.writeUInt32LE(1, 4);
  header.writeUInt32LE(points.length, 8);
  header.writeUInt32LE(3, 12);
  const body = Buffer.alloc(points.length * 12);
  points.forEach((p, i) => {
    body.writeFloatLE(p.x, i * 12);
    body.writeFloatLE(p.y, i * 12 + 4);
    body.writeFloatLE(p.z, i * 12 + 8);
  });
  writeFileSync(path, Buffer.concat([header, body]));
}

function writeChannels(path: string, points: ReturnType<typeof pointsFor>) {
  const count = points.length;
  const header = Buffer.alloc(16);
  header.write("GOPC", 0, "ascii");
  header.writeUInt32LE(1, 4);
  header.writeUInt32LE(count, 8);
  header.writeUInt32LE(10, 12);
  const equity = Buffer.alloc(count * 4);
  const clusterId = Buffer.alloc(count * 2);
  const categoryIndex = Buffer.alloc(count);
  const pNuts = Buffer.alloc(count * 4);
  const zeroF32 = Buffer.alloc(count * 4);
  const zeroU8 = Buffer.alloc(count);
  points.forEach((p, i) => {
    equity.writeFloatLE(p.equityVsRandom, i * 4);
    clusterId.writeInt16LE(p.clusterId, i * 2);
    categoryIndex.writeUInt8(p.category === "pair" ? 1 : 0, i);
    pNuts.writeFloatLE(p.summary.pNuts ?? 0, i * 4);
  });
  writeFileSync(
    path,
    Buffer.concat([
      header,
      equity,
      clusterId,
      categoryIndex,
      pNuts,
      zeroF32,
      zeroF32,
      zeroU8,
      zeroU8,
      zeroU8,
      zeroF32,
    ]),
  );
}

function writeProjectionIndex(path: string, points: ReturnType<typeof pointsFor>) {
  const metadata = {
    retainedFeatures: ["equityVsRandom", "categoryIndex"],
    scalerMean: [0, 0],
    scalerScale: [1, 1],
    pcaMean: [0, 0],
    pcaComponents: [1, 0, 0, 1],
    ids: points.map((p) => p.id),
  };
  const json = Buffer.from(JSON.stringify(metadata), "utf8");
  const padding = Buffer.alloc((4 - (json.length % 4)) % 4);
  const header = Buffer.alloc(24);
  header.write("GOPI", 0, "ascii");
  header.writeUInt32LE(1, 4);
  header.writeUInt32LE(points.length, 8);
  header.writeUInt32LE(2, 12);
  header.writeUInt32LE(2, 16);
  header.writeUInt32LE(json.length, 20);
  const pca = Buffer.alloc(points.length * 2 * 4);
  const embedding = Buffer.alloc(points.length * 3 * 4);
  const labels = Buffer.alloc(points.length * 2);
  points.forEach((p, i) => {
    pca.writeFloatLE(p.equityVsRandom, i * 8);
    pca.writeFloatLE(p.category === "pair" ? 1 : 0, i * 8 + 4);
    embedding.writeFloatLE(p.x, i * 12);
    embedding.writeFloatLE(p.y, i * 12 + 4);
    embedding.writeFloatLE(p.z, i * 12 + 8);
    labels.writeInt16LE(p.clusterId, i * 2);
  });
  writeFileSync(path, Buffer.concat([header, json, padding, pca, embedding, labels]));
}

export function createArtifactFixture() {
  const root = mkdtempSync(join(tmpdir(), "gop-artifacts-"));

  for (const street of STREETS) {
    const dir = join(root, street);
    mkdirSync(dir, { recursive: true });
    const points = pointsFor(street);
    const metadata: BrowserMetadata = {
      version: "1.0.0",
      street,
      count: points.length,
      points,
    };
    const manifest: StreetManifest = {
      version: "1.0.0",
      street,
      pointCount: points.length,
      embeddingMethod: "StandardScaler -> PCA -> UMAP -> HDBSCAN",
      retainedFeatures: ["equityVsRandom", "categoryIndex"],
      retainedDimension: 2,
      originalDimension: 2,
      categories: ["highCard", "pair"],
      clusters: [{ id: 0, size: 1, centroid: [0, 0, 0] }],
      artifacts: {
        pointsBin: "browser-points.bin",
        channelsBin: "browser-channels.bin",
        metadataJson: "browser-metadata.json",
        projectionIndexBin: "projection-index.bin",
      },
    };
    const retainedFeatures = {
      retained_features: manifest.retainedFeatures,
      original_dimension: manifest.originalDimension,
      retained_dimension: manifest.retainedDimension,
    };
    writeFileSync(join(dir, "browser-metadata.json"), JSON.stringify(metadata), "utf8");
    writeFileSync(join(dir, "viewer-manifest.json"), JSON.stringify(manifest), "utf8");
    writeFileSync(join(dir, "retained-features.json"), JSON.stringify(retainedFeatures), "utf8");
    writePoints(join(dir, "browser-points.bin"), points);
    writeChannels(join(dir, "browser-channels.bin"), points);
    writeProjectionIndex(join(dir, "projection-index.bin"), points);
  }

  return {
    root,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

export function loadFixtureDataset(root: string, street: Street): StreetDataset {
  const dir = join(root, street);
  const manifest = JSON.parse(readFileSync(join(dir, "viewer-manifest.json"), "utf8")) as StreetManifest;
  const metadata = JSON.parse(readFileSync(join(dir, "browser-metadata.json"), "utf8")) as BrowserMetadata;
  const pointsFile = readFileSync(join(dir, "browser-points.bin"));
  const channelsFile = readFileSync(join(dir, "browser-channels.bin"));
  const projectionFile = readFileSync(join(dir, "projection-index.bin"));
  const points = parsePointsBin(pointsFile.buffer.slice(pointsFile.byteOffset, pointsFile.byteOffset + pointsFile.byteLength));
  const channels = parseChannelsBin(channelsFile.buffer.slice(channelsFile.byteOffset, channelsFile.byteOffset + channelsFile.byteLength));
  const projectionIndex = parseProjectionIndex(
    projectionFile.buffer.slice(projectionFile.byteOffset, projectionFile.byteOffset + projectionFile.byteLength),
  );
  return {
    street,
    manifest,
    positions: points.positions,
    colors: new Float32Array(points.count * 3),
    sizes: new Float32Array(points.count),
    visible: new Uint8Array(points.count),
    count: points.count,
    metadata: metadata.points,
    channels: channels.channels,
    idToIndex: new Map(metadata.points.map((p, i) => [p.id, i])),
    projectionIndex,
  };
}
