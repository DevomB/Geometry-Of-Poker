# Quant Firm Project Summary — Geometry of Poker

One-page narrative for quantitative finance interviews, research-engineering screens, and portfolio review.

---

## Elevator pitch (30 seconds)

I built an end-to-end pipeline that turns Texas Hold'em poker states into **fixed-dimensional feature vectors** using **exact native combinatorics**, embeds them into **3D with PCA/UMAP**, and explores the result in a **GPU point-cloud viewer**. The architecture mirrors quant workflows: high-performance numerical core → feature engineering → unsupervised manifold learning → interactive inspection with **out-of-sample interpolation** for novel states.

---

## Problem framing

| Aspect | Poker instantiation | Quant analog |
| --- | --- | --- |
| State space | Hero cards + board (combinatorial) | Market / portfolio state |
| Observations | Too many to enumerate postflop | Too many scenarios for brute force |
| Representation | 66-dim engineered feature vector | Factor exposures, Greeks, microstructure stats |
| Compression | PCA + UMAP → 3D | PCA / nonlinear dim reduction for visualization |
| Novel query | Manual hand → kNN projection | New scenario → interpolate in embedding |
| Validation | Trustworthiness, kNN overlap | Stress-neighbor preservation, stability across seeds |

---

## Technical stack

| Layer | Technology | Role |
| --- | --- | --- |
| Numerical core | C++20 (`poker-calculations`) | Exact equity, runouts, removal gradient |
| Binding | Node N-API | Production npm package |
| Feature engine | TypeScript | Orchestration, street masking, schema |
| Batch data | TypeScript dataset generator | Seeded sampling, Parquet, resumable shards |
| ML pipeline | Python (sklearn, umap-learn, hdbscan) | Scale, embed, cluster, evaluate |
| Visualization | Next.js + React Three Fiber | 100k+ GPU points, typed arrays |
| State / UI | Zustand, Tailwind | Research controls, inspector |

---

## Feature engineering highlights

- **66 compact features** (199 extended): equity, made-hand category, board texture, draw counts, vulnerability, removal summaries, transition entropy
- **Exact** where combinatorics allow (equity vs random, runout quantiles)
- **Derived** texture metrics (suit-invariant)
- **Explicit availability flags** — no NaN, fixed schema for Parquet/ML

Dominant compute: **card-removal gradient** ≈ 52× equity solve per state (native C++).

---

## Methodology (defensible claims)

**We claim:**

- Deterministic feature extraction from a documented schema
- Reproducible sampling (seeded) and embedding (recorded UMAP seed)
- Quantitative embedding diagnostics (trustworthiness, kNN overlap)
- Interactive exploration at scale via GPU point clouds

**We do not claim:**

- Clusters = optimal strategy
- UMAP distance = strategic distance
- Uniform-villain equity = game-theoretic EV

See [limitations.md](./limitations.md).

---

## Results (current status)

| Milestone | Status |
| --- | --- |
| Feature engine (66-dim compact) | ✅ Implemented + tested |
| Dataset generator CLI | ✅ Implemented |
| Embedding pipeline | ✅ Per-street PCA/UMAP/HDBSCAN |
| Browser viewer | ✅ Production frontend |
| Real 25k/street datasets | ⏳ Blocked on native prebuild (platform) |
| Demo embeddings | ✅ Synthetic validation only |

**Embedding quality:** trustworthiness, kNN overlap, and seed sensitivity are reported per real artifact release.

---

## Performance snapshot

| Stage | Order of magnitude |
| --- | --- |
| GOPK binary parse (2.5k pts) | <0.01 ms |
| Metadata JSON parse (2.5k pts) | ~14 ms |
| Feature extraction (flop) | ~5–30 states/sec (est., native) |
| UMAP embed | Release-size dependent |
| Render (2.5k points) | ~60 fps |

Full tables: [performance-analysis.md](./performance-analysis.md)

---

## Interview talking points

1. **Performance boundary:** Identified removal gradient as 52× equity bottleneck; native C++ is the right layer.
2. **Schema discipline:** Fixed-width vectors with availability flags — ML-ready, no missing values.
3. **Honest visualization:** Separated exact outputs, engineered features, embedding artifacts, and human observations.
4. **Out-of-sample:** kNN interpolation with confidence (neighbor distances) when nonlinear transform unstable.
5. **Scale path:** Binary metadata index, worker pool generation, LOD rendering — documented before needed.
6. **Cross-language contracts:** Parquet + joblib + GOPK bin + JSON manifest versioning.

---

## Demo flow (2 minutes live)

1. Open viewer → flop → equity colormap
2. Click point → inspector features + neighbors
3. Card picker → project hand → marker + camera fly-to
4. Show About Research disclaimers

---

## Artifacts to share

| Artifact | Location |
| --- | --- |
| Local presentation | `pnpm dev` → localhost:3000 |
| Methodology | `docs/research-methodology.md` |
| Performance | `docs/performance-analysis.md` |
| C++Con outline | `docs/cppcon-talk-outline.md` |
| Source | `visualizer/` monorepo |

---

## Future work (credible extensions)

- Range-conditioned equity features (villain JSON range)
- Extended 199-dim embedding ablation on real data
- WASM or batch C++ API for removal gradient
- Supervised probing of clusters (predict equity decile from cluster id)
- Tile streaming for 1M+ browser points

---

## Summary sentence for resume

*Built a cross-language (C++/TypeScript/Python) pipeline embedding 66-dimensional exact poker feature vectors into interactive 3D manifolds with GPU-accelerated exploration and kNN-based out-of-sample projection — designed for reproducible research visualization, not strategy claims.*
