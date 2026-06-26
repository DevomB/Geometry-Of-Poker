import {
  extractGeometryFeatures,
  featureOrderForMode,
  isPokerCalculationsAvailable,
  profileFeatureGroups,
  type FeatureMode,
  type ExactFeatureBudget,
  type Street,
} from "@geometry-of-poker/feature-engine";
import { join } from "node:path";
import {
  emptyTimingReport,
  ensureDir,
  readProgress,
  clearShardDir,
  segmentsDir,
  shardsDir,
  streetOutputDir,
  writeJson,
  writeManifest,
  writeProgress,
  writeSummaryReport,
} from "./io.js";
import {
  formatRecordId,
  resolveStateBatch,
} from "./sample-state.js";
import {
  completedCountFromSegments,
  importExtensionSource,
  readSegmentManifests,
  segmentFileName,
  sha256Buffer,
  validateContiguousSegments,
  validateSegmentCompatibility,
  verifySegmentFiles,
  writeSegmentManifest,
} from "./segments.js";
import {
  DATASET_VERSION,
  FEATURE_SCHEMA_VERSION,
  type BatchTimingStats,
  type DatasetManifest,
  type DatasetRecord,
  type FeatureGroupTimingAggregate,
  type GenerateStreetDatasetOptions,
  type GenerateStreetDatasetResult,
  type GenerationProgress,
  type GenerationTimingReport,
} from "./types.js";
import { validateDatasetFromManifest } from "./validate-dataset.js";
import { buildSummaryReport } from "./summary-report.js";
import { vectorsToFloat32 } from "./writers/binary-vectors.js";
import { mergeSegmentParquetShards } from "./writers/merge-shards.js";
import { writeRecordsParquet } from "./writers/parquet-writer.js";

const DEFAULT_BATCH_SIZE = 1000;
const DEFAULT_PROFILE_EVERY = 100;
const DEFAULT_SAMPLE_COUNT = 20;

function aggregateFeatureTimings(
  agg: FeatureGroupTimingAggregate,
  sample: ReturnType<typeof profileFeatureGroups>,
): FeatureGroupTimingAggregate {
  const n = agg.samples + 1;
  return {
    core: agg.core + sample.core,
    board: agg.board + sample.board,
    draws: agg.draws + sample.draws,
    removal: agg.removal + sample.removal,
    transitions: agg.transitions + sample.transitions,
    total: agg.total + sample.total,
    samples: n,
  };
}

function finalizeFeatureTimings(agg: FeatureGroupTimingAggregate): FeatureGroupTimingAggregate {
  if (agg.samples === 0) return agg;
  const n = agg.samples;
  return {
    core: agg.core / n,
    board: agg.board / n,
    draws: agg.draws / n,
    removal: agg.removal / n,
    transitions: agg.transitions / n,
    total: agg.total / n,
    samples: n,
  };
}

function recordsFromSampled(
  states: ReturnType<typeof resolveStateBatch>,
  mode: FeatureMode,
  exactFeatureBudget: ExactFeatureBudget,
  street: Street,
  seed: number,
  profileEvery: number,
  featureAgg: FeatureGroupTimingAggregate,
): { records: DatasetRecord[]; extractMs: number; featureAgg: FeatureGroupTimingAggregate } {
  const records: DatasetRecord[] = [];
  let extractMs = 0;
  let agg = featureAgg;

  for (const sampled of states) {
    const t0 = performance.now();
    const result = extractGeometryFeatures(
      { hero: sampled.hero, board: sampled.board },
      { mode, exactFeatureBudget },
    );
    extractMs += performance.now() - t0;

    if (sampled.index % profileEvery === 0) {
      agg = aggregateFeatureTimings(
        agg,
        profileFeatureGroups(
          { hero: sampled.hero, board: sampled.board },
          mode,
          exactFeatureBudget,
        ),
      );
    }

    records.push({
      id: formatRecordId(street, seed, sampled.index),
      hero: sampled.hero,
      board: sampled.board,
      street,
      vector: result.vector,
      metadata: {
        category: result.metadata.category,
        categoryIndex: result.metadata.categoryIndex,
        equityVsRandom: result.groups.core.equityVsRandom ?? result.vector[0] ?? 0,
      },
    });
  }

  return { records, extractMs, featureAgg: agg };
}

function mergeTiming(
  base: GenerationTimingReport,
  batch: BatchTimingStats,
  extractMs: number,
  heapMb: number,
  profileEvery: number,
  featureAgg: FeatureGroupTimingAggregate,
): GenerationTimingReport {
  const totalWallMs = base.totalWallMs + batch.wallMs;
  const totalExtractMs = base.totalExtractMs + extractMs;
  const totalRecords = base.batches.reduce((s, b) => s + b.recordCount, 0) + batch.recordCount;
  return {
    totalWallMs,
    totalExtractMs,
    statesPerSecond: totalRecords / (totalWallMs / 1000),
    extractMsPerState: totalExtractMs / totalRecords,
    peakHeapUsedMb: Math.max(base.peakHeapUsedMb, heapMb),
    batches: [...base.batches, batch],
    featureGroups: featureAgg,
    profileSampleEvery: profileEvery,
  };
}

export async function generateStreetDataset(
  options: GenerateStreetDatasetOptions,
): Promise<GenerateStreetDatasetResult> {
  if (!isPokerCalculationsAvailable()) {
    throw new Error(
      "poker-calculations native addon is unavailable. Dataset generation requires a working native binding.",
    );
  }

  const mode = options.mode ?? "compact";
  const exactFeatureBudget =
    options.exactFeatureBudget ?? (mode === "extended" ? "full" : "production");
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
  const profileEvery = options.profileSampleEvery ?? DEFAULT_PROFILE_EVERY;
  const sampleJsonCount = options.sampleJsonCount ?? DEFAULT_SAMPLE_COUNT;
  const preflopMode = options.preflopMode ?? (options.street === "preflop" ? "enumerate1326" : "random");
  const artifactsRoot = options.artifactsRoot ?? join(options.outputDir, "..", "..");
  const outputDir = options.outputDir || streetOutputDir(artifactsRoot, options.street);
  const shardDir = shardsDir(outputDir);
  const segmentDir = segmentsDir(outputDir);
  const progressPath = join(outputDir, ".generation-progress.json");
  const segmentContext = {
    street: options.street,
    seed: options.seed,
    mode,
    exactFeatureBudget,
    preflopMode: options.street === "preflop" ? preflopMode : undefined,
  };

  await ensureDir(outputDir);
  if (!options.resume) {
    await clearShardDir(outputDir);
  }
  await ensureDir(shardDir);
  await ensureDir(segmentDir);
  if (options.extendFrom) {
    await importExtensionSource(options.extendFrom, outputDir, segmentContext);
  }

  const featureNames = [...featureOrderForMode(mode)];
  const dimension = featureNames.length;
  const batchCount = Math.ceil(options.count / batchSize);

  let progress: GenerationProgress | null = options.resume ? await readProgress(progressPath) : null;
  if (progress) {
    const mismatches: string[] = [];
    if (progress.street !== options.street) mismatches.push("street");
    if (progress.seed !== options.seed) mismatches.push("seed");
    if (progress.mode !== mode) mismatches.push("mode");
    if (progress.exactFeatureBudget !== undefined && progress.exactFeatureBudget !== exactFeatureBudget) {
      mismatches.push("exactFeatureBudget");
    }
    if (progress.targetCount !== options.count) mismatches.push("count");
    if (progress.batchSize !== batchSize) mismatches.push("batchSize");
    if (mismatches.length > 0) {
      throw new Error(
        `Resume refused: progress file does not match current options (${mismatches.join(", ")}). ` +
          "Delete .generation-progress.json and shards/ or run without --resume.",
      );
    }
  }

  let segments = await readSegmentManifests(outputDir);
  validateSegmentCompatibility(segments, segmentContext);
  validateContiguousSegments(segments, options.count);
  await verifySegmentFiles(outputDir, segments);
  const segmentCompletedCount = completedCountFromSegments(segments);
  if (
    segmentCompletedCount > 0 &&
    segmentCompletedCount < options.count &&
    segmentCompletedCount % batchSize !== 0
  ) {
    throw new Error(
      `Dataset growth refused: source count ${segmentCompletedCount} is not aligned to range size ${batchSize}. ` +
        "Use the original range size or run a full recompute.",
    );
  }
  const completedBatches = new Set(progress?.completedBatches ?? []);
  for (const segment of segments) {
    if (segment.startOrdinal % batchSize === 0 && segment.count % batchSize === 0) {
      for (
        let batchIndex = segment.startOrdinal / batchSize;
        batchIndex < segment.endOrdinalExclusive / batchSize;
        batchIndex++
      ) {
        completedBatches.add(batchIndex);
      }
    }
  }

  if (!progress) {
    progress = {
      street: options.street,
      seed: options.seed,
      mode,
      exactFeatureBudget,
      targetCount: options.count,
      completedCount: segmentCompletedCount,
      completedBatches: [],
      batchSize,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  let timing = progress.timing ?? emptyTimingReport();
  timing.profileSampleEvery = profileEvery;
  let featureAgg: FeatureGroupTimingAggregate = progress.timing?.featureGroups ?? {
    core: 0,
    board: 0,
    draws: 0,
    removal: 0,
    transitions: 0,
    total: 0,
    samples: 0,
  };

  const parquetPath = join(outputDir, "records.parquet");
  const vectorsPath = join(outputDir, "vectors.f32.bin");

  console.log(
    `[generate] street=${options.street} targetCount=${options.count} seed=${options.seed} mode=${mode} batches=${batchCount} batchSize=${batchSize}`,
  );

  for (let batchIndex = 0; batchIndex < batchCount; batchIndex++) {
    const startOrdinal = batchIndex * batchSize;
    const endOrdinalExclusive = Math.min(startOrdinal + batchSize, options.count);
    const coveredBySegment = segments.some(
      (segment) =>
        segment.startOrdinal <= startOrdinal &&
        segment.endOrdinalExclusive >= endOrdinalExclusive,
    );
    if (completedBatches.has(batchIndex) || coveredBySegment) {
      console.log(`[generate] skip completed range ${startOrdinal}-${endOrdinalExclusive}`);
      continue;
    }

    const wallStart = performance.now();
    const states = resolveStateBatch(
      options.street,
      batchIndex,
      batchSize,
      options.count,
      options.seed,
      preflopMode,
    );
    if (states.length === 0) continue;

    const { records, extractMs, featureAgg: updatedAgg } = recordsFromSampled(
      states,
      mode,
      exactFeatureBudget,
      options.street,
      options.seed,
      profileEvery,
      featureAgg,
    );
    featureAgg = updatedAgg;

    const parquetFile = segmentFileName(
      options.street,
      options.seed,
      mode,
      startOrdinal,
      startOrdinal + states.length,
    );
    const shardPath = join(shardDir, parquetFile);
    await writeRecordsParquet(shardPath, records, featureNames);

    const chunk = vectorsToFloat32(records, dimension);
    await writeSegmentManifest(outputDir, segmentContext, {
      startOrdinal,
      endOrdinalExclusive: startOrdinal + states.length,
      parquetFile,
      parquetPath: shardPath,
      vectorSha256: sha256Buffer(Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength)),
      firstRecordId: records[0]!.id,
      lastRecordId: records[records.length - 1]!.id,
    });

    const wallMs = performance.now() - wallStart;
    const heapMb = process.memoryUsage().heapUsed / (1024 * 1024);
    const batchStats: BatchTimingStats = {
      batchIndex,
      recordCount: records.length,
      wallMs,
      extractMsTotal: extractMs,
      extractMsPerState: extractMs / records.length,
      statesPerSecond: records.length / (wallMs / 1000),
      heapUsedMb: heapMb,
    };
    timing = mergeTiming(timing, batchStats, extractMs, heapMb, profileEvery, featureAgg);

    progress.completedCount += records.length;
    progress.completedBatches = [...(progress.completedBatches ?? []), batchIndex];
    progress.timing = timing;
    completedBatches.add(batchIndex);
    await writeProgress(progressPath, progress);

    const pct = ((progress.completedCount / options.count) * 100).toFixed(1);
    console.log(
      `[generate] batch ${batchIndex + 1}/${batchCount} +${records.length} (${pct}%) ` +
        `${batchStats.statesPerSecond.toFixed(1)} states/s extract=${batchStats.extractMsPerState.toFixed(2)}ms/state`,
    );
  }

  timing.featureGroups = finalizeFeatureTimings(timing.featureGroups);

  segments = await readSegmentManifests(outputDir);
  validateSegmentCompatibility(segments, segmentContext);
  validateContiguousSegments(segments, options.count, true);
  await verifySegmentFiles(outputDir, segments);

  const mergedCount = await mergeSegmentParquetShards(shardDir, parquetPath, vectorsPath, featureNames, segments);
  if (mergedCount !== options.count) {
    throw new Error(
      `Merged parquet count ${mergedCount} does not match target ${options.count}. ` +
        "Stale shard files may remain in shards/ — delete shards/ and re-run without --resume.",
    );
  }

  const validation = await validateDatasetFromManifest({
    outputDir,
    street: options.street,
    seed: options.seed,
    mode,
    featureNames,
    dimension,
    count: options.count,
  });

  const manifest: DatasetManifest = {
    version: DATASET_VERSION,
    featureSchemaVersion: FEATURE_SCHEMA_VERSION,
    street: options.street,
    seed: options.seed,
    mode,
    exactFeatureBudget,
    count: options.count,
    dimension,
    featureNames,
    preflopMode: options.street === "preflop" ? preflopMode : undefined,
    generatedAt: new Date().toISOString(),
    reproducible: true,
    files: {
      parquet: "records.parquet",
      vectors: "vectors.f32.bin",
      manifest: "manifest.json",
      summaryReport: "summary-report.json",
      sample: "sample.json",
      shardsDir: "shards",
    },
    timing,
    validation,
    segments,
  };

  const summary = await buildSummaryReport(manifest, outputDir);
  await writeManifest(outputDir, manifest);
  await writeSummaryReport(outputDir, summary);

  const sampleRecords = await loadSampleRecords(parquetPath, sampleJsonCount);
  await writeJson(join(outputDir, "sample.json"), sampleRecords);

  console.log(`[generate] done ${options.street}: ${options.count} records -> ${outputDir}`);
  console.log(`[generate] validation: ${validation.valid ? "PASS" : "FAIL"}`);
  if (!validation.valid) {
    for (const err of validation.errors) {
      console.error(`[generate] validation error: ${err}`);
    }
    throw new Error(`Dataset validation failed for ${options.street}`);
  }
  console.log(`[generate] throughput: ${timing.statesPerSecond.toFixed(2)} states/s`);

  return { manifest, summary, outputDir };
}

async function loadSampleRecords(parquetPath: string, count: number): Promise<DatasetRecord[]> {
  try {
    const { readSampleFromParquet } = await import("./readers/parquet-reader.js");
    return readSampleFromParquet(parquetPath, count);
  } catch {
    return [];
  }
}

export { streetOutputDir };
