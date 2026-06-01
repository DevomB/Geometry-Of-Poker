import { describe, expect, it } from "vitest";
import {
  COLOR_MODE_META,
  describeProjectionMethod,
  rgbCss,
} from "@/lib/visualization-theme";
import { COLOR_MODES } from "@/lib/types";

describe("visualization theme metadata", () => {
  it("has metadata for every registered color mode", () => {
    for (const mode of COLOR_MODES) {
      const meta = COLOR_MODE_META[mode.id];
      expect(meta).toBeDefined();
      expect(meta.label).toBeTruthy();
      expect(meta.description.length).toBeGreaterThan(20);
    }
  });

  it("continuous and diverging modes provide gradient stops", () => {
    for (const mode of Object.values(COLOR_MODE_META)) {
      if (mode.legendKind === "continuous" || mode.legendKind === "diverging") {
        expect(mode.legend.stops.length).toBeGreaterThanOrEqual(3);
        expect(mode.legend.labels[0]).toBeTruthy();
        expect(mode.legend.labels[1]).toBeTruthy();
      }
    }
  });

  it("describes known projection methods in human terms", () => {
    expect(describeProjectionMethod("saved-umap-transform")).toMatch(/UMAP/);
    expect(describeProjectionMethod("pca-knn-interpolation")).toMatch(/PCA/);
    expect(describeProjectionMethod("precomputed-nearest-neighbor")).toMatch(
      /precomputed/i,
    );
    expect(describeProjectionMethod("exact_match")).toMatch(/exact/i);
  });

  it("falls back to the raw method when unknown", () => {
    expect(describeProjectionMethod("future-method")).toBe("future-method");
  });

  it("converts an RGB triplet to an rgb() string", () => {
    expect(rgbCss([1, 0, 0.5])).toBe("rgb(255, 0, 128)");
  });
});
