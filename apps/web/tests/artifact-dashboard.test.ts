import { describe, expect, it } from "vitest";
import {
  formatMaybePercent,
  releaseReadiness,
  summarizeArtifactStreet,
} from "@/lib/release/artifact-dashboard";
import type { StreetManifest } from "@/lib/types";

function manifest(patch: Partial<StreetManifest> = {}): StreetManifest {
  return {
    version: "1.0.0",
    street: "flop",
    pointCount: 25000,
    embeddingMethod: "StandardScaler -> PCA -> UMAP -> HDBSCAN",
    retainedFeatures: ["equityVsRandom"],
    retainedDimension: 42,
    originalDimension: 66,
    pcaDimensions: 16,
    pcaVariance: 0.96,
    trustworthiness: 0.93,
    knnOverlap: 0.41,
    hdbscan: { clusters: 7, noiseFraction: 0.08 },
    categories: ["highCard"],
    clusters: [],
    artifacts: {
      pointsBin: "/points.bin",
      channelsBin: "/channels.bin",
      metadataJson: "/metadata.json",
      projectionIndexBin: "/projection-index.bin",
    },
    ...patch,
  };
}

describe("artifact dashboard summaries", () => {
  it("summarizes ready manifests", () => {
    const summary = summarizeArtifactStreet("flop", manifest());

    expect(summary.available).toBe(true);
    expect(summary.readiness).toBe("ready");
    expect(summary.hasChannels).toBe(true);
    expect(summary.hasProjectionIndex).toBe(true);
    expect(summary.artifactCount).toBe(4);
    expect(summary.trustworthiness).toBe(0.93);
  });

  it("marks manifests without projection index as partial", () => {
    const summary = summarizeArtifactStreet(
      "turn",
      manifest({
        street: "turn",
        artifacts: {
          pointsBin: "/points.bin",
          metadataJson: "/metadata.json",
        },
      }),
    );

    expect(summary.readiness).toBe("partial");
    expect(summary.hasProjectionIndex).toBe(false);
    expect(summary.hasChannels).toBe(false);
  });

  it("summarizes missing streets and aggregate readiness", () => {
    const streets = [
      summarizeArtifactStreet("preflop", manifest({ street: "preflop" })),
      summarizeArtifactStreet("river", null),
    ];
    const readiness = releaseReadiness(streets);

    expect(streets[1]?.readiness).toBe("missing");
    expect(readiness.ready).toBe(1);
    expect(readiness.missing).toBe(1);
    expect(readiness.complete).toBe(false);
  });

  it("formats nullable percentages", () => {
    expect(formatMaybePercent(0.932)).toBe("93.2%");
    expect(formatMaybePercent(null)).toBe("-");
  });
});
