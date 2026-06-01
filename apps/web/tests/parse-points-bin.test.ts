import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parsePointsBin, computeBounds } from "@/lib/artifacts/parse-points-bin";
import { parseChannelsBin } from "@/lib/artifacts/parse-channels-bin";

const FLOP_BIN = join(process.cwd(), "public/artifacts/embeddings/flop/browser-points.bin");
const FLOP_CHANNELS = join(process.cwd(), "public/artifacts/embeddings/flop/browser-channels.bin");

describe("binary artifact loading", () => {
  it("parses GOPK browser-points.bin header and positions", () => {
    const file = readFileSync(FLOP_BIN);
    const ab = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
    const parsed = parsePointsBin(ab as ArrayBuffer);

    expect(parsed.version).toBe(1);
    expect(parsed.dim).toBe(3);
    expect(parsed.count).toBe(2500);
    expect(parsed.positions.length).toBe(2500 * 3);
    expect(Number.isFinite(parsed.positions[0])).toBe(true);
  });

  it("computes finite bounds", () => {
    const file = readFileSync(FLOP_BIN);
    const ab = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
    const parsed = parsePointsBin(ab as ArrayBuffer);
    const bounds = computeBounds(parsed.positions, parsed.count);
    expect(bounds.radius).toBeGreaterThan(0);
    expect(bounds.center.every(Number.isFinite)).toBe(true);
  });

  it("parses GOPC browser-channels.bin scalar sidecar", () => {
    const file = readFileSync(FLOP_CHANNELS);
    const ab = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
    const parsed = parseChannelsBin(ab as ArrayBuffer);

    expect(parsed.count).toBe(2500);
    expect(parsed.channels.equity.length).toBe(2500);
    expect(parsed.channels.clusterId.length).toBe(2500);
    expect(parsed.channels.categoryIndex.length).toBe(2500);
    expect(Number.isFinite(parsed.channels.equity[0])).toBe(true);
  });
});
