import { readdir } from "node:fs/promises";
import { join } from "node:path";
import type { DatasetRecord } from "../types.js";
import { readAllRecordsFromParquet } from "../readers/parquet-reader.js";
import { writeRecordsParquet } from "./parquet-writer.js";

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
