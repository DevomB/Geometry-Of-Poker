import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parsePointsBin } from "@/lib/artifacts/parse-points-bin";
import { CATEGORY_INDEX } from "@/lib/artifacts/load-street";
import type { BrowserMetadata, StreetManifest } from "@/lib/types";
import { projectIntoGeometry, findExactMatch } from "@/lib/projection/project-point";
import type { StreetDataset } from "@/lib/types";

function loadFlopDataset(): StreetDataset {
  const dir = join(process.cwd(), "public/artifacts/embeddings/flop");
  const manifest = JSON.parse(
    readFileSync(join(dir, "viewer-manifest.json"), "utf8"),
  ) as StreetManifest;
  const metadata = JSON.parse(
    readFileSync(join(dir, "browser-metadata.json"), "utf8"),
  ) as BrowserMetadata;
  const file = readFileSync(join(dir, "browser-points.bin"));
  const ab = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  const parsed = parsePointsBin(ab as ArrayBuffer);
  const count = parsed.count;
  const points = metadata.points;

  const equity = new Float32Array(count);
  const clusterId = new Int16Array(count);
  const categoryIndex = new Uint8Array(count);
  const pNuts = new Float32Array(count);
  const equityVariance = new Float32Array(count);
  const boardConnectivity = new Float32Array(count);
  const boardRainbow = new Uint8Array(count);
  const boardTwoTone = new Uint8Array(count);
  const boardMonotone = new Uint8Array(count);
  const boardPairedness = new Float32Array(count);
  const idToIndex = new Map<string, number>();

  points.forEach((p, i) => {
    idToIndex.set(p.id, i);
    equity[i] = p.equityVsRandom;
    clusterId[i] = p.clusterId;
    categoryIndex[i] = CATEGORY_INDEX[p.category] ?? 0;
    pNuts[i] = p.summary.pNuts ?? 0;
    equityVariance[i] = p.summary.equityVariance ?? 0;
    boardConnectivity[i] = p.summary.boardConnectivityScore ?? 0;
    boardRainbow[i] = (p.summary.boardRainbowFlag ?? 0) > 0.5 ? 1 : 0;
    boardTwoTone[i] = (p.summary.boardTwoToneFlag ?? 0) > 0.5 ? 1 : 0;
    boardMonotone[i] = (p.summary.boardMonotoneFlag ?? 0) > 0.5 ? 1 : 0;
    boardPairedness[i] = p.summary.boardPairednessScore ?? 0;
  });

  return {
    street: "flop",
    manifest,
    positions: parsed.positions,
    colors: new Float32Array(count * 3),
    sizes: new Float32Array(count),
    visible: new Uint8Array(count),
    count,
    metadata: points,
    channels: {
      equity,
      clusterId,
      categoryIndex,
      pNuts,
      equityVariance,
      boardConnectivity,
      boardRainbow,
      boardTwoTone,
      boardMonotone,
      boardPairedness,
    },
    idToIndex,
  };
}

describe("projection", () => {
  it("finds exact match in dataset by cards", () => {
    const dataset = loadFlopDataset();
    const first = dataset.metadata[0]!;
    const idx = findExactMatch(dataset, first.hero, first.board);
    expect(idx).toBe(0);
  });

  it("projects known hand to finite coordinates", () => {
    const dataset = loadFlopDataset();
    const first = dataset.metadata[0]!;
    const result = projectIntoGeometry(dataset, {
      hero: first.hero,
      board: first.board,
    });
    expect(result.method).toBe("exact_match");
    expect(result.position.every(Number.isFinite)).toBe(true);
    expect(result.neighborIds.length).toBeGreaterThan(0);
  });
});
