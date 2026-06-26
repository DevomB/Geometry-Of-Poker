import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  validateContiguousSegments,
  validateSegmentCompatibility,
} from "../src/segments.js";
import type { DatasetSegmentManifest } from "../src/types.js";

function segment(
  startOrdinal: number,
  endOrdinalExclusive: number,
  patch: Partial<DatasetSegmentManifest> = {},
): DatasetSegmentManifest {
  return {
    version: "1.0.0",
    street: "flop",
    seed: 42,
    mode: "compact",
    exactFeatureBudget: "production",
    featureSchemaVersion: "1.0.0",
    startOrdinal,
    endOrdinalExclusive,
    count: endOrdinalExclusive - startOrdinal,
    parquetFile: `flop-${startOrdinal}-${endOrdinalExclusive}.parquet`,
    parquetSha256: "a".repeat(64),
    vectorSha256: "b".repeat(64),
    firstRecordId: `flop-42-${String(startOrdinal).padStart(8, "0")}`,
    lastRecordId: `flop-42-${String(endOrdinalExclusive - 1).padStart(8, "0")}`,
    generatedAt: "2026-06-26T00:00:00.000Z",
    ...patch,
  };
}

describe("dataset segment validation", () => {
  it("accepts contiguous ranges from zero to target count", () => {
    const segments = [segment(0, 20), segment(20, 30)];

    validateSegmentCompatibility(segments, {
      street: "flop",
      seed: 42,
      mode: "compact",
      exactFeatureBudget: "production",
    });
    validateContiguousSegments(segments, 30);
  });

  it("rejects gaps before reading parquet payloads", () => {
    assert.throws(
      () => validateContiguousSegments([segment(0, 20), segment(25, 30)], 30),
      /expected segment to start at 20/,
    );
  });

  it("rejects overlapping ranges before reading parquet payloads", () => {
    assert.throws(
      () => validateContiguousSegments([segment(0, 20), segment(10, 30)], 30),
      /expected segment to start at 20/,
    );
  });

  it("rejects incomplete final coverage before reading parquet payloads", () => {
    assert.throws(
      () => validateContiguousSegments([segment(0, 20)], 30, true),
      /ranges end at 20/,
    );
  });

  it("rejects incompatible source release metadata", () => {
    assert.throws(
      () =>
        validateSegmentCompatibility([segment(0, 20, { seed: 7 })], {
          street: "flop",
          seed: 42,
          mode: "compact",
          exactFeatureBudget: "production",
        }),
      /seed/,
    );
  });
});
