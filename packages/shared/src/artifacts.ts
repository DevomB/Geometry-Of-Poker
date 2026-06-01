import type { ViewerArtifacts } from "./types.js";
import { FEATURE_SCHEMA_VERSION } from "./feature-schema.js";

/** Relative paths under the artifacts/ directory. */
export const ARTIFACT_PATHS = {
  datasets: "artifacts/datasets",
  models: "artifacts/models",
  embeddings: "artifacts/embeddings",
  pointCloud: "artifacts/embeddings/point-cloud.bin",
  metadata: "artifacts/embeddings/metadata.json",
  scaler: "artifacts/models/scaler.joblib",
  umap: "artifacts/models/umap.joblib",
  clusters: "artifacts/embeddings/clusters.json",
} as const;

/** Placeholder manifest — replaced after first pipeline run. */
export const DEFAULT_VIEWER_ARTIFACTS: ViewerArtifacts = {
  version: "0.0.0-placeholder",
  generatedAt: "1970-01-01T00:00:00.000Z",
  featureSchemaVersion: FEATURE_SCHEMA_VERSION,
  scaler: {
    version: "0.0.0-placeholder",
    featureNames: [],
    mean: [],
    scale: [],
  },
  pointCloudPath: ARTIFACT_PATHS.pointCloud,
  metadataPath: ARTIFACT_PATHS.metadata,
  projectionModelPath: ARTIFACT_PATHS.umap,
  clusterSummaryPath: ARTIFACT_PATHS.clusters,
};
