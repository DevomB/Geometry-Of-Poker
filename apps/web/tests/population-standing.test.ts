import { describe, expect, it } from "vitest";
import {
  computePopulationStanding,
  formatPercentile,
  percentileRank,
} from "@/lib/inspector/population-standing";
import type { StreetDataset } from "@/lib/types";

function fixtureDataset(): StreetDataset {
  const metadata = [
    {
      id: "p0",
      hero: ["As", "Kd"] as [string, string],
      board: ["2c", "7h", "Jh"],
      clusterId: 0,
      category: "highCard",
      equityVsRandom: 0.42,
      x: 0,
      y: 0,
      z: 0,
      summary: { pNuts: 0.1, equityVariance: 0.02 },
    },
    {
      id: "p1",
      hero: ["Qh", "Qs"] as [string, string],
      board: ["2c", "7h", "Jh"],
      clusterId: 1,
      category: "pair",
      equityVsRandom: 0.74,
      x: 1,
      y: 0,
      z: 0,
      summary: { pNuts: 0.3, equityVariance: 0.04 },
    },
    {
      id: "p2",
      hero: ["9c", "8c"] as [string, string],
      board: ["2c", "7h", "Jh"],
      clusterId: 0,
      category: "highCard",
      equityVsRandom: 0.36,
      x: 2,
      y: 0,
      z: 0,
      summary: { pNuts: 0.05, equityVariance: 0.01 },
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
      equity: new Float32Array([0.42, 0.74, 0.36]),
      clusterId: new Int16Array([0, 1, 0]),
      categoryIndex: new Uint8Array([0, 1, 0]),
      pNuts: new Float32Array([0.1, 0.3, 0.05]),
      equityVariance: new Float32Array([0.02, 0.04, 0.01]),
      boardConnectivity: new Float32Array([0.5, 0.8, 0.2]),
      boardRainbow: new Uint8Array(metadata.length),
      boardTwoTone: new Uint8Array(metadata.length),
      boardMonotone: new Uint8Array(metadata.length),
      boardPairedness: new Float32Array(metadata.length),
    },
    idToIndex: new Map(metadata.map((p, i) => [p.id, i])),
  };
}

describe("population standing", () => {
  it("computes mid-rank percentiles", () => {
    expect(percentileRank([1, 2, 3], 1)).toBeCloseTo(0.5);
    expect(percentileRank([1, 2, 2, 3], 1)).toBeCloseTo(0.5);
    expect(percentileRank([1, Number.NaN, 3], 2)).toBeCloseTo(0.75);
  });

  it("summarizes selected-state standing against the street sample", () => {
    const standing = computePopulationStanding(fixtureDataset(), 1);

    expect(standing?.streetCount).toBe(3);
    expect(standing?.category.count).toBe(1);
    expect(standing?.cluster.label).toBe("C1");
    expect(standing?.metrics.find((m) => m.id === "equity")?.percentile).toBeCloseTo(5 / 6);
  });

  it("formats percentile labels", () => {
    expect(formatPercentile(0.01)).toBe("1st");
    expect(formatPercentile(0.22)).toBe("22nd");
    expect(formatPercentile(0.93)).toBe("93rd");
    expect(formatPercentile(1)).toBe("100th");
  });
});
