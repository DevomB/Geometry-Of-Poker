import type { PointCloudBuffers, ViewerArtifacts } from "@geometry-of-poker/shared";
import {
  createPointCloudBuffers,
  parsePointsBin,
} from "@/lib/artifacts/parse-points-bin";
export { parsePointsBin, createPointCloudBuffers, computeBounds } from "@/lib/artifacts/parse-points-bin";
export {
  loadStreetDataset,
  loadStreetDatasetProgressive,
  fetchStreetManifest,
  fetchPointsBin,
  fetchBrowserMetadata,
} from "@/lib/artifacts/load-street";

export interface LoadedArtifacts {
  manifest: ViewerArtifacts;
  pointCloud: PointCloudBuffers;
}

/** @deprecated Use loadStreetDataset from ./load-street */
export async function loadViewerArtifacts(): Promise<LoadedArtifacts> {
  throw new Error("Use loadStreetDataset(street) instead.");
}

/** @deprecated Use parsePointsBin */
export function parsePointCloudBuffer(buffer: ArrayBuffer, pointCount: number): PointCloudBuffers {
  const parsed = parsePointsBin(buffer);
  if (parsed.count !== pointCount) {
    throw new Error(`Point count mismatch: header=${parsed.count}, expected=${pointCount}`);
  }
  return createPointCloudBuffers(parsed.positions, parsed.count);
}
