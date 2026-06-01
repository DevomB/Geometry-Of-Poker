import { createRequire } from "node:module";
import type { DatasetRecord } from "../types.js";

const require = createRequire(import.meta.url);
const parquet = require("parquetjs") as typeof import("parquetjs");

function buildSchema(featureNames: readonly string[]) {
  const fields: Record<string, { type: string; optional?: boolean }> = {
    id: { type: "UTF8" },
    hero0: { type: "UTF8" },
    hero1: { type: "UTF8" },
    board_json: { type: "UTF8" },
    street: { type: "UTF8" },
    category: { type: "UTF8" },
    category_index: { type: "INT32" },
    equity_vs_random: { type: "DOUBLE" },
  };
  for (const name of featureNames) {
    fields[sanitizeColumn(name)] = { type: "DOUBLE" };
  }
  return new parquet.ParquetSchema(fields);
}

function sanitizeColumn(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, "_");
}

export function recordToParquetRow(record: DatasetRecord, featureNames: readonly string[]) {
  const row: Record<string, string | number> = {
    id: record.id,
    hero0: record.hero[0],
    hero1: record.hero[1],
    board_json: JSON.stringify(record.board),
    street: record.street,
    category: record.metadata.category,
    category_index: record.metadata.categoryIndex,
    equity_vs_random: record.metadata.equityVsRandom,
  };
  for (let i = 0; i < featureNames.length; i++) {
    row[sanitizeColumn(featureNames[i]!)] = record.vector[i] ?? 0;
  }
  return row;
}

export async function writeRecordsParquet(
  filePath: string,
  records: DatasetRecord[],
  featureNames: readonly string[],
): Promise<void> {
  const schema = buildSchema(featureNames);
  const writer = await parquet.ParquetWriter.openFile(schema, filePath);
  try {
    for (const record of records) {
      await writer.appendRow(recordToParquetRow(record, featureNames));
    }
  } finally {
    await writer.close();
  }
}

export async function appendRecordsParquet(
  filePath: string,
  records: DatasetRecord[],
  featureNames: readonly string[],
  create: boolean,
): Promise<void> {
  if (create) {
    await writeRecordsParquet(filePath, records, featureNames);
    return;
  }
  const schema = buildSchema(featureNames);
  const writer = await parquet.ParquetWriter.openFile(schema, filePath, { append: true } as never);
  try {
    for (const record of records) {
      await writer.appendRow(recordToParquetRow(record, featureNames));
    }
  } finally {
    await writer.close();
  }
}

export { sanitizeColumn };
