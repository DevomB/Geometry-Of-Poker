import { describe, expect, it } from "vitest";
import {
  computeStreetAtlas,
  formatAtlasValue,
  quantile,
} from "@/lib/atlas/street-atlas";
import type { StreetDataset } from "@/lib/types";

function dataset(): StreetDataset {
  const metadata = [
    {
      id: "p0",
      hero: ["As", "Kd"] as [string, string],
      board: ["2c", "7h", "Jh"],
      clusterId: 0,
      category: "highCard",
      equityVsRandom: 0.1,
      x: 0,
      y: 0,
      z: 0,
      summary: {},
    },
    {
      id: "p1",
      hero: ["Qh", "Qs"] as [string, string],
      board: ["2c", "7h", "Jh"],
      clusterId: 1,
      category: "pair",
      equityVsRandom: 0.5,
      x: 1,
      y: 0,
      z: 0,
      summary: {},
    },
    {
      id: "p2",
      hero: ["9c", "8c"] as [string, string],
      board: ["2c", "7h", "Jh"],
      clusterId: 0,
      category: "highCard",
      equityVsRandom: 0.9,
      x: 2,
      y: 0,
      z: 0,
      summary: {},
    },
  ];

  return {
    street: "flop",
    manifest: {
      version: "test",
      street: "flop",
      pointCount: metadata.length,
      embeddingMethod: "test",
      retainedFeatures: [],
      retainedDimension: 0,
      originalDimension: 0,
      categories: ["highCard", "pair"],
      clusters: [],
      artifacts: { pointsBin: "", metadataJson: "" },
    },
    positions: new Float32Array(metadata.length * 3),
    baseColors: new Float32Array(metadata.length * 3),
    baseSizes: new Float32Array(metadata.length),
    colors: new Float32Array(metadata.length * 3),
    sizes: new Float32Array(metadata.length),
    visible: new Uint8Array(metadata.length),
    count: metadata.length,
    metadata,
    channels: {
      equity: new Float32Array([0.1, 0.5, 0.9]),
      clusterId: new Int16Array([0, 1, 0]),
      categoryIndex: new Uint8Array([0, 1, 0]),
      pNuts: new Float32Array([0.01, 0.2, 0.4]),
      equityVariance: new Float32Array([0, 0, 0]),
      boardConnectivity: new Float32Array([0.2, 0.6, 1]),
      boardRainbow: new Uint8Array(metadata.length),
      boardTwoTone: new Uint8Array(metadata.length),
      boardMonotone: new Uint8Array(metadata.length),
      boardPairedness: new Float32Array(metadata.length),
    },
    idToIndex: new Map(metadata.map((point, i) => [point.id, i])),
  };
}

describe("street atlas", () => {
  it("computes interpolated quantiles", () => {
    expect(quantile([0, 10], 0.25)).toBeCloseTo(2.5);
    expect(quantile([0, 10, 20], 0.5)).toBe(10);
  });

  it("summarizes street metrics and sorted slices", () => {
    const atlas = computeStreetAtlas(dataset());
    const equity = atlas.metrics.find((metric) => metric.id === "equity");

    expect(equity?.median).toBeCloseTo(0.5);
    expect(atlas.metrics.some((metric) => metric.id === "equityVariance")).toBe(false);
    expect(atlas.categories[0]).toMatchObject({ id: "highCard", count: 2 });
    expect(atlas.clusters[0]).toMatchObject({ id: "0", label: "C0", count: 2 });
  });

  it("formats atlas values by metric type", () => {
    expect(formatAtlasValue(0.424, "percent")).toBe("42.4%");
    expect(formatAtlasValue(0.424, "decimal")).toBe("0.424");
  });
});
