# Performance Analysis - Geometry of Poker

This document maps runtime cost across the Geometry of Poker stack. Numbers should be labeled Measured, Reported from a release artifact, or Estimated from code structure.

Re-run browser and artifact benchmarks:

```bash
cd visualizer
node scripts/benchmark-performance.mjs
node scripts/benchmark-performance.mjs --json > artifacts/benchmarks/latest.json
```

Native feature benchmarks require a working `poker-calculations` prebuild on your platform.

## Runtime Map

| Component | Origin | Runtime | Notes |
| --- | --- | --- | --- |
| Hand evaluation, categories | C++ `poker-calculations` | Native | Rank orders and category labels |
| Exact HU equity vs random | C++ | Native | `exactHuEquityVsRandomHand` |
| Runout quantiles / vulnerability | C++ | Native | Enumeration over incomplete boards |
| Card-removal gradient | C++ | Native | 52 equity solves per state |
| Category joint flop-to-river | C++ | Native | 9x9 joint matrix |
| Feature vector assembly | TypeScript | Node | `@geometry-of-poker/feature-engine` |
| Batch dataset generation | TypeScript | Node | `@geometry-of-poker/dataset-generator` |
| StandardScaler / PCA / UMAP / HDBSCAN | Python | CPython + NumPy/sklearn | `pipeline/embed/` |
| Artifact serialization | Python | Parquet, joblib, GOPK/GOPC/GOPI binaries | |
| GPU point cloud render | WebGL | Browser | Single `BufferGeometry` + shader |
| Manual projection API | TypeScript | Node route | Feature extraction + PCA kNN projection index |

## Feature Extraction Throughput

`profileFeatureGroups()` times each feature group independently and dataset generation records aggregate timing in `manifest.json`.

| Group | Primary native calls | Expected relative cost |
| --- | --- | --- |
| core | equity, category, runout quantiles, vulnerability | Medium-high |
| board | none, TypeScript derived | Low |
| draws | remaining-deck single-card probes | Medium |
| removal | 52 equity solves | Highest in compact mode |
| transitions | 9x9 joint matrix on flop | High on flop, zero otherwise |

Measured throughput in this workspace is unavailable when the native addon fails to load. Treat generated dataset manifests as the source of truth for measured numbers on a given machine.

## Dataset Generation Scale

| Scale | Records | Expected Wall Time | Memory |
| --- | ---: | --- | --- |
| Dev smoke | 1,000 / street | minutes | <500 MB |
| Balanced small | 1,326 preflop + 25,000 / postflop street | hours, flop-limited | ~2 GB |
| Research | 100,000 / street | multi-hour / overnight | 4-8 GB |
| Large | 1,000,000 / street | days | SSD recommended |

## Embedding Runtime

| Step | Scales As | Notes |
| --- | --- | --- |
| StandardScaler | O(N x D) | cheap |
| PCA | O(N x D^2) worst case | D <= 66 compact |
| UMAP fit | O(N log N) approximate | dominates for large N |
| HDBSCAN | O(N log N) typical | optional clustering |
| Projection index write | O(N x PCA_D) | stores PCA training vectors and 3D coordinates |

Reported embedding runtime belongs in each release's `analysis-report.md`.

## Browser Load And Render

The viewer uses:

- One `BufferGeometry`
- Typed `Float32Array` positions/colors/sizes
- Scalar channel sidecar (`browser-channels.bin`) for colors and filters
- Projection sidecar (`projection-index.bin`) for server-side manual hand projection
- LOD slider for density reduction
- Adaptive render quality with a 30 FPS floor target
- Capped device-pixel-ratio for integrated GPUs
- Throttled DOM-pointer hover probing instead of default full point-cloud raycast events
- Partial GPU buffer updates for hover/selection changes

Expected balanced-small behavior is 45-60 FPS on a modern desktop GPU, subject to browser, device, and active filters. The viewer now attempts to keep measured render rate above 30 FPS by lowering point density, device-pixel-ratio, hover probe frequency, and HTML cluster labels when needed. At larger releases, metadata JSON and CPU hover picking remain the first constraints; compact detail sidecars and true GPU picking are the likely next optimizations.

## Optimization Priority

| Priority | Component | Action |
| ---: | --- | --- |
| 1 | Removal gradient | Batch API in C++ or cache equity factors |
| 2 | Metadata JSON | Compact binary index plus lazy detail fetch |
| 3 | Hover picking | GPU picking for larger releases |
| 4 | Dataset generation | Worker pool across CPU cores |
| 5 | UMAP | Subsample fit plus full-set transform where defensible |
| 6 | Projection | Keep `projection-index.bin` compact and parity-tested |

## Reproduce Benchmarks

```bash
node scripts/benchmark-performance.mjs

cd packages/feature-engine && pnpm build
node --input-type=module -e "
  import { profileFeatureGroups } from './dist/profile.js';
  console.log(profileFeatureGroups({ hero:['As','Kd'], board:['Jh','7d','2c'] }, 'compact'));
"

pnpm generate -- --street flop --count 1000 --seed 42

cd pipeline && python -m embed.run --street flop --seed 42
```

Record hardware, Node/Python versions, and `poker-calculations` version with all published numbers.
