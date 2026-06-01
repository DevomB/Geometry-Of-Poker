# C++Con Talk Outline — Geometry of Poker

**Working title:** *The Geometry of Poker: Visualizing Hold'em State Space as an Emergent Manifold*

**Duration:** 45–60 minutes (adjustable)

## Abstract (draft)

Texas Hold'em has an enormous combinatorial state space. Rather than drawing a cube or sphere by hand, this project maps strategically meaningful feature vectors — equity, draw strength, vulnerability, board texture — into three dimensions using PCA and UMAP. The resulting interactive visualization reveals emergent geometric structure: clusters of similar strategic situations, continuous paths between draw classes, and outliers that correspond to rare board runouts. Built on a C++20 poker engine exposed via Node (`poker-calculations`), the talk covers feature engineering, manifold learning, GPU point cloud rendering, and live manual hand exploration.

## Audience

- C++ developers interested in N-API / performance-boundaries
- Quant finance practitioners (state-space embeddings, visualization)
- Poker-aware engineers curious about computational game theory

## Outline

### 1. Motivation (5 min)

- Why visualize state space?
- What "geometry" means here — and what it doesn't
- Demo teaser: fly through the point cloud

### 2. Poker mathematics without reinventing the wheel (8 min)

- `poker-calculations` architecture: C++ core, N-API, npm
- Primitives we compose: equity, categories, vulnerability, draws
- What we deliberately don't reimplement

### 3. Feature engineering (10 min)

- Hero-centric feature vector design
- Street-aware masking
- Standardization and schema versioning
- Live: extract features for AsKd on Jh7d2c

### 4. From features to manifold (12 min)

- PCA as optional preconditioning
- UMAP intuition and hyperparameters
- HDBSCAN for emergent clusters
- Evaluation: trustworthiness and continuity
- Pipeline diagram walkthrough

### 5. Rendering at scale (10 min)

- Why not one React component per point
- BufferGeometry + typed arrays
- React Three Fiber integration
- 100k+ points on consumer hardware

### 6. Two application modes (8 min)

- Mode 1: Research dataset explorer
- Mode 2: Manual hand → project → kNN neighbors → camera fly-to
- Out-of-sample projection problem

### 7. Lessons for systems builders (5 min)

- Monorepo boundaries: TS feature engine + Python ML + Next.js
- Artifact contracts across languages
- Research → portfolio → production path

### 8. Q&A

## Demo script

1. Open research explorer — rotate cluster-colored cloud
2. Filter/highlight by street (if implemented)
3. Switch to manual mode — enter QQ on AKTr9h board
4. Project, show neighbors, read metrics panel
5. Compare to preflop QQ embedding location

## Backup slides

- Feature schema table
- Embedding evaluation metrics
- Architecture mermaid diagram
- Open technical risks

## Portfolio angle

- Quantitative: manifold learning on structured feature spaces
- Engineering: cross-language pipeline, GPU visualization
- Domain: poker strategy interpretability
