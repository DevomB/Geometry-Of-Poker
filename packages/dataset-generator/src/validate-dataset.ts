import {
  featureOrderForMode,
  validatePokerStateInput,
} from "@geometry-of-poker/feature-engine";
import { join } from "node:path";
import { normalizeCard } from "./cards.js";
import { readBinaryVectorHeader } from "./writers/binary-vectors.js";
import { readAllRecordsFromParquet } from "./readers/parquet-reader.js";
import {
  resolveStateBatch,
  type PreflopMode,
} from "./sample-state.js";
import type {
  DatasetValidationReport,
  FeatureMode,
  Street,
} from "./types.js";

export interface ValidateDatasetOptions {
  outputDir: string;
  street: Street;
  seed: number;
  mode: FeatureMode;
  featureNames: readonly string[];
  dimension: number;
  count: number;
  preflopMode?: PreflopMode;
}

export async function validateDatasetFromManifest(
  opts: ValidateDatasetOptions,
): Promise<DatasetValidationReport> {
  const errors: string[] = [];
  const parquetPath = join(opts.outputDir, "records.parquet");
  const vectorsPath = join(opts.outputDir, "vectors.f32.bin");

  let records;
  try {
    records = await readAllRecordsFromParquet(parquetPath);
  } catch (e) {
    return {
      valid: false,
      recordCount: 0,
      errors: [`Failed to read parquet: ${(e as Error).message}`],
      checks: {
        legalStates: false,
        finiteVectors: false,
        fixedDimension: false,
        featureNamesMatch: false,
        noDuplicateCards: false,
        reproducibleSample: false,
      },
    };
  }

  if (records.length !== opts.count) {
    errors.push(`Record count mismatch: expected ${opts.count}, got ${records.length}`);
  }

  let legalStates = true;
  let finiteVectors = true;
  let fixedDimension = true;
  let noDuplicateCards = true;

  for (const record of records) {
    try {
      validatePokerStateInput({ hero: record.hero, board: record.board });
    } catch {
      legalStates = false;
      errors.push(`Illegal state: ${record.id}`);
    }

    const cards = [...record.hero, ...record.board].map(normalizeCard);
    if (new Set(cards).size !== cards.length) {
      noDuplicateCards = false;
      errors.push(`Duplicate cards in ${record.id}`);
    }

    if (record.vector.length !== opts.dimension) {
      fixedDimension = false;
      errors.push(`Dimension mismatch in ${record.id}`);
    }

    for (const v of record.vector) {
      if (!Number.isFinite(v)) {
        finiteVectors = false;
        errors.push(`Non-finite value in ${record.id}`);
        break;
      }
    }
  }

  const expectedNames = featureOrderForMode(opts.mode);
  const featureNamesMatch =
    opts.featureNames.length === expectedNames.length &&
    opts.featureNames.every((n, i) => n === expectedNames[i]);

  if (!featureNamesMatch) {
    errors.push("Feature names do not match feature-engine schema order");
  }

  let reproducibleSample = true;
  if (records.length > 0) {
    const first = records[0]!;
    const batch = resolveStateBatch(
      opts.street,
      0,
      Math.max(1, records.length),
      opts.count,
      opts.seed,
      opts.preflopMode ?? (opts.street === "preflop" ? "enumerate1326" : "random"),
    );
    const expected = batch[0];
    if (expected) {
      const heroMatch =
        expected.hero[0] === first.hero[0] && expected.hero[1] === first.hero[1];
      const boardMatch = JSON.stringify(expected.board) === JSON.stringify(first.board);
      reproducibleSample = heroMatch && boardMatch;
      if (!reproducibleSample) {
        errors.push("First record does not match seed-regenerated sample");
      }
    }
  }

  try {
    const header = await readBinaryVectorHeader(vectorsPath);
    if (header.count !== records.length) {
      errors.push(`Binary vector count ${header.count} != parquet ${records.length}`);
    }
    if (header.dimension !== opts.dimension) {
      errors.push(`Binary vector dimension ${header.dimension} != ${opts.dimension}`);
    }
  } catch (e) {
    errors.push(`Binary vector validation failed: ${(e as Error).message}`);
  }

  const checks = {
    legalStates,
    finiteVectors,
    fixedDimension,
    featureNamesMatch,
    noDuplicateCards,
    reproducibleSample,
  };

  return {
    valid: errors.length === 0 && Object.values(checks).every(Boolean),
    recordCount: records.length,
    errors: errors.slice(0, 50),
    checks,
  };
}
