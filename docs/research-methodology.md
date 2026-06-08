# Research Methodology — Geometry of Poker

This document describes how Texas Hold'em states are represented, featurized, embedded, and visualized. It is written for technical review of the poker mathematics and assumes familiarity with basic poker notation.

**Scope:** methodology and reproducibility. Interpretive claims about strategy must be labeled as observations, not theorems.

---

## 1. Research question

> When hero-centric poker states are mapped to a fixed feature vector built from exact combinatorics and engineered summaries, does **unsupervised** dimensionality reduction reveal **coherent low-dimensional structure** that can be explored interactively?

We do **not** presuppose a geometric shape (sphere, simplex, etc.). Structure must emerge from data. We also do **not** claim that clusters correspond to optimal play or that UMAP distance equals strategic distance.

---

## 2. Poker-state definition

A **state** is hero-centric:

| Field | Constraint |
| --- | --- |
| Hero hole cards | Exactly two distinct cards, e.g. `As`, `Kd` |
| Community cards | Length 0 (preflop), 3 (flop), 4 (turn), or 5 (river) |
| Dead cards | Optional known exclusions (default: none) |
| Street | Derived from board length |

Validation (`validatePokerStateInput` / client `validateHandInput`) rejects invalid strings, duplicate cards, hero-on-board collisions, and inconsistent board lengths.

**Canonical card encoding:** rank + suit (`As`, `Td`, `2c`). Full deck: 52 cards.

**State-space cardinality (exact enumeration is infeasible globally):**

| Street | Hero × board combinations (order matters in sampling) |
| --- | --- |
| Preflop | C(52,2) = **1,326** unique hole pairs |
| Flop | ~1.3k × C(50,3) ≈ **2.8×10⁸** |
| Turn | larger |
| River | larger |

The project uses **seeded random sampling** per street rather than full enumeration postflop. See [Dataset sampling](#5-dataset-sampling-strategy).

---

## 3. Feature-vector definition

Primary API:

```typescript
extractGeometryFeatures(state, { mode: "compact" | "extended" })
```

| Mode | Dimensions | Use |
| --- | ---: | --- |
| `compact` | **66** | Default pipeline and viewer |
| `extended` | **199** | Adds 52-dim removal gradient + 81-dim flop category joint matrix |

Feature order is fixed in `packages/feature-engine/src/feature-order.ts`. Schema version: `FEATURE_SCHEMA_VERSION` in `@geometry-of-poker/shared`.

### 3.1 Feature classes

| Class | Meaning | Examples |
| --- | --- | --- |
| **Exact combinatorial** | Deterministic output from `poker-calculations` C++ core | `equityVsRandom`, `categoryIndex`, runout quantiles, vulnerability |
| **Derived (deterministic)** | Computed in TypeScript from board/hero structure without Monte Carlo | Board texture flags, draw counts via single-card enumeration |
| **Heuristic / summary** | Aggregates of exact outputs | `removalGradientMean`, `transitionEntropy` |
| **Meta / availability** | Street gating flags (`*Available`) | Zeros with flag=0 when feature undefined |

Full column definitions: [feature-schema.md](./feature-schema.md).

### 3.2 Street-aware masking

Features that require incomplete boards are **zeroed** with companion `*Available = 0` when not defined:

| Feature group | Available streets |
| --- | --- |
| Runout equity distribution | preflop–flop |
| Runout vulnerability (`pNuts`, `pDominated`) | flop–turn |
| Draw enumeration | flop–turn |
| Board texture | flop–river |
| Category transition matrix | flop only |

This avoids NaN/undefined and keeps Parquet columns fixed-width.

### 3.3 Villain model

Default equity features use **uniform random villain hand** (subject to card removal). Villain range configuration is reserved for future work; the current vector is explicitly **not** GTO-range-conditioned.

---

## 4. Suit-isomorphism decisions

**Problem:** Many strategically similar states differ only by suit relabeling.

**Board texture features** are **suit-invariant by design** (counts, flags, connectivity — not suit labels).

**Blocker-sensitive features** (card-removal gradient, exact equity) depend on **specific suits** and break isomorphism.

**Sampling policy (current):**

| Street | Default mode | Isomorphism handling |
| --- | --- | --- |
| Preflop | `enumerate1326` | Full hole-pair enumeration (suits explicit) |
| Preflop alt | `canonical169` | One representative per suit-canonical hole class (≤169) |
| Postflop | `random` seeded | No deduplication — suits retained for blocker fidelity |

`canonicalStateKey()` in dataset-generator records a suit-canonical key for analysis but **does not dedupe postflop samples by default**.

**Research implication:** Postflop clouds may contain suit-symmetric duplicates; interpret clusters as **feature-space** neighborhoods, not abstract isomorphism classes.

---

## 5. Dataset sampling strategy

CLI: `pnpm generate --street <s> --count N --seed S --mode compact`

| Street | Default count | Strategy |
| --- | ---: | --- |
| preflop | 1,326 | Enumerate all hole pairs |
| flop / turn / river | 25,000 each | Uniform random legal states, seeded PRNG |

Properties:

- **Reproducible:** fixed seed → identical sample order and first record
- **Resumable:** shard batches (`--batch-size`, `--resume`)
- **Validated:** structural checks, finite vectors, dimension match, no duplicate cards per state
- **Separated by street:** each street has its own Parquet, binary vectors, manifest

Outputs: `artifacts/datasets/{street}/records.parquet`, `vectors.f32.bin`, `manifest.json`, `summary-report.json`.

---

## 6. Scaling (StandardScaler)

**Where:** Python embedding pipeline (`pipeline/embed/preprocess.py`)

**Method:** `sklearn.preprocessing.StandardScaler` — zero mean, unit variance per retained column.

**Constant columns:** dropped before PCA (recorded in `retained-features.json`).

**Cross-language note:** Browser/API normalization must use exported scaler parameters. TypeScript `normalizeFeatures` is planned for parity testing; training fit is always sklearn on the training corpus.

---

## 7. PCA

**Where:** Python (`pipeline/embed/fit.py`)

**Config defaults** (`pipeline/embed/config.py`):

| Parameter | Value |
| --- | --- |
| Target variance | 95% |
| Max components | 50 |

PCA reduces collinearity (e.g. category one-hots, correlated equity stats) before UMAP. Retained dimension is recorded in `analysis-report.md` for each real artifact release.

PCA coordinates are **not** directly visualized; they precondition UMAP and kNN projection.

---

## 8. UMAP

**Where:** Python (`umap-learn`)

**Defaults:**

| Parameter | Value |
| --- | --- |
| `n_components` | 3 |
| `n_neighbors` | 30 |
| `min_dist` | 0.1 |
| `metric` | euclidean |
| `random_state` | 42 |

**Role:** nonlinear 3D embedding for human exploration.

**Critical caveat:** UMAP preserves **local** neighborhoods approximately; **global** distances are not metric-faithful. Do not read edge lengths in the viewer as strategic similarity magnitudes.

---

## 9. HDBSCAN

**Where:** Python (`hdbscan`)

**Defaults:** `min_cluster_size=50`, `min_samples=10`

**Output:** cluster label per point; `-1` = noise/outlier.

Clusters are **density regions in UMAP space**, not ground-truth strategic classes. High noise fraction can indicate overlapping regimes, insufficient sample size, or embedding parameter sensitivity; it does not necessarily mean "no structure."

---

## 10. Out-of-sample projection

Manual hand entry must map unseen states into the learned geometry.

**Pipeline (`apps/web/lib/projection/project-point.ts`):**

1. Align feature vector to `retained_features` order
2. Apply saved scaler parameters
3. Apply saved PCA mean/components
4. Run bounded top-k nearest-neighbor search in PCA space
5. Interpolate 3D coordinates from training embeddings with inverse-distance weights
6. Assign the cluster label by plurality vote among neighbors

**Browser/API:** exact card matches use metadata coordinates; non-exact hands use the server-readable `projection-index.bin` sidecar for PCA-space kNN interpolation.

Always report **projection method** and **neighbor distances** alongside a projected point.

---

## 11. Reproducibility

| Artifact | Records |
| --- | --- |
| Dataset seed | `manifest.json` → `seed` |
| Sample order | `manifest.json` → `samplingStrategy` |
| Feature schema | `FEATURE_SCHEMA_VERSION`, `retained-features.json` |
| UMAP/HDBSCAN seed | `analysis-report.md`, `viewer-manifest.json` |
| Embedding params | `viewer-manifest.json` → `umap`, `pcaDimensions` |

**Commands (production reproduction):**

Run production reproduction inside the AWS Batch release worker, not on a laptop. Local runs should use tiny smoke datasets only.

```bash
cd visualizer
pnpm install
pnpm generate:all                    # AWS Batch release worker
cd pipeline && pip install -r requirements.txt
python -m embed.run --all            # AWS Batch release worker
pnpm --filter @geometry-of-poker/web sync-artifacts
pnpm dev
```

**Local smoke variant:** use counts such as `--count 20` and do not publish those artifacts.

**Seed stability:** pipeline runs UMAP seeds {42, 43, 44} and reports pairwise kNN overlap. Always disclose seed when presenting figures.

---

## 12. Evaluation metrics

Computed in `pipeline/embed/analyze.py` and written to `analysis-report.md`:

| Metric | Meaning |
| --- | --- |
| **Trustworthiness** | Are 3D neighbors also neighbors in feature space? |
| **kNN overlap** | Fraction of shared k-neighbors between feature space and 3D |
| **Cluster counts / noise %** | HDBSCAN summary |
| **Feature ablation experiments** | compact vs compact_no_board vs compact_no_removal |

These measure **embedding fidelity**, not strategic correctness.

---

## 13. Runtime component map

| Stage | Language | Package / path |
| --- | --- | --- |
| Exact poker math | C++20 | `poker-calculations` native core |
| Node binding | C++ / N-API | `poker-calculations` npm prebuild |
| Feature orchestration | TypeScript | `@geometry-of-poker/feature-engine` |
| Dataset generation | TypeScript | `@geometry-of-poker/dataset-generator` |
| Scaling / PCA / UMAP / HDBSCAN | Python | `pipeline/embed/` |
| Artifact export | Python | `pipeline/embed/artifacts.py` |
| Artifact serving | S3/CloudFront | `releases/<release-id>/embeddings/<street>/` |
| GPU point cloud | TypeScript / WebGL | `apps/web` React Three Fiber |

See [performance-analysis.md](./performance-analysis.md) for throughput benchmarks.

---

## 14. What this methodology does not claim

- Clusters **do not** prove optimal strategy or exploitative play
- UMAP distances **are not** perfect strategic distances
- Uniform-villain equity **is not** game-theoretic EV against realistic ranges
- Small sampled embeddings **do not** cover the full strategic state space

Distinguish always:

1. **Exact combinatorial outputs** (equity, categories)
2. **Engineered features** (texture, summaries)
3. **Dimensionality-reduction artifacts** (UMAP layout, HDBSCAN labels)
4. **Interpretive observations** (human cluster descriptions)
