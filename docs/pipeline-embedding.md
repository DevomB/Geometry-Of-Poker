# Embedding Pipeline

Per-street manifold learning: StandardScaler → PCA (95% variance) → UMAP (3D) → HDBSCAN.

## Setup

```bash
cd visualizer/pipeline
python -m pip install -r requirements.txt
```

## CLI

From `visualizer/pipeline/`:

```bash
# Single street (real dataset)
python -m embed.run --street flop --input ../artifacts/datasets/flop/records.parquet

# All streets
python -m embed.run --all

# Demo mode (synthetic data — pipeline smoke test only)
python -m embed.run --all --demo --seed 42
```

From repo root:

```bash
pnpm pipeline:embed
pnpm pipeline:embed:demo
```

## Output per street

`artifacts/embeddings/{street}/`:

| File | Purpose |
| --- | --- |
| `scaler.joblib` | StandardScaler |
| `pca.joblib` | PCA model |
| `umap.joblib` | UMAP model |
| `hdbscan.joblib` | HDBSCAN clusterer |
| `projection_bundle.joblib` | Scaler + PCA + UMAP + kNN fallback |
| `retained-features.json` | Feature order after constant removal |
| `embedding.parquet` | Full embedded records |
| `browser-points.bin` | Float32 XYZ (GOPK header) |
| `browser-metadata.json` | Point metadata for viewer |
| `analysis-report.md` | Research analysis |

## Manual projection

```bash
python scripts/test_manual_projection.py --street flop
```

Uses `projection_bundle.joblib`:
1. Scale → PCA
2. UMAP `.transform()` when valid
3. Fallback: kNN interpolation in PCA space

## Experiments

Each run compares:

- `compact` — full 66-dim vector
- `extended` — if extended columns exist in parquet
- `compact_no_board` — without board texture features
- `compact_no_removal` — without removal gradient summaries

Plus UMAP seed stability (seeds 42, 43, 44).

## Real vs demo data

`--demo` generates random Gaussian features — useful for pipeline validation only. Strategic cluster structure requires real feature-engine datasets from `pnpm generate`.
