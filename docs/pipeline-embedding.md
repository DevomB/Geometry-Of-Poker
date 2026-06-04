# Embedding Pipeline

Per-street manifold learning: StandardScaler -> PCA (95% variance) -> UMAP (3D) -> HDBSCAN.

## Setup

```bash
cd visualizer/pipeline
python -m pip install -r requirements.txt
```

## CLI

Production embedding runs belong in the AWS release worker. Run these commands locally only for tiny smoke datasets.

From `visualizer/pipeline/`:

```bash
# Single street (real dataset)
python -m embed.run --street flop --input ../artifacts/datasets/flop/records.parquet

# All streets; production runs should happen on AWS Batch
python -m embed.run --all
```

From repo root:

```bash
pnpm pipeline:embed
```

## Output per street

`artifacts/embeddings/{street}/`:

| File | Purpose |
| --- | --- |
| `scaler.joblib` | StandardScaler |
| `pca.joblib` | PCA model |
| `umap.joblib` | UMAP model |
| `hdbscan.joblib` | HDBSCAN clusterer |
| `projection-index.bin` | Server-readable scaler/PCA/kNN projection sidecar |
| `retained-features.json` | Feature order after constant removal |
| `embedding.parquet` | Full embedded records |
| `browser-points.bin` | Float32 XYZ (GOPK header) |
| `browser-metadata.json` | Point metadata for viewer |
| `analysis-report.md` | Research analysis |

## Manual projection

The web API consumes `projection-index.bin`:

1. Align extracted compact features to retained feature order.
2. Apply saved StandardScaler parameters.
3. Apply saved PCA parameters.
4. Run bounded kNN interpolation against saved PCA training vectors.
5. Return projected XYZ, nearest neighbor ids, distances, and cluster plurality.

## Experiments

Each run compares:

- `compact` - full 66-dim vector
- `extended` - if extended columns exist in parquet
- `compact_no_board` - without board texture features
- `compact_no_removal` - without removal gradient summaries

Plus UMAP seed stability (seeds 42, 43, 44).

## Real data requirement

The embedding pipeline requires real feature-engine parquet input. Missing input files are treated as errors so invalid artifacts cannot be published accidentally.
