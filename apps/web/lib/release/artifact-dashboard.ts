import type { Street } from "@geometry-of-poker/shared";
import type { StreetManifest } from "@/lib/types";

export interface ArtifactStreetDashboard {
  street: Street;
  available: boolean;
  version: string | null;
  pointCount: number | null;
  embeddingMethod: string | null;
  retainedDimension: number | null;
  originalDimension: number | null;
  pcaDimensions: number | null;
  pcaVariance: number | null;
  trustworthiness: number | null;
  knnOverlap: number | null;
  clusters: number | null;
  noiseFraction: number | null;
  hasChannels: boolean;
  hasProjectionIndex: boolean;
  artifactCount: number;
  readiness: "ready" | "partial" | "missing";
}

export function summarizeArtifactStreet(
  street: Street,
  manifest: StreetManifest | null,
): ArtifactStreetDashboard {
  if (!manifest) {
    return {
      street,
      available: false,
      version: null,
      pointCount: null,
      embeddingMethod: null,
      retainedDimension: null,
      originalDimension: null,
      pcaDimensions: null,
      pcaVariance: null,
      trustworthiness: null,
      knnOverlap: null,
      clusters: null,
      noiseFraction: null,
      hasChannels: false,
      hasProjectionIndex: false,
      artifactCount: 0,
      readiness: "missing",
    };
  }

  const artifactValues = Object.values(manifest.artifacts).filter(Boolean);
  const hasProjectionIndex = Boolean(manifest.artifacts.projectionIndexBin);
  const hasChannels = Boolean(manifest.artifacts.channelsBin);
  const readiness = hasProjectionIndex && manifest.pointCount > 0 ? "ready" : "partial";

  return {
    street,
    available: true,
    version: manifest.version,
    pointCount: manifest.pointCount,
    embeddingMethod: manifest.embeddingMethod,
    retainedDimension: manifest.retainedDimension,
    originalDimension: manifest.originalDimension,
    pcaDimensions: manifest.pcaDimensions ?? null,
    pcaVariance: manifest.pcaVariance ?? null,
    trustworthiness: manifest.trustworthiness ?? null,
    knnOverlap: manifest.knnOverlap ?? null,
    clusters: manifest.hdbscan?.clusters ?? null,
    noiseFraction: manifest.hdbscan?.noiseFraction ?? null,
    hasChannels,
    hasProjectionIndex,
    artifactCount: artifactValues.length,
    readiness,
  };
}

export function releaseReadiness(streets: ArtifactStreetDashboard[]) {
  const available = streets.filter((street) => street.available).length;
  const ready = streets.filter((street) => street.readiness === "ready").length;
  const partial = streets.filter((street) => street.readiness === "partial").length;
  const missing = streets.filter((street) => street.readiness === "missing").length;
  return {
    available,
    ready,
    partial,
    missing,
    complete: streets.length > 0 && ready === streets.length,
  };
}

export function formatMaybePercent(value: number | null, digits = 1): string {
  return value === null ? "-" : `${(value * 100).toFixed(digits)}%`;
}
