# C++Con Talk Outline — Geometry of Poker

**Working title:** *The Geometry of Poker: High-Performance Combinatorics Meet State-Space Visualization*

**Duration:** 45 minutes (+ 10 min Q&A)

**Audience:** C++ systems programmers, performance engineers, quant developers curious about feature-space embeddings.

**Core thesis:** Poker is a high-dimensional state-space problem; exact native combinatorics make rich features practical at scale; dimensionality reduction reveals *explorable* structure — not a proof of optimal play.

---

## Narrative arc (6 beats)

1. **Poker is a high-dimensional state-space problem.**
2. **Exact combinatorics and Monte Carlo simulation provide meaningful features.**
3. **High-performance native computation makes large-scale extraction practical.**
4. **Dimensionality reduction reveals an emergent geometry.**
5. **The browser viewer makes the geometry explorable.**
6. **The same workflow resembles quantitative state-space modeling.**

---

## Abstract (submission draft)

Texas Hold'em admits an enormous combinatorial state space — far too large to visualize directly. This project maps each hero-centric state to a fixed-dimensional feature vector built from **exact** native calculations (equity, runout distributions, vulnerability, card-removal sensitivity) orchestrated through Node and TypeScript, then embeds vectors into three dimensions with PCA and UMAP for interactive exploration.

The C++ core (`poker-calculations`) performs the heavy combinatorics; the talk focuses on **where native code earns its keep**, how features cross language boundaries, and how to present results without overclaiming. A React Three Fiber viewer renders 100k+ GPU points from precomputed binaries. Live demo: fly through a cluster-colored cloud and project a manually entered hand via kNN interpolation.

**Takeaway:** Treat visualization as a lens on engineered feature spaces — the same pattern appears in finance (factor manifolds, risk embeddings) and scientific computing (lossy nonlinear views of high-D data).

---

## Detailed outline

### 1. Opening — why geometry? (5 min)

- Show 3D point cloud rotating — **demo hook**
- State space cardinality slide (preflop 1,326 → postflop billions+)
- What "geometry" means here: **embedding of feature vectors**
- What it **doesn't** mean: optimal strategy polytope, Nash surface
- **Disclaimer slide:** UMAP distances ≠ strategic distances

### 2. Poker is high-dimensional (5 min)

- Hero + board as state; streets as filtration
- Cannot enumerate postflop — need sampling + features
- Analogy: market state = prices + exposures + Greeks (high-D snapshot)

### 3. Exact combinatorics as features (10 min)

- **`poker-calculations` architecture:** C++20 → N-API → npm
- Primitives we compose (not reimplement):
  - `exactHuEquityVsRandomHand`
  - Runout quantiles / vulnerability
  - **52× card-removal gradient** — cost story
  - Flop category joint matrix (9×9)
- Exact vs derived vs heuristic features (table from methodology doc)
- **Live or video:** profileFeatureGroups timing breakdown

### 4. High-performance native makes scale possible (8 min)

- Binding boundary diagram (C++ / Node / TS / Python / Browser)
- Bottleneck: removal gradient ≈ 52 equity solves
- Dataset generation throughput; worker pool direction
- Why we didn't rewrite poker math in Python

### 5. From features to manifold (10 min)

- Pipeline: StandardScaler → PCA (95%) → UMAP (3D) → HDBSCAN
- Hyperparameters and **seed sensitivity** (honest results)
- Evaluation: trustworthiness, kNN overlap — demo numbers
- Ablation: board vs removal feature groups
- **Critical:** clusters are embedding artifacts — interpret with poker language, not optimality

### 6. Browser viewer — GPU points at scale (7 min)

- Why not one React component per point
- GOPK binary format + typed arrays
- Color modes: equity, category, cluster, pNuts, …
- Manual hand: validate → extract → project → fly camera
- kNN fallback when UMAP transform fails

### 7. Quant finance parallel (5 min)

- State vector → nonlinear embedding → exploratory visualization
- Similar to: factor space PCA, risk scenario manifolds, neighbor-based interpolation
- Differences: exact combinatorics domain, not stochastic PDEs
- Portfolio framing: cross-language pipeline + research honesty

### 8. Lessons learned (5 min)

- Monorepo boundaries (TS features, Python ML, Next.js)
- Artifact contracts across languages
- Document limitations **before** audience asks
- Native prebuilds are part of the product

### 9. Q&A prep

- "Is this GTO?" → No, uniform villain, unsupervised clusters
- "Why UMAP not t-SNE?" → UMAP scale + transform API (with caveats)
- "Why C++ via Node not WASM?" → Existing npm package, N-API maturity
- "Can I trust the manual hand dot?" → Show neighbors + distances

---

## Demo script (8 min total)

1. **Research explorer** — flop street, equity heatmap, 2,500 points
2. Toggle **cluster labels** + **NN links** on selected point
3. **Card picker** — enter known demo hand → project → golden marker
4. Inspector: feature values, neighbors, projection method
5. Switch to **preflop** — compare spatial character
6. **About Research** page — methodology disclaimer

**Fallback:** pre-recorded video if live native fails.

---

## Slide inventory

| # | Title |
| ---: | --- |
| 1 | Title + disclaimer |
| 2 | State-space cardinality |
| 3 | Feature vector overview (66-dim) |
| 4 | Exact vs derived vs heuristic |
| 5 | C++ / N-API architecture diagram |
| 6 | Cost breakdown (removal gradient) |
| 7 | Pipeline mermaid |
| 8 | UMAP + HDBSCAN intuition |
| 9 | Evaluation metrics (honest numbers) |
| 10 | Seed stability |
| 11 | GPU point cloud architecture |
| 12 | Manual projection flow |
| 13 | Quant finance analogy |
| 14 | Limitations |
| 15 | Links + Q&A |

---

## Portfolio / submission angles

- **C++Con:** native performance boundary, N-API, honest ML visualization
- **Quant:** state-space embedding, feature engineering, neighbor interpolation
- **Engineering blog:** monorepo artifact pipeline

---

## Related docs

- [research-methodology.md](./research-methodology.md)
- [performance-analysis.md](./performance-analysis.md)
- [limitations.md](./limitations.md)
- [manifold-findings.md](./manifold-findings.md)

**Supersedes:** [talk-outline.md](./talk-outline.md) (Phase 0 draft) — use this document for C++Con submission.
