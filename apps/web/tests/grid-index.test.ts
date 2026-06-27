import { describe, expect, it } from "vitest";
import { GridSpatialIndex, nearestPointToRay } from "@/lib/spatial/grid-index";

describe("GridSpatialIndex", () => {
  it("continues past the query cell when a neighboring cell can be closer", () => {
    const index = new GridSpatialIndex(1);
    index.build(
      new Float32Array([
        0.99, 0, 0,
        -0.01, 0, 0,
      ]),
      2,
    );

    expect(index.nearestK(0.01, 0, 0, 1)).toEqual([
      { index: 1, distance: expect.closeTo(0.02, 6) },
    ]);
  });

  it("returns sorted neighbors while honoring exclusions", () => {
    const index = new GridSpatialIndex(1);
    index.build(
      new Float32Array([
        0, 0, 0,
        0.2, 0, 0,
        0.4, 0, 0,
        2, 0, 0,
      ]),
      4,
    );

    expect(index.nearestK(0, 0, 0, 2, 0)).toEqual([
      { index: 1, distance: expect.closeTo(0.2, 6) },
      { index: 2, distance: expect.closeTo(0.4, 6) },
    ]);
  });

  it("respects nearest max distance", () => {
    const index = new GridSpatialIndex(1);
    index.build(new Float32Array([2, 0, 0]), 1);

    expect(index.nearest(0, 0, 0, 1)).toBe(-1);
    expect(index.nearest(0, 0, 0, 3)).toBe(0);
  });
});

describe("nearestPointToRay", () => {
  it("finds the closest point within the ray threshold", () => {
    const positions = new Float32Array([
      0, 1, 0,
      0, 0.05, 2,
      0, 0.2, 1,
    ]);

    expect(
      nearestPointToRay({
        positions,
        count: 3,
        rayOrigin: [0, 0, 0],
        rayDirection: [0, 0, 1],
        threshold: 0.1,
      }),
    ).toBe(1);
  });
});
