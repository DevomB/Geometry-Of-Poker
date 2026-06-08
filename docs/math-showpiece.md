# Math Showpiece - Geometry of Poker

This is the compact mathematical narrative for Geometry of Poker. The project is not a poker solver. It is a reproducible state-space geometry pipeline: exact combinatorial signals are transformed into fixed-width vectors, embedded into 3D, and inspected in a GPU point-cloud viewer.

For the honest topology/clustering argument, see [Topology And Clustering Audit](./topology-and-clustering-audit.md).

## Core Object

A poker state is represented as:

```text
s = (h, b, t)
```

where `h` is the two-card hero hand, `b` is the public board, and `t` is the street implied by `|b|`. The feature engine maps each legal state into a fixed vector:

```text
phi: S -> R^66
x = phi(s)
```

The compact vector contains exact and engineered quantities:

| Feature group | Mathematical role |
| --- | --- |
| Equity | Expected showdown win/tie probability against a uniform legal villain hand |
| Made hand category | Discrete rank class embedded as stable numeric channels |
| Board texture | Suit/rank structure: pairedness, monotonicity, connectivity |
| Draw pressure | Count of future cards improving flush/straight potential |
| Removal summaries | Sensitivity of equity to removing each remaining card |
| Transition instability | How category distributions change over possible runouts |

The important systems claim is that every point in the viewer is backed by the same documented vector schema. The visualization is not hand-arranged.

## Exact Equity Signal

For a state `s`, legal villain hands are all two-card combinations disjoint from hero and board cards:

```text
V(s) = {v : |v| = 2, v cap (h union b) = empty}
```

Equity against a uniform random villain is:

```text
E(s) = (1 / |V(s)|) * sum over v in V(s) P(hero wins or ties | s, v)
```

Incomplete streets integrate over legal future boards. The implementation delegates the expensive hand-evaluation and enumeration pieces to the native `poker-calculations` engine, which is the right layer for combinatorial work.

## Card-Removal Gradient

One of the strongest poker-math features is sensitivity to blockers. For each remaining card `c`, recompute equity with `c` removed from the future/villain universe:

```text
g_c(s) = E(s with c unavailable) - E(s)
```

The compact schema records summaries of this vector; the extended schema can retain the full per-card signal. This is analogous to a finite-difference factor sensitivity: how much the state value changes under a small universe constraint.

## Scaling And PCA

Raw feature columns have different units and variances. Before embedding, retained columns are standardized:

```text
z_j = (x_j - mu_j) / sigma_j
```

Constant or unavailable columns are removed and recorded in artifacts. PCA then projects standardized vectors into a lower-dimensional orthogonal basis:

```text
y = W_k^T z
```

where `W_k` keeps enough components for the configured variance target. PCA is not the final visualization; it conditions the data for neighborhood learning and out-of-sample projection.

## UMAP Manifold

UMAP maps the PCA representation into 3D:

```text
u = f_umap(y),  u in R^3
```

The defensible claim is local-neighborhood preservation, not global metric faithfulness. The project evaluates this with trustworthiness and k-nearest-neighbor overlap. In demo language:

```text
Nearby points are evidence of similar engineered feature neighborhoods.
Long distances and cluster borders are hypotheses, not strategy theorems.
```

## Manual Projection

Manual card entry uses the same feature function and saved training artifacts:

```text
s_new -> phi(s_new) -> standardize -> PCA -> kNN in PCA space
```

The viewer interpolates the 3D position from neighbor embeddings with inverse-distance weights:

```text
u_new = sum_i w_i u_i / sum_i w_i
w_i = 1 / (d_i + epsilon)
```

This makes the projection explainable: the UI can show the projection method, nearest neighbors, and distances instead of pretending the nonlinear UMAP model has perfect out-of-sample semantics.

## Rendering Model

The browser does not render one React component per point. It renders one GPU buffer:

```text
positions: Float32Array[3N]
colors:    Float32Array[3N]
sizes:     Float32Array[N]
```

A custom shader draws the cloud as circular point sprites. Filters, hover, and selection mutate typed arrays and upload changed buffer ranges to the GPU. Runtime adaptation protects the 30 FPS floor by lowering point density, device-pixel-ratio, hover frequency, and HTML overlays when measured frame rate falls below target.

## Mathematical Summary

The project follows a disciplined poker-state geometry workflow:

```text
combinatorial state -> exact signals -> feature vector -> normalized factor space
-> dimensionality reduction -> fidelity diagnostics -> interactive scenario probe
```

The key discipline is separation of claims:

- Exact poker math is exact within the declared villain/runout model.
- Engineered features are deterministic summaries.
- PCA/UMAP/HDBSCAN are modeling artifacts.
- Viewer observations are research hypotheses, not solved strategy.
