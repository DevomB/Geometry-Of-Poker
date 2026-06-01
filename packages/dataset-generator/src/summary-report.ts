import { stat } from "node:fs/promises";
import { join } from "node:path";
import { readAllRecordsFromParquet } from "./readers/parquet-reader.js";
import type {
  DatasetManifest,
  DatasetSummaryReport,
  FeatureDistributionStats,
} from "./types.js";

function computeFeatureStats(
  featureNames: readonly string[],
  vectors: number[][],
): FeatureDistributionStats[] {
  return featureNames.map((name, col) => {
    const values = vectors.map((v) => v[col] ?? 0);
    const missingCount = values.filter((v) => v === 0).length;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
    const stdDev = Math.sqrt(variance);
    return {
      name,
      count: values.length,
      missingCount,
      mean,
      stdDev,
      min: Math.min(...values),
      max: Math.max(...values),
    };
  });
}

function topPearsonCorrelations(
  featureNames: readonly string[],
  vectors: number[][],
  topK = 15,
): Array<{ a: string; b: string; r: number }> {
  const dim = featureNames.length;
  const cols: number[][] = Array.from({ length: dim }, (_, j) => vectors.map((v) => v[j] ?? 0));
  const means = cols.map((c) => c.reduce((a, b) => a + b, 0) / c.length);
  const stds = cols.map((c, j) => {
    const m = means[j]!;
    return Math.sqrt(c.reduce((a, b) => a + (b - m) ** 2, 0) / c.length) || 1;
  });

  const pairs: Array<{ a: string; b: string; r: number }> = [];
  for (let i = 0; i < dim; i++) {
    for (let j = i + 1; j < dim; j++) {
      let cov = 0;
      for (let k = 0; k < vectors.length; k++) {
        cov += ((cols[i]![k]! - means[i]!) / stds[i]!) * ((cols[j]![k]! - means[j]!) / stds[j]!);
      }
      cov /= vectors.length;
      pairs.push({ a: featureNames[i]!, b: featureNames[j]!, r: cov });
    }
  }
  pairs.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
  return pairs.slice(0, topK);
}

export async function buildSummaryReport(
  manifest: DatasetManifest,
  outputDir: string,
): Promise<DatasetSummaryReport> {
  const parquetPath = join(outputDir, manifest.files.parquet);
  const vectorsPath = join(outputDir, manifest.files.vectors);
  const manifestPath = join(outputDir, manifest.files.manifest);
  const samplePath = join(outputDir, manifest.files.sample ?? "sample.json");

  const records = await readAllRecordsFromParquet(parquetPath);
  const vectors = records.map((r) => r.vector);

  const [parquetBytes, vectorsBytes, manifestBytes, sampleBytes] = await Promise.all([
    stat(parquetPath).then((s) => s.size).catch(() => 0),
    stat(vectorsPath).then((s) => s.size).catch(() => 0),
    stat(manifestPath).then((s) => s.size).catch(() => 0),
    stat(samplePath).then((s) => s.size).catch(() => 0),
  ]);

  return {
    street: manifest.street,
    seed: manifest.seed,
    mode: manifest.mode,
    count: manifest.count,
    dimension: manifest.dimension,
    generatedAt: manifest.generatedAt,
    featureStats: computeFeatureStats(manifest.featureNames, vectors),
    topCorrelations: topPearsonCorrelations(manifest.featureNames, vectors),
    timing: manifest.timing,
    outputSizes: {
      parquetBytes,
      vectorsBytes,
      manifestBytes,
      sampleBytes,
      totalBytes: parquetBytes + vectorsBytes + manifestBytes + sampleBytes,
    },
  };
}
