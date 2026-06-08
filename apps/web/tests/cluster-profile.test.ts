import { describe, expect, it } from "vitest";
import {
  computeClusterProfile,
  formatDelta,
  mean,
} from "@/lib/inspector/cluster-profile";
import type { StreetDataset } from "@/lib/types";

function fixtureDataset(): StreetDataset {
  const metadata = [
    {
      id: "p0",
      hero: ["As", "Kd"] as [string, string],
      board: ["2c", "7h", "Jh"],
      clusterId: 0,
      category: "highCard",
      equityVsRandom: 0.2,
      x: 0,
      y: 0,
      z: 0,
      summary: {},
    },
    {
      id: "p1",
      hero: ["Qh", "Qs"] as [string, string],
      board: ["2c", "7h", "Jh"],
      clusterId: 0,
      category: "pair",
      equityVsRandom: 0.6,
      x: 1,
      y: 0,
      z: 0,
      summary: {},
    },
    {
      id: "p2",
      hero: ["9c", "8c"] as [string, string],
      board: ["2c", "7h", "Jh"],
      clusterId: 1,
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
      equity: new Float32Array([0.2, 0.6, 0.9]),
      clusterId: new Int16Array([0, 0, 1]),
      categoryIndex: new Uint8Array([0, 1, 0]),
      pNuts: new Float32Array([0.01, 0.1, 0.4]),
      equityVariance: new Float32Array([0.03, 0.05, 0.2]),
      boardConnectivity: new Float32Array([0, 0, 0]),
      boardRainbow: new Uint8Array(metadata.length),
      boardTwoTone: new Uint8Array(metadata.length),
      boardMonotone: new Uint8Array(metadata.length),
      boardPairedness: new Float32Array(metadata.length),
    },
    idToIndex: new Map(metadata.map((p, i) => [p.id, i])),
  };
}

describe("cluster profile", () => {
  it("computes means over all values or indexed cohorts", () => {
    expect(mean([1, 2, 3])).toBe(2);
    expect(mean([1, 2, 3], [0, 2])).toBe(2);
    expect(mean([Number.NaN])).toBeNull();
  });

  it("profiles the selected point cluster against street means", () => {
    const profile = computeClusterProfile(fixtureDataset(), 1);
    const equity = profile?.metrics.find((metric) => metric.id === "equity");

    expect(profile?.label).toBe("C0");
    expect(profile?.count).toBe(2);
    expect(profile?.share).toBeCloseTo(2 / 3);
    expect(equity?.clusterMean).toBeCloseTo(0.4);
    expect(equity?.streetMean).toBeCloseTo((0.2 + 0.6 + 0.9) / 3);
    expect(profile?.categories.map((category) => category.label).sort()).toEqual([
      "highCard",
      "pair",
    ]);
  });

  it("formats metric deltas", () => {
    expect(formatDelta(0.034, "decimal")).toBe("+0.034");
    expect(formatDelta(-0.02, "percent")).toBe("-2.0 pp");
  });
});
