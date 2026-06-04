import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const STREETS = ["preflop", "flop", "turn", "river"];
const REQUIRED_FILES = [
  "viewer-manifest.json",
  "browser-points.bin",
  "browser-channels.bin",
  "browser-metadata.json",
  "retained-features.json",
  "projection-index.bin",
];
const GOPK_MAGIC = 0x4b504f47;
const GOPC_MAGIC = "GOPC";
const GOPI_MAGIC = "GOPI";
const FORBIDDEN_PROVENANCE_MARKERS = ["de" + "mo", "syn" + "thetic", "place" + "holder"];

function argValue(name) {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value.`);
  return value;
}

function releaseRoot() {
  const explicitRoot = argValue("--root");
  if (explicitRoot) return explicitRoot;

  const releaseId = argValue("--release-id");
  if (!releaseId) {
    throw new Error("Provide --root <embeddings-dir> or --release-id <release-id>.");
  }
  return join("artifacts", "releases", releaseId, "embeddings");
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function parsePointsCount(path) {
  const file = readFileSync(path);
  const view = new DataView(file.buffer, file.byteOffset, file.byteLength);
  if (file.byteLength < 16) throw new Error(`${path} is too small for GOPK header.`);
  if (view.getUint32(0, true) !== GOPK_MAGIC) throw new Error(`${path} has invalid GOPK magic.`);
  const version = view.getUint32(4, true);
  const count = view.getUint32(8, true);
  const dim = view.getUint32(12, true);
  if (version !== 1) throw new Error(`${path} has unsupported GOPK version ${version}.`);
  if (dim !== 3) throw new Error(`${path} must be 3D, got dim=${dim}.`);
  if (file.byteLength !== 16 + count * dim * 4) {
    throw new Error(`${path} size does not match GOPK count/dim.`);
  }
  return count;
}

function asciiMagic(view) {
  return String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
}

function parseChannelsCount(path) {
  const file = readFileSync(path);
  const view = new DataView(file.buffer, file.byteOffset, file.byteLength);
  if (file.byteLength < 16) throw new Error(`${path} is too small for GOPC header.`);
  if (asciiMagic(view) !== GOPC_MAGIC) throw new Error(`${path} has invalid GOPC magic.`);
  const version = view.getUint32(4, true);
  const count = view.getUint32(8, true);
  const channelCount = view.getUint32(12, true);
  if (version !== 1) throw new Error(`${path} has unsupported GOPC version ${version}.`);
  if (channelCount !== 10) throw new Error(`${path} has unsupported channel count ${channelCount}.`);
  const expectedBytes = 16 + count * (4 + 2 + 1 + 4 + 4 + 4 + 1 + 1 + 1 + 4);
  if (file.byteLength !== expectedBytes) {
    throw new Error(`${path} size does not match GOPC count.`);
  }
  return count;
}

function parseProjectionIndexCount(path) {
  const file = readFileSync(path);
  const view = new DataView(file.buffer, file.byteOffset, file.byteLength);
  if (file.byteLength < 24) throw new Error(`${path} is too small for GOPI header.`);
  if (asciiMagic(view) !== GOPI_MAGIC) throw new Error(`${path} has invalid GOPI magic.`);
  const version = view.getUint32(4, true);
  const count = view.getUint32(8, true);
  const pcaDimension = view.getUint32(12, true);
  const featureCount = view.getUint32(16, true);
  const jsonBytes = view.getUint32(20, true);
  if (version !== 1) throw new Error(`${path} has unsupported GOPI version ${version}.`);
  if (count === 0 || pcaDimension === 0 || featureCount === 0) {
    throw new Error(`${path} has invalid zero dimensions.`);
  }
  const jsonEnd = 24 + jsonBytes;
  const pcaStart = Math.ceil(jsonEnd / 4) * 4;
  const expectedBytes = pcaStart + count * pcaDimension * 4 + count * 3 * 4 + count * 2;
  if (file.byteLength !== expectedBytes) {
    throw new Error(`${path} size does not match GOPI dimensions.`);
  }
  const metadata = JSON.parse(file.subarray(24, jsonEnd).toString("utf8"));
  if (!Array.isArray(metadata.retainedFeatures) || metadata.retainedFeatures.length !== featureCount) {
    throw new Error(`${path} retainedFeatures length does not match GOPI feature count.`);
  }
  if (!Array.isArray(metadata.ids) || metadata.ids.length !== count) {
    throw new Error(`${path} ids length does not match GOPI count.`);
  }
  return { count, featureCount };
}

function assertNoForbiddenProvenance(streetDir) {
  for (const file of ["viewer-manifest.json", "retained-features.json"]) {
    const text = readFileSync(join(streetDir, file), "utf8").toLowerCase();
    if (FORBIDDEN_PROVENANCE_MARKERS.some((marker) => text.includes(marker))) {
      throw new Error(`${join(streetDir, file)} contains forbidden non-production provenance text.`);
    }
  }
}

function validateStreet(root, street) {
  const streetDir = join(root, street);
  if (!existsSync(streetDir)) throw new Error(`Missing street directory: ${streetDir}`);

  for (const file of REQUIRED_FILES) {
    const path = join(streetDir, file);
    if (!existsSync(path)) throw new Error(`Missing required artifact: ${path}`);
    if (statSync(path).size === 0) throw new Error(`Artifact is empty: ${path}`);
  }

  assertNoForbiddenProvenance(streetDir);

  const manifest = readJson(join(streetDir, "viewer-manifest.json"));
  const metadata = readJson(join(streetDir, "browser-metadata.json"));
  const retained = readJson(join(streetDir, "retained-features.json"));
  const pointsCount = parsePointsCount(join(streetDir, "browser-points.bin"));
  const channelsCount = parseChannelsCount(join(streetDir, "browser-channels.bin"));
  const projection = parseProjectionIndexCount(join(streetDir, "projection-index.bin"));

  if (manifest.street !== street) throw new Error(`${street}: manifest street mismatch.`);
  if (metadata.street !== street) throw new Error(`${street}: metadata street mismatch.`);
  if (manifest.pointCount !== pointsCount) throw new Error(`${street}: manifest pointCount != GOPK count.`);
  if (metadata.count !== pointsCount) throw new Error(`${street}: metadata count != GOPK count.`);
  if (!Array.isArray(metadata.points) || metadata.points.length !== pointsCount) {
    throw new Error(`${street}: metadata points length mismatch.`);
  }
  if (channelsCount !== pointsCount) throw new Error(`${street}: GOPC count != GOPK count.`);
  if (projection.count !== pointsCount) throw new Error(`${street}: GOPI count != GOPK count.`);

  const manifestFeatures = manifest.retainedFeatures ?? [];
  const retainedFeatures = retained.retained_features ?? retained.retainedFeatures ?? [];
  if (!Array.isArray(manifestFeatures) || manifestFeatures.length !== projection.featureCount) {
    throw new Error(`${street}: manifest retainedFeatures length != GOPI feature count.`);
  }
  if (!Array.isArray(retainedFeatures) || retainedFeatures.length !== projection.featureCount) {
    throw new Error(`${street}: retained-features length != GOPI feature count.`);
  }
  if (!manifest.artifacts?.projectionIndexBin) {
    throw new Error(`${street}: viewer-manifest.json must include artifacts.projectionIndexBin.`);
  }

  return { street, points: pointsCount, features: projection.featureCount };
}

function main() {
  const root = releaseRoot();
  if (!existsSync(root)) throw new Error(`Artifact root does not exist: ${root}`);
  const results = STREETS.map((street) => validateStreet(root, street));

  console.log("Artifact release validation passed.");
  for (const row of results) {
    console.log(`- ${row.street}: ${row.points.toLocaleString()} points, ${row.features} projection features`);
  }
}

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
