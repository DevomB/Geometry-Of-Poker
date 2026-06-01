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
const PUBLIC_ROOT = join(__dirname, "../public/artifacts/embeddings");

const STREETS = ["preflop", "flop", "turn", "river"];
const BINARY_MAGIC = Buffer.from("GOPK");
const BINARY_VERSION = 1;

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
    console.warn(`Skipping ${street}: no browser-metadata.json`);
    return;
  }

  mkdirSync(dstDir, { recursive: true });

  const metadata = JSON.parse(readFileSync(join(srcDir, "browser-metadata.json"), "utf8"));
  const coords = metadata.points.map((p) => [p.x, p.y, p.z]);
  writeBrowserPoints(join(dstDir, "browser-points.bin"), coords);

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
    embeddingMethod: "StandardScaler → PCA → UMAP → HDBSCAN",
    retainedFeatures: retained.retained_features ?? [],
    retainedDimension: retained.retained_dimension ?? null,
    originalDimension: retained.original_dimension ?? null,
    ...analysis,
    categories,
    clusters,
    artifacts: {
      pointsBin: "browser-points.bin",
      metadataJson: "browser-metadata.json",
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
console.log("Artifact sync complete.");
