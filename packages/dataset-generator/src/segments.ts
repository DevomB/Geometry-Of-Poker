import { copyFile, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { basename, join } from "node:path";
import {
  DATASET_VERSION,
  FEATURE_SCHEMA_VERSION,
  type DatasetManifest,
  type DatasetSegmentManifest,
  type ExactFeatureBudget,
  type FeatureMode,
  type Street,
} from "./types.js";
import { ensureDir, segmentsDir, shardsDir } from "./io.js";

const SEGMENT_VERSION = DATASET_VERSION;

export interface SegmentContext {
  street: Street;
  seed: number;
  mode: FeatureMode;
  exactFeatureBudget: ExactFeatureBudget;
  preflopMode?: "enumerate1326" | "canonical169" | "random";
}

export function segmentFileName(
  street: Street,
  seed: number,
  mode: string,
  startOrdinal: number,
  endOrdinalExclusive: number,
): string {
  return `${street}-seed${seed}-${mode}-range${String(startOrdinal).padStart(8, "0")}-${String(
    endOrdinalExclusive,
  ).padStart(8, "0")}.parquet`;
}

export function segmentManifestName(parquetFile: string): string {
  return `${parquetFile.replace(/\.parquet$/, "")}.json`;
}

export async function sha256File(path: string): Promise<string> {
  const hash = createHash("sha256");
  hash.update(await readFile(path));
  return hash.digest("hex");
}

export function sha256Buffer(buffer: Buffer | Uint8Array): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export async function writeSegmentManifest(
  outputDir: string,
  context: SegmentContext,
  args: {
    startOrdinal: number;
    endOrdinalExclusive: number;
    parquetFile: string;
    parquetPath: string;
    vectorSha256: string;
    firstRecordId: string;
    lastRecordId: string;
  },
): Promise<DatasetSegmentManifest> {
  const segment: DatasetSegmentManifest = {
    version: SEGMENT_VERSION,
    street: context.street,
    seed: context.seed,
    mode: context.mode,
    exactFeatureBudget: context.exactFeatureBudget,
    featureSchemaVersion: FEATURE_SCHEMA_VERSION,
    preflopMode: context.street === "preflop" ? context.preflopMode : undefined,
    startOrdinal: args.startOrdinal,
    endOrdinalExclusive: args.endOrdinalExclusive,
    count: args.endOrdinalExclusive - args.startOrdinal,
    parquetFile: args.parquetFile,
    parquetSha256: await sha256File(args.parquetPath),
    vectorSha256: args.vectorSha256,
    firstRecordId: args.firstRecordId,
    lastRecordId: args.lastRecordId,
    generatedAt: new Date().toISOString(),
  };
  await ensureDir(segmentsDir(outputDir));
  await writeFile(
    join(segmentsDir(outputDir), segmentManifestName(args.parquetFile)),
    `${JSON.stringify(segment, null, 2)}\n`,
    "utf8",
  );
  return segment;
}

export async function readSegmentManifests(outputDir: string): Promise<DatasetSegmentManifest[]> {
  try {
    const dir = segmentsDir(outputDir);
    const files = (await readdir(dir)).filter((file) => file.endsWith(".json")).sort();
    const segments = await Promise.all(
      files.map(async (file) => JSON.parse(await readFile(join(dir, file), "utf8")) as DatasetSegmentManifest),
    );
    return segments.sort((a, b) => a.startOrdinal - b.startOrdinal);
  } catch {
    return [];
  }
}

export function validateSegmentCompatibility(
  segments: readonly DatasetSegmentManifest[],
  context: SegmentContext,
): void {
  for (const segment of segments) {
    const mismatches: string[] = [];
    if (segment.street !== context.street) mismatches.push("street");
    if (segment.seed !== context.seed) mismatches.push("seed");
    if (segment.mode !== context.mode) mismatches.push("mode");
    if (segment.exactFeatureBudget !== context.exactFeatureBudget) mismatches.push("exactFeatureBudget");
    if (segment.featureSchemaVersion !== FEATURE_SCHEMA_VERSION) mismatches.push("featureSchemaVersion");
    if (context.street === "preflop" && segment.preflopMode !== context.preflopMode) {
      mismatches.push("preflopMode");
    }
    if (mismatches.length > 0) {
      throw new Error(
        `Dataset growth refused: segment ${segment.parquetFile} is incompatible (${mismatches.join(", ")}).`,
      );
    }
  }
}

export function validateContiguousSegments(
  segments: readonly DatasetSegmentManifest[],
  targetCount: number,
  requireComplete = false,
): void {
  let cursor = 0;
  for (const segment of segments) {
    if (segment.startOrdinal !== cursor) {
      throw new Error(
        `Dataset growth refused: expected segment to start at ${cursor}, got ${segment.startOrdinal}.`,
      );
    }
    if (segment.endOrdinalExclusive <= segment.startOrdinal || segment.count !== segment.endOrdinalExclusive - segment.startOrdinal) {
      throw new Error(`Dataset growth refused: invalid segment range in ${segment.parquetFile}.`);
    }
    cursor = segment.endOrdinalExclusive;
    if (cursor > targetCount) {
      throw new Error(`Dataset growth refused: segment range exceeds target count ${targetCount}.`);
    }
  }
  if (requireComplete && cursor !== targetCount) {
    throw new Error(`Dataset growth refused: segment ranges end at ${cursor}, expected ${targetCount}.`);
  }
}

export function completedCountFromSegments(segments: readonly DatasetSegmentManifest[]): number {
  if (segments.length === 0) return 0;
  return Math.max(...segments.map((segment) => segment.endOrdinalExclusive));
}

export async function verifySegmentFiles(
  outputDir: string,
  segments: readonly DatasetSegmentManifest[],
): Promise<void> {
  for (const segment of segments) {
    const path = join(shardsDir(outputDir), segment.parquetFile);
    const currentHash = await sha256File(path);
    if (currentHash !== segment.parquetSha256) {
      throw new Error(`Dataset growth refused: hash mismatch for ${segment.parquetFile}.`);
    }
  }
}

function sourceStreetDir(sourcePath: string, street: Street): string {
  if (sourcePath.endsWith(street)) return sourcePath;
  return join(sourcePath, "datasets", street);
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export async function importExtensionSource(
  sourcePath: string,
  outputDir: string,
  context: SegmentContext,
): Promise<void> {
  const sourceDir = sourceStreetDir(sourcePath, context.street);
  if (!(await exists(join(sourceDir, "manifest.json")))) {
    throw new Error(`Dataset growth refused: source checkpoint has no manifest.json at ${sourceDir}.`);
  }

  const sourceManifest = JSON.parse(await readFile(join(sourceDir, "manifest.json"), "utf8")) as DatasetManifest;
  const mismatches: string[] = [];
  if (sourceManifest.street !== context.street) mismatches.push("street");
  if (sourceManifest.seed !== context.seed) mismatches.push("seed");
  if (sourceManifest.mode !== context.mode) mismatches.push("mode");
  if (sourceManifest.exactFeatureBudget !== context.exactFeatureBudget) mismatches.push("exactFeatureBudget");
  if (sourceManifest.featureSchemaVersion !== FEATURE_SCHEMA_VERSION) mismatches.push("featureSchemaVersion");
  if (context.street === "preflop" && sourceManifest.preflopMode !== context.preflopMode) mismatches.push("preflopMode");
  if (mismatches.length > 0) {
    throw new Error(`Dataset growth refused: source manifest mismatch (${mismatches.join(", ")}).`);
  }

  await mkdir(shardsDir(outputDir), { recursive: true });
  await mkdir(segmentsDir(outputDir), { recursive: true });

  const sourceSegments = await readSegmentManifests(sourceDir);
  if (sourceSegments.length > 0) {
    validateSegmentCompatibility(sourceSegments, context);
    validateContiguousSegments(sourceSegments, sourceManifest.count);
    for (const segment of sourceSegments) {
      await copyFile(join(shardsDir(sourceDir), segment.parquetFile), join(shardsDir(outputDir), segment.parquetFile));
      await copyFile(
        join(segmentsDir(sourceDir), segmentManifestName(segment.parquetFile)),
        join(segmentsDir(outputDir), segmentManifestName(segment.parquetFile)),
      );
    }
    return;
  }

  const sourceRecords = join(sourceDir, sourceManifest.files.parquet);
  const sourceVectors = join(sourceDir, sourceManifest.files.vectors);
  if (!(await exists(sourceRecords))) {
    throw new Error(`Dataset growth refused: source records parquet is missing at ${sourceRecords}.`);
  }
  const parquetFile = segmentFileName(
    context.street,
    context.seed,
    context.mode,
    0,
    sourceManifest.count,
  );
  await copyFile(sourceRecords, join(shardsDir(outputDir), parquetFile));
  await writeSegmentManifest(outputDir, context, {
    startOrdinal: 0,
    endOrdinalExclusive: sourceManifest.count,
    parquetFile,
    parquetPath: join(shardsDir(outputDir), parquetFile),
    vectorSha256: (await exists(sourceVectors)) ? await sha256File(sourceVectors) : sha256Buffer(Buffer.alloc(0)),
    firstRecordId: `${context.street}-${context.seed}-${String(0).padStart(8, "0")}`,
    lastRecordId: `${context.street}-${context.seed}-${String(sourceManifest.count - 1).padStart(8, "0")}`,
  });
}

export function shardBaseName(path: string): string {
  return basename(path);
}
