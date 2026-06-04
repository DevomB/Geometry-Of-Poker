import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { parsePointsBin, computeBounds } from "@/lib/artifacts/parse-points-bin";
import { parseChannelsBin } from "@/lib/artifacts/parse-channels-bin";
import { parseProjectionIndex } from "@/lib/artifacts/parse-projection-index";
import { createArtifactFixture } from "./fixture-artifacts";

const fixture = createArtifactFixture();
afterAll(() => fixture.cleanup());

const FLOP_BIN = join(fixture.root, "flop", "browser-points.bin");
const FLOP_CHANNELS = join(fixture.root, "flop", "browser-channels.bin");
const FLOP_PROJECTION = join(fixture.root, "flop", "projection-index.bin");

function arrayBuffer(path: string): ArrayBuffer {
  const file = readFileSync(path);
  return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
}

describe("binary artifact loading", () => {
  it("parses GOPK browser-points.bin header and positions", () => {
    const parsed = parsePointsBin(arrayBuffer(FLOP_BIN));

    expect(parsed.version).toBe(1);
    expect(parsed.dim).toBe(3);
    expect(parsed.count).toBe(3);
    expect(parsed.positions.length).toBe(3 * 3);
    expect(Number.isFinite(parsed.positions[0])).toBe(true);
  });

  it("computes finite bounds", () => {
    const parsed = parsePointsBin(arrayBuffer(FLOP_BIN));
    const bounds = computeBounds(parsed.positions, parsed.count);
    expect(bounds.radius).toBeGreaterThan(0);
    expect(bounds.center.every(Number.isFinite)).toBe(true);
  });

  it("parses GOPC browser-channels.bin scalar sidecar", () => {
    const parsed = parseChannelsBin(arrayBuffer(FLOP_CHANNELS));

    expect(parsed.count).toBe(3);
    expect(parsed.channels.equity.length).toBe(3);
    expect(parsed.channels.clusterId.length).toBe(3);
    expect(parsed.channels.categoryIndex.length).toBe(3);
    expect(Number.isFinite(parsed.channels.equity[0])).toBe(true);
  });

  it("parses GOPI projection-index.bin sidecar", () => {
    const parsed = parseProjectionIndex(arrayBuffer(FLOP_PROJECTION));

    expect(parsed.count).toBe(3);
    expect(parsed.pcaDimension).toBe(2);
    expect(parsed.featureCount).toBe(2);
    expect(parsed.retainedFeatures).toEqual(["equityVsRandom", "categoryIndex"]);
    expect(parsed.pcaTrain.length).toBe(6);
    expect(parsed.embeddingTrain.length).toBe(9);
    expect(parsed.labels.length).toBe(3);
  });
});
