/**
 * Sync embedding artifacts for the web viewer:
 * - browser-points.bin from metadata xyz (GOPK format)
 * - viewer-manifest.json from retained-features + analysis-report
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const EMBEDDINGS_ROOT = join(__dirname, "../../../artifacts/embeddings");
function argValue(name) {
  const index = process.argv.indexOf(name);
  if (index < 0) return "";
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value.`);
  }
  return value;
}

const RELEASE_ID = argValue("--release-id") || process.env.GOP_RELEASE_ID || "";
const PUBLIC_ROOT = RELEASE_ID
  ? join(__dirname, "../../../artifacts/releases", RELEASE_ID, "embeddings")
  : join(__dirname, "../public/artifacts/embeddings");

const STREETS = ["preflop", "flop", "turn", "river"];
const BINARY_MAGIC = Buffer.from("GOPK");
const CHANNEL_MAGIC = Buffer.from("GOPC");
const BINARY_VERSION = 1;
const CATEGORY_INDEX = {
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

function writeBrowserPoints(outPath, coords) {
  const count = coords.length;
  const header = Buffer.alloc(16);
  BINARY_MAGIC.copy(header, 0);
  header.writeUInt32LE(BINARY_VERSION, 4);
  header.writeUInt32LE(count, 8);
  header.writeUInt32LE(3, 12);
  const body = Buffer.alloc(count * 3 * 4);
  for (let i = 0; i < count; i++) {
    body.writeFloatLE(coords[i][0], i * 12);
    body.writeFloatLE(coords[i][1], i * 12 + 4);
    body.writeFloatLE(coords[i][2], i * 12 + 8);
  }
  writeFileSync(outPath, Buffer.concat([header, body]));
}

function writeBrowserChannels(outPath, points) {
  const count = points.length;
  const header = Buffer.alloc(16);
  CHANNEL_MAGIC.copy(header, 0);
  header.writeUInt32LE(BINARY_VERSION, 4);
  header.writeUInt32LE(count, 8);
  header.writeUInt32LE(10, 12);

  const equity = Buffer.alloc(count * 4);
  const clusterId = Buffer.alloc(count * 2);
  const categoryIndex = Buffer.alloc(count);
  const pNuts = Buffer.alloc(count * 4);
  const equityVariance = Buffer.alloc(count * 4);
  const boardConnectivity = Buffer.alloc(count * 4);
  const boardRainbow = Buffer.alloc(count);
  const boardTwoTone = Buffer.alloc(count);
  const boardMonotone = Buffer.alloc(count);
  const boardPairedness = Buffer.alloc(count * 4);

  for (let i = 0; i < count; i++) {
    const point = points[i];
    const summary = point.summary ?? {};
    equity.writeFloatLE(point.equityVsRandom ?? 0, i * 4);
    clusterId.writeInt16LE(point.clusterId ?? -1, i * 2);
    categoryIndex.writeUInt8(CATEGORY_INDEX[point.category] ?? 0, i);
    pNuts.writeFloatLE(summary.pNuts ?? 0, i * 4);
    equityVariance.writeFloatLE(summary.equityVariance ?? 0, i * 4);
    boardConnectivity.writeFloatLE(summary.boardConnectivityScore ?? 0, i * 4);
    boardRainbow.writeUInt8((summary.boardRainbowFlag ?? 0) > 0.5 ? 1 : 0, i);
    boardTwoTone.writeUInt8((summary.boardTwoToneFlag ?? 0) > 0.5 ? 1 : 0, i);
    boardMonotone.writeUInt8((summary.boardMonotoneFlag ?? 0) > 0.5 ? 1 : 0, i);
    boardPairedness.writeFloatLE(summary.boardPairednessScore ?? 0, i * 4);
  }

  writeFileSync(
    outPath,
    Buffer.concat([
      header,
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
    ]),
  );
}

function parseAnalysisReport(text) {
  const result = {
    pcaDimensions: null,
    pcaVariance: null,
    umap: {},
    hdbscan: { clusters: null, noiseFraction: null },
    trustworthiness: null,
    knnOverlap: null,
  };

  const pcaMatch = text.match(/PCA dimensions:\*\* (\d+) \(([\d.]+)% variance\)/);
  if (pcaMatch) {
    result.pcaDimensions = Number(pcaMatch[1]);
    result.pcaVariance = Number(pcaMatch[2]) / 100;
  }

  for (const line of text.split("\n")) {
    const umapMatch = line.match(/^- `(\w+)`: (.+)$/);
    if (umapMatch && line.includes("UMAP") === false) {
      const key = umapMatch[1];
      let val = umapMatch[2];
      if (val === "euclidean") result.umap[key] = val;
      else if (!Number.isNaN(Number(val))) result.umap[key] = Number(val);
      else result.umap[key] = val.replace(/"/g, "");
    }
    const clusterMatch = line.match(/\*\*Clusters:\*\* (\d+)/);
    if (clusterMatch) result.hdbscan.clusters = Number(clusterMatch[1]);
    const noiseMatch = line.match(/\*\*Noise points:\*\* [\d,]+ \(([\d.]+)%\)/);
    if (noiseMatch) result.hdbscan.noiseFraction = Number(noiseMatch[1]) / 100;
    const trustMatch = line.match(/Trustworthiness.*: ([\d.]+)/);
    if (trustMatch) result.trustworthiness = Number(trustMatch[1]);
    const overlapMatch = line.match(/kNN overlap.*: ([\d.]+)/);
    if (overlapMatch) result.knnOverlap = Number(overlapMatch[1]);
  }

  return result;
}

function computeClusterCentroids(points) {
  const sums = new Map();
  for (const p of points) {
    const id = p.clusterId;
    if (id < 0) continue;
    const entry = sums.get(id) ?? { count: 0, x: 0, y: 0, z: 0 };
    entry.count += 1;
    entry.x += p.x;
    entry.y += p.y;
    entry.z += p.z;
    sums.set(id, entry);
  }
  return [...sums.entries()]
    .map(([id, s]) => ({
      id,
      size: s.count,
      centroid: [s.x / s.count, s.y / s.count, s.z / s.count],
    }))
    .sort((a, b) => a.id - b.id);
}

function syncStreet(street) {
  const srcDir = join(EMBEDDINGS_ROOT, street);
  const dstDir = join(PUBLIC_ROOT, street);
  if (!existsSync(join(srcDir, "browser-metadata.json"))) {
    const message = `Skipping ${street}: no browser-metadata.json`;
    if (process.env.CI || process.env.VERCEL_ENV === "production" || RELEASE_ID) {
      throw new Error(message);
    }
    console.warn(message);
    return;
  }

  mkdirSync(dstDir, { recursive: true });

  const metadata = JSON.parse(readFileSync(join(srcDir, "browser-metadata.json"), "utf8"));
  const projectionIndexPath = join(srcDir, "projection-index.bin");
  if (!existsSync(projectionIndexPath)) {
    const message = `Skipping ${street}: no projection-index.bin`;
    if (process.env.CI || process.env.VERCEL_ENV === "production" || RELEASE_ID) {
      throw new Error(message);
    }
    console.warn(message);
    return;
  }

  const coords = metadata.points.map((p) => [p.x, p.y, p.z]);
  writeBrowserPoints(join(dstDir, "browser-points.bin"), coords);
  writeBrowserChannels(join(dstDir, "browser-channels.bin"), metadata.points);
  writeFileSync(join(dstDir, "projection-index.bin"), readFileSync(projectionIndexPath));

  const retained = existsSync(join(srcDir, "retained-features.json"))
    ? JSON.parse(readFileSync(join(srcDir, "retained-features.json"), "utf8"))
    : {};

  const analysis = existsSync(join(srcDir, "analysis-report.md"))
    ? parseAnalysisReport(readFileSync(join(srcDir, "analysis-report.md"), "utf8"))
    : {};

  const categories = [...new Set(metadata.points.map((p) => p.category))].sort();
  const clusters = computeClusterCentroids(metadata.points);

  const manifest = {
    version: "1.0.0",
    street,
    pointCount: metadata.count,
    embeddingMethod: "StandardScaler -> PCA -> UMAP -> HDBSCAN",
    retainedFeatures: retained.retained_features ?? [],
    retainedDimension: retained.retained_dimension ?? null,
    originalDimension: retained.original_dimension ?? null,
    ...analysis,
    categories,
    clusters,
    artifacts: {
      pointsBin: "browser-points.bin",
      channelsBin: "browser-channels.bin",
      metadataJson: "browser-metadata.json",
      projectionIndexBin: "projection-index.bin",
    },
  };

  writeFileSync(join(dstDir, "viewer-manifest.json"), JSON.stringify(manifest, null, 2));
  writeFileSync(
    join(dstDir, "browser-metadata.json"),
    readFileSync(join(srcDir, "browser-metadata.json")),
  );

  if (existsSync(join(srcDir, "retained-features.json"))) {
    writeFileSync(
      join(dstDir, "retained-features.json"),
      readFileSync(join(srcDir, "retained-features.json")),
    );
  }

  console.log(`Synced ${street}: ${metadata.count} points`);
}

mkdirSync(PUBLIC_ROOT, { recursive: true });
for (const street of STREETS) syncStreet(street);
console.log(RELEASE_ID ? `Release artifact sync complete: ${RELEASE_ID}` : "Artifact sync complete.");
