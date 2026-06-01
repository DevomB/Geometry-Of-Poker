import { createRequire } from "node:module";
import type { DatasetRecord } from "../types.js";

const require = createRequire(import.meta.url);
const parquet = require("parquetjs") as typeof import("parquetjs");

const META_COLUMNS = new Set([
  "id",
  "hero0",
  "hero1",
  "board_json",
  "street",
  "category",
  "category_index",
  "equity_vs_random",
]);

function schemaColumnNames(reader: Awaited<ReturnType<typeof parquet.ParquetReader.openFile>>): string[] {
  const schema = reader.getSchema();
  const fields = schema.fields as Record<string, unknown>;
  return Object.keys(fields);
}

function parquetRowToRecord(row: Record<string, unknown>, columns: string[]): DatasetRecord {
  const featureCols = columns.filter((c) => !META_COLUMNS.has(c));
  const vector = featureCols.map((c) => Number(row[c] ?? 0));
  return {
    id: String(row.id),
    hero: [String(row.hero0), String(row.hero1)],
    board: JSON.parse(String(row.board_json)) as string[],
    street: String(row.street) as DatasetRecord["street"],
    vector,
    metadata: {
      category: String(row.category),
      categoryIndex: Number(row.category_index),
      equityVsRandom: Number(row.equity_vs_random),
    },
  };
}

export async function readSampleFromParquet(
  filePath: string,
  limit: number,
): Promise<DatasetRecord[]> {
  const reader = await parquet.ParquetReader.openFile(filePath);
  try {
    const cursor = reader.getCursor();
    const columns = schemaColumnNames(reader);
    const records: DatasetRecord[] = [];
    let row: Record<string, unknown> | null;
    while ((row = (await cursor.next()) as Record<string, unknown> | null) && records.length < limit) {
      records.push(parquetRowToRecord(row, columns));
    }
    return records;
  } finally {
    await reader.close();
  }
}

export async function readAllRecordsFromParquet(filePath: string): Promise<DatasetRecord[]> {
  const reader = await parquet.ParquetReader.openFile(filePath);
  try {
    const cursor = reader.getCursor();
    const columns = schemaColumnNames(reader);
    const records: DatasetRecord[] = [];
    let row: Record<string, unknown> | null;
    while ((row = (await cursor.next()) as Record<string, unknown> | null)) {
      records.push(parquetRowToRecord(row, columns));
    }
    return records;
  } finally {
    await reader.close();
  }
}
