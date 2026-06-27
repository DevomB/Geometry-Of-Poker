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
  "dimension-profile.json",
];
const GOPK_MAGIC = 0x4b504f47;
const GOPC_MAGIC = "GOPC";
const GOPI_MAGIC = "GOPI";
const FORBIDDEN_PROVENANCE_MARKERS = ["de" + "mo", "syn" + "thetic", "place" + "holder"];

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log("Usage: node scripts/validate-release-artifacts.mjs --root <embeddings-dir> | --release-id <release-id>");
  process.exit(0);
}

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
  for (const file of ["viewer-manifest.json", "retained-features.json", "dimension-profile.json"]) {
    const text = readFileSync(join(streetDir, file), "utf8").toLowerCase();
    if (FORBIDDEN_PROVENANCE_MARKERS.some((marker) => text.includes(marker))) {
      throw new Error(`${join(streetDir, file)} contains forbidden non-production provenance text.`);
    }
  }
}

function assertRequiredFiles(streetDir) {
  if (!existsSync(streetDir)) throw new Error(`Missing street directory: ${streetDir}`);

  for (const file of REQUIRED_FILES) {
    const path = join(streetDir, file);
    if (!existsSync(path)) throw new Error(`Missing required artifact: ${path}`);
    if (statSync(path).size === 0) throw new Error(`Artifact is empty: ${path}`);
  }
}

function readStreetArtifacts(streetDir) {
  return {
    manifest: readJson(join(streetDir, "viewer-manifest.json")),
    metadata: readJson(join(streetDir, "browser-metadata.json")),
    retained: readJson(join(streetDir, "retained-features.json")),
    pointsCount: parsePointsCount(join(streetDir, "browser-points.bin")),
    channelsCount: parseChannelsCount(join(streetDir, "browser-channels.bin")),
    projection: parseProjectionIndexCount(join(streetDir, "projection-index.bin")),
    dimensionProfile: readJson(join(streetDir, "dimension-profile.json")),
  };
}

function validateStreetIdentity(street, artifacts) {
  if (artifacts.manifest.street !== street) throw new Error(`${street}: manifest street mismatch.`);
  if (artifacts.metadata.street !== street) throw new Error(`${street}: metadata street mismatch.`);
}

function validatePointCounts(street, artifacts) {
  if (artifacts.manifest.pointCount !== artifacts.pointsCount) throw new Error(`${street}: manifest pointCount != GOPK count.`);
  if (artifacts.metadata.count !== artifacts.pointsCount) throw new Error(`${street}: metadata count != GOPK count.`);
  if (!Array.isArray(artifacts.metadata.points) || artifacts.metadata.points.length !== artifacts.pointsCount) {
    throw new Error(`${street}: metadata points length mismatch.`);
  }
  if (artifacts.channelsCount !== artifacts.pointsCount) throw new Error(`${street}: GOPC count != GOPK count.`);
  if (artifacts.projection.count !== artifacts.pointsCount) throw new Error(`${street}: GOPI count != GOPK count.`);
}

function validateFeatureArtifacts(street, artifacts) {
  const manifestFeatures = artifacts.manifest.retainedFeatures ?? [];
  const retainedFeatures = artifacts.retained.retained_features ?? artifacts.retained.retainedFeatures ?? [];
  if (!Array.isArray(manifestFeatures) || manifestFeatures.length !== artifacts.projection.featureCount) {
    throw new Error(`${street}: manifest retainedFeatures length != GOPI feature count.`);
  }
  if (!Array.isArray(retainedFeatures) || retainedFeatures.length !== artifacts.projection.featureCount) {
    throw new Error(`${street}: retained-features length != GOPI feature count.`);
  }
  if (!artifacts.manifest.artifacts?.projectionIndexBin) {
    throw new Error(`${street}: viewer-manifest.json must include artifacts.projectionIndexBin.`);
  }
  if (!artifacts.manifest.artifacts?.dimensionProfileJson) {
    throw new Error(`${street}: viewer-manifest.json must include artifacts.dimensionProfileJson.`);
  }
}

function validateDimensionProfile(street, artifacts) {
  if (artifacts.dimensionProfile.street !== street) throw new Error(`${street}: dimension profile street mismatch.`);
  if (artifacts.dimensionProfile.pointCount !== artifacts.pointsCount) {
    throw new Error(`${street}: dimension profile pointCount != GOPK count.`);
  }
  if (!artifacts.dimensionProfile.interpretation?.axisCaveat?.includes("nonlinear")) {
    throw new Error(`${street}: dimension profile must describe nonlinear coordinate interpretation.`);
  }
}

function validateStreet(root, street) {
  const streetDir = join(root, street);
  assertRequiredFiles(streetDir);
  assertNoForbiddenProvenance(streetDir);
  const artifacts = readStreetArtifacts(streetDir);
  validateStreetIdentity(street, artifacts);
  validatePointCounts(street, artifacts);
  validateFeatureArtifacts(street, artifacts);
  validateDimensionProfile(street, artifacts);

  return { street, points: artifacts.pointsCount, features: artifacts.projection.featureCount };
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
