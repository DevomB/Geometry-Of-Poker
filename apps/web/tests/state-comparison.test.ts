import { describe, expect, it } from "vitest";
import { compareManualToPoint } from "@/lib/inspector/state-comparison";
import type { BrowserPointMeta, ManualMarker } from "@/lib/types";

const point: BrowserPointMeta = {
  id: "p0",
  hero: ["As", "Kd"],
  board: ["2c", "7h", "Jh"],
  clusterId: 3,
  category: "highCard",
  equityVsRandom: 0.42,
  x: 0,
  y: 0,
  z: 0,
  summary: { equityVsRandom: 0.42 },
};

const marker: ManualMarker = {
  id: "manual",
  hero: ["Kd", "As"],
  board: ["Jh", "7h", "2c"],
  position: [0, 0, 0],
  method: "exact-match",
  neighborIds: ["other", "p0"],
  neighborDistances: [0.5, 0.75],
  clusterId: 3,
  features: {
    category: "highCard",
    equityVsRandom: 0.4,
  },
};

describe("manual state comparison", () => {
  it("compares a selected manifold point to the active manual marker", () => {
    const comparison = compareManualToPoint(marker, point);
    expect(comparison.equityDelta).toBeCloseTo(0.02);
    expect(comparison.categoryMatch).toBe(true);
    expect(comparison.clusterMatch).toBe(true);
    expect(comparison.neighborRank).toBe(2);
    expect(comparison.neighborDistance).toBe(0.75);
    expect(comparison.sharedCards).toBe(5);
    expect(comparison.totalManualCards).toBe(5);
  });

  it("reports unknown matches when manual metrics are unavailable", () => {
    const comparison = compareManualToPoint(
      {
        ...marker,
        clusterId: null,
        features: {},
      },
      point,
    );
    expect(comparison.equityDelta).toBeNull();
    expect(comparison.categoryMatch).toBeNull();
    expect(comparison.clusterMatch).toBeNull();
  });
});
