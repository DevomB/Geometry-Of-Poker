import {
  extractGeometryFeatures,
  featureOrderForMode,
  isPokerCalculationsAvailable,
  profileFeatureGroups,
  validatePokerStateInput,
  type FeatureMode,
  type ExactFeatureBudget,
  type Street,
} from "@geometry-of-poker/feature-engine";
import { join } from "node:path";
import {
  emptyTimingReport,
  ensureDir,
  readProgress,
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
  shardFileName,
  type PreflopMode,
} from "./sample-state.js";
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
import { appendBinaryVectors, vectorsToFloat32 } from "./writers/binary-vectors.js";
import { mergeParquetShards } from "./writers/merge-shards.js";
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
  const featureNames = featureOrderForMode(mode);
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
  const exactFeatureBudget = options.exactFeatureBudget ?? "production";
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
  const profileEvery = options.profileSampleEvery ?? DEFAULT_PROFILE_EVERY;
  const sampleJsonCount = options.sampleJsonCount ?? DEFAULT_SAMPLE_COUNT;
  const preflopMode = options.preflopMode ?? (options.street === "preflop" ? "enumerate1326" : "random");
  const artifactsRoot = options.artifactsRoot ?? join(options.outputDir, "..", "..");
  const outputDir = options.outputDir || streetOutputDir(artifactsRoot, options.street);
  const shardDir = shardsDir(outputDir);
  const progressPath = join(outputDir, ".generation-progress.json");

  await ensureDir(outputDir);
  await ensureDir(shardDir);

  const featureNames = [...featureOrderForMode(mode)];
  const dimension = featureNames.length;
  const batchCount = Math.ceil(options.count / batchSize);

  let progress: GenerationProgress | null = options.resume ? await readProgress(progressPath) : null;
  const completedBatches = new Set(progress?.completedBatches ?? []);

  if (!progress) {
    progress = {
      street: options.street,
      seed: options.seed,
      mode,
      targetCount: options.count,
      completedCount: 0,
      completedBatches: [],
      batchSize,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  let timing = emptyTimingReport();
  timing.profileSampleEvery = profileEvery;
  let featureAgg: FeatureGroupTimingAggregate = {
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
  let vectorsInitialized = completedBatches.size > 0;

  console.log(
    `[generate] street=${options.street} count=${options.count} seed=${options.seed} mode=${mode} batches=${batchCount} batchSize=${batchSize}`,
  );

  for (let batchIndex = 0; batchIndex < batchCount; batchIndex++) {
    if (completedBatches.has(batchIndex)) {
      console.log(`[generate] skip completed batch ${batchIndex + 1}/${batchCount}`);
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

    const shardPath = join(
      shardDir,
      shardFileName(options.street, options.seed, mode, batchIndex, states.length),
    );
    await writeRecordsParquet(shardPath, records, featureNames);

    const chunk = vectorsToFloat32(records, dimension);
    await appendBinaryVectors(vectorsPath, chunk, records.length, dimension, vectorsInitialized);
    vectorsInitialized = true;

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
    completedBatches.add(batchIndex);
    await writeProgress(progressPath, progress);

    const pct = ((progress.completedCount / options.count) * 100).toFixed(1);
    console.log(
      `[generate] batch ${batchIndex + 1}/${batchCount} +${records.length} (${pct}%) ` +
        `${batchStats.statesPerSecond.toFixed(1)} states/s extract=${batchStats.extractMsPerState.toFixed(2)}ms/state`,
    );
  }

  timing.featureGroups = finalizeFeatureTimings(timing.featureGroups);

  const mergedCount = await mergeParquetShards(shardDir, parquetPath, featureNames);
  if (mergedCount !== options.count) {
    console.warn(`[generate] merged parquet count ${mergedCount} != target ${options.count}`);
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
  };

  const summary = await buildSummaryReport(manifest, outputDir);
  await writeManifest(outputDir, manifest);
  await writeSummaryReport(outputDir, summary);

  const sampleRecords = await loadSampleRecords(parquetPath, sampleJsonCount);
  await writeJson(join(outputDir, "sample.json"), sampleRecords);

  console.log(`[generate] done ${options.street}: ${options.count} records -> ${outputDir}`);
  console.log(`[generate] validation: ${validation.valid ? "PASS" : "FAIL"}`);
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
