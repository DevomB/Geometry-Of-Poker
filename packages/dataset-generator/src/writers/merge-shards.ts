import { readdir } from "node:fs/promises";
import { join } from "node:path";
import type { DatasetRecord, DatasetSegmentManifest } from "../types.js";
import { readAllRecordsFromParquet, streamRecordsFromParquet } from "../readers/parquet-reader.js";
import { appendBinaryVectors, vectorsToFloat32 } from "./binary-vectors.js";
import { writeRecordsParquet, writeRecordsParquetFromIterable } from "./parquet-writer.js";

export async function mergeParquetShards(
  shardDir: string,
  outputPath: string,
  featureNames: readonly string[],
): Promise<number> {
  const files = (await readdir(shardDir))
    .filter((f) => f.endsWith(".parquet"))
    .sort();

  const allRecords: DatasetRecord[] = [];
  for (const file of files) {
    const chunk = await readAllRecordsFromParquet(join(shardDir, file));
    allRecords.push(...chunk);
  }

  await writeRecordsParquet(outputPath, allRecords, featureNames);
  return allRecords.length;
}

function stateKey(record: DatasetRecord): string {
  return `${record.hero.join(",")}|${record.board.join(",")}`;
}

export async function mergeSegmentParquetShards(
  shardDir: string,
  outputPath: string,
  vectorsPath: string,
  featureNames: readonly string[],
  segments: readonly DatasetSegmentManifest[],
): Promise<number> {
  const seenIds = new Set<string>();
  const seenStates = new Set<string>();
  let vectorsInitialized = false;

  async function* records(): AsyncGenerator<DatasetRecord> {
    for (const segment of segments) {
      let count = 0;
      const chunkRecords: DatasetRecord[] = [];
      for await (const record of streamRecordsFromParquet(join(shardDir, segment.parquetFile))) {
        if (seenIds.has(record.id)) throw new Error(`Duplicate record id during merge: ${record.id}`);
        const key = stateKey(record);
        if (seenStates.has(key)) throw new Error(`Duplicate poker state during merge: ${record.id}`);
        seenIds.add(record.id);
        seenStates.add(key);
        chunkRecords.push(record);
        count += 1;
        yield record;
      }
      if (count !== segment.count) {
        throw new Error(`Segment ${segment.parquetFile} expected ${segment.count} rows, read ${count}.`);
      }
      const chunk = vectorsToFloat32(chunkRecords, featureNames.length);
      await appendBinaryVectors(vectorsPath, chunk, chunkRecords.length, featureNames.length, vectorsInitialized);
      vectorsInitialized = true;
    }
  }

  return writeRecordsParquetFromIterable(outputPath, records(), featureNames);
}
