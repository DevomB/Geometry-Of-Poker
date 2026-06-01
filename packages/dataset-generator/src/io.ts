import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type {
  DatasetManifest,
  DatasetSummaryReport,
  GenerationProgress,
  GenerationTimingReport,
} from "./types.js";

export async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

export function streetOutputDir(artifactsRoot: string, street: string): string {
  return join(artifactsRoot, "datasets", street);
}

export function shardsDir(outputDir: string): string {
  return join(outputDir, "shards");
}

export async function writeJson(filePath: string, data: unknown): Promise<void> {
  await ensureDir(dirname(filePath));
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export async function readProgress(filePath: string): Promise<GenerationProgress | null> {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as GenerationProgress;
  } catch {
    return null;
  }
}

export async function writeProgress(filePath: string, progress: GenerationProgress): Promise<void> {
  progress.updatedAt = new Date().toISOString();
  await writeJson(filePath, progress);
}

export async function writeManifest(outputDir: string, manifest: DatasetManifest): Promise<string> {
  const path = join(outputDir, "manifest.json");
  await writeJson(path, manifest);
  return path;
}

export async function writeSummaryReport(
  outputDir: string,
  summary: DatasetSummaryReport,
): Promise<string> {
  const path = join(outputDir, "summary-report.json");
  await writeJson(path, summary);
  return path;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function emptyTimingReport(): GenerationTimingReport {
  return {
    totalWallMs: 0,
    totalExtractMs: 0,
    statesPerSecond: 0,
    extractMsPerState: 0,
    peakHeapUsedMb: 0,
    batches: [],
    featureGroups: {
      core: 0,
      board: 0,
      draws: 0,
      removal: 0,
      transitions: 0,
      total: 0,
      samples: 0,
    },
    profileSampleEvery: 0,
  };
}
