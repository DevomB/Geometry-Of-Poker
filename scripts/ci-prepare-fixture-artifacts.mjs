#!/usr/bin/env node
/**
 * Writes minimal embedding artifacts under artifacts/embeddings for CI builds.
 * Run before `pnpm build` when CI=true and no GOP_ARTIFACT_BASE_URL is set.
 */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const EMBEDDINGS_ROOT = join(REPO_ROOT, "artifacts", "embeddings");
const HAND_CATEGORIES = JSON.parse(
  readFileSync(join(REPO_ROOT, "packages/shared/src/hand-categories.json"), "utf8"),
);
const CATEGORY_INDEX = Object.fromEntries(
  HAND_CATEGORIES.labels.map((label, index) => [label, index]),
);
for (const [alias, canonical] of Object.entries(HAND_CATEGORIES.aliases ?? {})) {
  if (canonical in CATEGORY_INDEX) CATEGORY_INDEX[alias] = CATEGORY_INDEX[canonical];
}

const STREETS = ["preflop", "flop", "turn", "river"];

function pointsFor(street) {
  const board = {
    preflop: [],
    flop: ["2c", "7h", "Jh"],
    turn: ["2c", "7h", "Jh", "Qc"],
    river: ["2c", "7h", "Jh", "Qc", "3d"],
  };
  return [
    {
      id: `${street}-ci-0`,
      hero: ["As", "Kd"],
      board: board[street],
      clusterId: 0,
      category: "highCard",
      equityVsRandom: 0.42,
      x: 0,
      y: 0,
      z: 0,
      summary: { pNuts: 0.1 },
    },
    {
      id: `${street}-ci-1`,
      hero: ["Qh", "Qs"],
      board: board[street],
      clusterId: 1,
      category: "onePair",
      equityVsRandom: 0.74,
      x: 1,
      y: 0.5,
      z: 0,
      summary: { pNuts: 0.3 },
    },
  ];
}

function writePoints(path, points) {
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

function writeChannels(path, points) {
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
    categoryIndex.writeUInt8(CATEGORY_INDEX[p.category] ?? 0, i);
    pNuts.writeFloatLE(p.summary?.pNuts ?? 0, i * 4);
  });
  writeFileSync(
    path,
    Buffer.concat([header, equity, clusterId, categoryIndex, pNuts, zeroF32, zeroF32, zeroU8, zeroU8, zeroU8, zeroF32]),
  );
}

function writeProjectionIndex(path, points) {
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
  const pca = Buffer.alloc(points.length * 8);
  const embedding = Buffer.alloc(points.length * 12);
  const labels = Buffer.alloc(points.length * 2);
  points.forEach((p, i) => {
    pca.writeFloatLE(p.equityVsRandom, i * 8);
    pca.writeFloatLE(CATEGORY_INDEX[p.category] ?? 0, i * 8 + 4);
    embedding.writeFloatLE(p.x, i * 12);
    embedding.writeFloatLE(p.y, i * 12 + 4);
    embedding.writeFloatLE(p.z, i * 12 + 8);
    labels.writeInt16LE(p.clusterId, i * 2);
  });
  writeFileSync(path, Buffer.concat([header, json, padding, pca, embedding, labels]));
}

for (const street of STREETS) {
  const dir = join(EMBEDDINGS_ROOT, street);
  mkdirSync(dir, { recursive: true });
  const points = pointsFor(street);
  const metadata = { version: "1.0.0", street, count: points.length, points };
  const manifest = {
    version: "1.0.0",
    street,
    pointCount: points.length,
    embeddingMethod: "ci-fixture",
    retainedFeatures: ["equityVsRandom", "categoryIndex"],
    retainedDimension: 2,
    originalDimension: 2,
    categories: ["highCard", "onePair"],
    clusters: [{ id: 0, size: 1, centroid: [0, 0, 0] }],
    artifacts: {
      pointsBin: "browser-points.bin",
      channelsBin: "browser-channels.bin",
      metadataJson: "browser-metadata.json",
      projectionIndexBin: "projection-index.bin",
    },
  };
  writeFileSync(join(dir, "browser-metadata.json"), JSON.stringify(metadata));
  writeFileSync(join(dir, "viewer-manifest.json"), JSON.stringify(manifest));
  writeFileSync(
    join(dir, "retained-features.json"),
    JSON.stringify({
      retained_features: manifest.retainedFeatures,
      original_dimension: 2,
      retained_dimension: 2,
    }),
  );
  writePoints(join(dir, "browser-points.bin"), points);
  writeChannels(join(dir, "browser-channels.bin"), points);
  writeProjectionIndex(join(dir, "projection-index.bin"), points);
}

const releaseRoot = join(REPO_ROOT, "artifacts", "releases", "ci-fixture", "embeddings");
mkdirSync(releaseRoot, { recursive: true });
for (const street of STREETS) {
  const src = join(EMBEDDINGS_ROOT, street);
  const dst = join(releaseRoot, street);
  mkdirSync(dst, { recursive: true });
  for (const file of [
    "browser-metadata.json",
    "viewer-manifest.json",
    "retained-features.json",
    "browser-points.bin",
    "browser-channels.bin",
    "projection-index.bin",
  ]) {
    writeFileSync(join(dst, file), readFileSync(join(src, file)));
  }
}

console.log(`CI fixture artifacts written to ${EMBEDDINGS_ROOT}`);
