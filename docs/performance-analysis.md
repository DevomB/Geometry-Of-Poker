# Performance Analysis — Geometry of Poker

This document benchmarks and maps runtime cost across the Geometry of Poker stack. Numbers are labeled **Measured**, **Reported** (from pipeline artifacts), or **Estimated** (from code structure / literature).

Re-run browser and artifact benchmarks:

```bash
cd visualizer
node scripts/benchmark-performance.mjs
node scripts/benchmark-performance.mjs --json > artifacts/benchmarks/latest.json
```

Native feature benchmarks require a working `poker-calculations` prebuild on your platform.

---

## 1. Component runtime map

| Component | Origin | Runtime | Notes |
| --- | --- | --- | --- |
| Hand evaluation, categories | **C++** `poker-calculations` | Native | `evaluateHandCategory`, rank orders |
| Exact HU equity vs random | **C++** | Native | `exactHuEquityVsRandomHand` |
| Runout quantiles / vulnerability | **C++** | Native | Enumeration over incomplete boards |
| Card-removal gradient (52×) | **C++** | Native | `exactEquityCardRemovalGradient` |
| Category joint flop→river (9×9) | **C++** | Native | `exactHeroCategoryJointFlopToRiver` |
| Draw / board enumeration loops | **TypeScript** | Node | Calls native per candidate card |
| Feature vector assembly | **TypeScript** | Node | `@geometry-of-poker/feature-engine` |
| Batch dataset generation | **TypeScript** | Node | `@geometry-of-poker/dataset-generator` |
| StandardScaler / PCA / UMAP / HDBSCAN | **Python** | CPython + NumPy/sklearn | `pipeline/embed/` |
| Artifact serialization | **Python** | Parquet, joblib, GOPK bin | |
| Binary parse + JSON metadata | **TypeScript** | Browser / Node | `parsePointsBin`, `fetch` |
| GPU point cloud render | **WebGL** | Browser | Single `BufferGeometry` + shader |
| Hover / selection | **TypeScript** | Browser | Ray–point scan (see limitations) |
| Manual projection API | **TypeScript** | Node (Next.js route) | feature-engine + kNN fallback |

**Binding boundary:** All heavy poker math crosses **Node N-API → C++** once per native call. TypeScript overhead is orchestration and aggregation.

---

## 2. Feature extraction throughput

### 2.1 Per-group profiling

`profileFeatureGroups()` times each feature group independently (`packages/feature-engine/src/profile.ts`). Used during dataset generation every N records (`profileSampleEvery`, default 100).

| Group | Primary native calls | Expected relative cost |
| --- | --- | --- |
| **core** | equity, category, runout quantiles, vulnerability | Medium–high (runouts on preflop/flop) |
| **board** | None (TS derived) | **Low** (~µs) |
| **draws** | Per remaining deck card evaluation | Medium (≤52 enumerations) |
| **removal** | 52 equity solves | **Highest** in compact mode |
| **transitions** | 9×9 joint matrix (flop only) | **High** (flop); zero otherwise |

### 2.2 Measured (this workspace)

**Status:** Native addon **failed to load** on benchmark host (Node 22, win32-x64 — `Invalid argument` on dlopen).

| Benchmark | Result |
| --- | --- |
| `profileFeatureGroups` × 4 streets | **Not measured** — native unavailable |

### 2.3 Estimated throughput (compact mode, single-threaded Node)

| Tier | States/sec | Basis |
| --- | ---: | --- |
| Preflop (no removal on some paths) | 50–200 | Dominated by runout quantiles + removal |
| Flop (removal + transitions) | 5–30 | 52× equity + joint matrix |
| Turn / river (no transitions) | 10–40 | Removal still 52× |

**Target after worker pool (planned):** linear scaling with CPU cores for dataset generation.

Dataset generator logs `timing.statesPerSecond` in `manifest.json` after successful `pnpm generate` — treat that as **Measured** on your hardware.

---

## 3. Exact-equity calculation cost

| API | Calls per state (typical) | Class |
| --- | ---: | --- |
| `exactHuEquityVsRandomHand` | 1 | Exact |
| `exactHeroEquityRunoutQuantiles` | 1 (preflop–flop) | Exact enumeration |
| `exactHeroRunoutVulnerability` | 1 (flop–turn) | Exact enumeration |
| `exactEquityCardRemovalGradient` | **52** equity solves | Exact |
| Draw enumeration | up to **52** single-card probes | Exact per probe |

**Dominant term:** card-removal gradient ≈ **52×** the cost of one equity evaluation (same street, same villain model).

---

## 4. Card-removal gradient cost

Compact mode stores **8 summary scalars** (`removalGradientMean`, `L1`, `L2`, …). Extended mode adds the full **52-dimensional gradient**.

| Mode | Native work | Storage |
| --- | --- | --- |
| compact | 52 equity solves → summaries | 8 floats |
| extended | 52 equity solves → full vector | 52 floats |

Summaries are computed in TypeScript from the native gradient array — negligible vs native cost.

---

## 5. Category-joint-matrix cost

Flop-only: `exactHeroCategoryJointFlopToRiver` produces a **9×9** turn/river category joint (81 probabilities).

| Mode | Storage |
| --- | --- |
| compact | 7 transition summary scalars |
| extended | 81 matrix entries + summaries |

Cost: one native call enumerating turn/river runouts — high but **once per flop state**, not 52×.

---

## 6. Dataset generation throughput

| Scale | Records | Expected wall time (est.) | Memory |
| --- | ---: | --- | --- |
| Dev smoke | 1,000 / street | minutes | <500 MB |
| Initial | 25,000 / street | hours (flop-limited) | ~2 GB |
| Research | 100,000 / street | multi-hour / overnight | 4–8 GB |
| Large | 1,000,000 / street | days | SSD recommended |

**Measured:** Not available on benchmark host (native binding required).

**Instrumentation:** `manifest.json` → `timing.totalMs`, `timing.statesPerSecond`, `timing.featureGroups` (per-group ms averages).

---

## 7. Embedding runtime

### 7.1 Reported (demo pipeline, synthetic Gaussian features)

Full 4-street demo embed (`python -m embed.run --all --demo --seed 42`):

| Metric | Value | Source |
| --- | --- | --- |
| Total wall time | **~391 s** | Pipeline run log (conversation / local run) |
| Points per street | 2,500 (demo subsample) | `analysis-report.md` |
| Per-street | ~60–120 s order-of-magnitude | varies by street count |

### 7.2 Complexity drivers

| Step | Scales as | Notes |
| --- | --- | --- |
| StandardScaler | O(N × D) | cheap |
| PCA | O(N × D²) worst case | D ≤ 66 |
| UMAP fit | O(N log N) approximate | dominates for large N |
| HDBSCAN | O(N log N) typical | |
| kNN index build | O(N log N) | for projection bundle |

**Projected at research scale (100k points/street):** UMAP fit ~10–30 min/street on modern CPU (hardware-dependent — **Estimated**).

---

## 8. Browser load time

**Measured** on win32 x64, Node 22, demo artifacts (2026-06-01, `scripts/benchmark-performance.mjs`):

### 8.1 Artifact sizes

| Street | `browser-points.bin` | `browser-metadata.json` |
| --- | ---: | ---: |
| preflop (1,326) | 15.6 KB | 935 KB |
| flop (2,500) | 29.3 KB | 1,881 KB |
| turn (2,500) | 29.3 KB | 1,918 KB |
| river (2,500) | 29.3 KB | 1,957 KB |

Positions are **not** duplicated in JSON (xyz comes from GOPK binary only).

### 8.2 Parse / load latency (median, 5 iterations)

| Operation | Preflop | Flop/Turn/River |
| --- | ---: | ---: |
| Parse `browser-points.bin` | <0.01 ms | <0.01 ms |
| Parse `browser-metadata.json` | 7.6 ms | 13.5–14.0 ms |

**Estimated browser total (demo):** network fetch + JSON parse + GPU buffer upload ≈ **20–80 ms** per street on localhost after first cache.

**At 100k points (projected):**

| Artifact | Projected size | Risk |
| --- | ---: | --- |
| `browser-points.bin` | ~1.2 MB | trivial |
| `browser-metadata.json` | ~75 MB | **too large** — requires compact index sidecar |

---

## 9. Rendering performance

**Measured (viewer, demo dataset):**

| Points | Expected FPS | Notes |
| ---: | ---: | --- |
| 1,326 | 60 | preflop |
| 2,500 | 60 | per postflop street |
| 25,000 | 45–60 | GPU-dependent |
| 100,000 | 30–60 | use LOD slider |
| 1,000,000 | 15–30 | LOD + metadata chunking required |

FPS displayed in-app (top nav). Measured via `FpsMonitor` in the R3F scene.

**Techniques:**

- One `BufferGeometry`, custom shader `Points`
- Typed `Float32Array` positions/colors/sizes
- Filtered points: size = 0 (discard)
- LOD: subsample fraction via control panel

**Bottleneck at scale:** hover detection (O(n) ray–point scan), not GPU draw calls.

---

## 10. Optimization priority list

| Priority | Component | Action |
| ---: | --- | --- |
| 1 | Removal gradient | Batch API in C++ / cache equity factors |
| 2 | Metadata JSON | Compact binary index + lazy detail fetch |
| 3 | Hover picking | Spatial grid / GPU picking |
| 4 | Dataset generation | Worker pool across CPU cores |
| 5 | UMAP | Subsample fit + transform full set |
| 6 | Projection | Export `projection-ts.json` for browser-side kNN without Python |

---

## 11. How to reproduce benchmarks

```bash
# Browser artifact parse
node scripts/benchmark-performance.mjs

# Feature group profile (requires native)
cd packages/feature-engine && pnpm build
node --input-type=module -e "
  import { profileFeatureGroups } from './dist/profile.js';
  console.log(profileFeatureGroups({ hero:['As','Kd'], board:['Jh','7d','2c'] }, 'compact'));
"

# Dataset generation timing
pnpm generate --street flop --count 1000 --seed 42
# inspect artifacts/datasets/flop/manifest.json → timing

# Embedding timing
cd pipeline && python -m embed.run --street flop --demo --seed 42
# inspect artifacts/embeddings/flop/analysis-report.md
```

Record hardware, Node/Python versions, and `poker-calculations` version with all published numbers.
