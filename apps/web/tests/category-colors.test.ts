import { describe, expect, it } from "vitest";
import { applyColorMode } from "@/lib/colors/color-modes";
import { buildChannels } from "@/lib/artifacts/load-street";
import { CATEGORY_PALETTE } from "@/lib/types";
import type { BrowserPointMeta, StreetDataset } from "@/lib/types";

describe("category coloring with production labels", () => {
  it("maps onePair metadata to pair palette color via channel index", () => {
    const metadata: BrowserPointMeta[] = [
      {
        id: "test-0",
        hero: ["Qh", "Qs"],
        board: ["2c", "7h", "Jh"],
        clusterId: 0,
        category: "onePair",
        equityVsRandom: 0.7,
        x: 0,
        y: 0,
        z: 0,
        summary: {},
      },
    ];
    const channels = buildChannels(metadata, 1);
    expect(channels.categoryIndex[0]).toBe(1);

    const dataset = {
      count: 1,
      channels,
    } as StreetDataset;
    const colors = new Float32Array(3);
    applyColorMode(dataset, "category", colors);
    const expected = CATEGORY_PALETTE.onePair!;
    expect(colors[0]).toBeCloseTo(expected[0], 5);
    expect(colors[1]).toBeCloseTo(expected[1], 5);
    expect(colors[2]).toBeCloseTo(expected[2], 5);
  });
});
