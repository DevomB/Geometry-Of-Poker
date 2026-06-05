import type {
  ExactFeatureBudget,
  FeatureMode,
  Street,
} from "@geometry-of-poker/feature-engine";

export type { ExactFeatureBudget, FeatureMode, Street };

export const FEATURE_SCHEMA_VERSION = "1.0.0";
export const DATASET_VERSION = "1.0.0";
export const BINARY_MAGIC = "GOPK";
export const BINARY_VERSION = 1;

export interface DatasetRecord {
  id: string;
  hero: [string, string];
  board: string[];
  street: Street;
  vector: number[];
  metadata: {
    category: string;
    categoryIndex: number;
    equityVsRandom: number;
  };
}

export interface GenerationProgress {
  street: Street;
  seed: number;
  mode: FeatureMode;
  targetCount: number;
  completedCount: number;
  completedBatches: number[];
  batchSize: number;
  startedAt: string;
  updatedAt: string;
}

export interface BatchTimingStats {
  batchIndex: number;
  recordCount: number;
  wallMs: number;
  extractMsTotal: number;
  extractMsPerState: number;
  statesPerSecond: number;
  heapUsedMb: number;
}

export interface FeatureGroupTimingAggregate {
  core: number;
  board: number;
  draws: number;
  removal: number;
  transitions: number;
  total: number;
  samples: number;
}

export interface GenerationTimingReport {
  totalWallMs: number;
  totalExtractMs: number;
  statesPerSecond: number;
  extractMsPerState: number;
  peakHeapUsedMb: number;
  batches: BatchTimingStats[];
  featureGroups: FeatureGroupTimingAggregate;
  profileSampleEvery: number;
}

export interface DatasetManifest {
  version: string;
  featureSchemaVersion: string;
  street: Street;
  seed: number;
  mode: FeatureMode;
  exactFeatureBudget: ExactFeatureBudget;
  count: number;
  dimension: number;
  featureNames: string[];
  preflopMode?: "enumerate1326" | "canonical169" | "random";
  generatedAt: string;
  reproducible: boolean;
  files: {
    parquet: string;
    vectors: string;
    manifest: string;
    summaryReport: string;
    sample?: string;
    shardsDir?: string;
  };
  timing: GenerationTimingReport;
  validation: DatasetValidationReport;
}

export interface FeatureDistributionStats {
  name: string;
  count: number;
  missingCount: number;
  mean: number;
  stdDev: number;
  min: number;
  max: number;
}

export interface DatasetSummaryReport {
  street: Street;
  seed: number;
  mode: FeatureMode;
  count: number;
  dimension: number;
  generatedAt: string;
  featureStats: FeatureDistributionStats[];
  topCorrelations: Array<{ a: string; b: string; r: number }>;
  timing: GenerationTimingReport;
  outputSizes: {
    parquetBytes: number;
    vectorsBytes: number;
    manifestBytes: number;
    sampleBytes?: number;
    totalBytes: number;
  };
}

export interface DatasetValidationReport {
  valid: boolean;
  recordCount: number;
  errors: string[];
  checks: {
    legalStates: boolean;
    finiteVectors: boolean;
    fixedDimension: boolean;
    featureNamesMatch: boolean;
    noDuplicateCards: boolean;
    reproducibleSample: boolean;
  };
}

export interface GenerateStreetDatasetOptions {
  street: Street;
  count: number;
  seed: number;
  mode?: FeatureMode;
  exactFeatureBudget?: ExactFeatureBudget;
  batchSize?: number;
  outputDir: string;
  resume?: boolean;
  preflopMode?: "enumerate1326" | "canonical169" | "random";
  profileSampleEvery?: number;
  sampleJsonCount?: number;
  artifactsRoot?: string;
}

export interface GenerateStreetDatasetResult {
  manifest: DatasetManifest;
  summary: DatasetSummaryReport;
  outputDir: string;
}

export interface SampledState {
  hero: [string, string];
  board: string[];
  street: Street;
  seed: number;
  index: number;
  canonicalKey: string;
}
