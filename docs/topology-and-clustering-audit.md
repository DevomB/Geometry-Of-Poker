# Topology And Clustering Audit

This note answers a narrow research question:

> Does the current Geometry of Poker math justify presenting the point cloud as a sphere or other clean global geometric shape?

Honest answer: **no**. The current math supports a **stratified, clustered feature-space geometry**, not a sphere. That is still a defensible research result. In fact, it is more credible than forcing a sphere, because the feature map is built from discrete poker categories, board texture flags, availability masks, and piecewise combinatorial equity signals.

## Decision

Do not make the visualization spherical unless a future topology audit proves it.

The correct claim is:

> Poker states form local neighborhoods and density regions in engineered feature space. PCA/UMAP exposes those neighborhoods for inspection. HDBSCAN labels dense regions, while noise/outlier points indicate overlapping or sparse strategic regimes.

The current artifacts do not justify:

- "The poker state space is a sphere."
- "The UMAP cloud has meaningful global spherical topology."
- "Distance from the center has strategic meaning."
- "Clusters are solved poker strategy classes."

The current artifacts do justify:

- Fixed-schema feature geometry.
- Local neighborhood analysis.
- Cluster and outlier inspection.
- Quant-style factor engineering and dimensionality reduction.
- A falsifiable research workflow using trustworthiness, kNN overlap, cluster stability, and seed stability.

## Why A Sphere Is Not Supported

A sphere claim would require evidence that the learned set has closed, boundaryless, globally coherent topology. In practical terms, that would mean:

| Required evidence | What it would show | Current status |
| --- | --- | --- |
| Intrinsic dimension near 2 | Sphere-like surface rather than 3D cloud | Not measured |
| Stable radial shell | Points lie near a common radius after centering | Not measured |
| Persistent homology H2 feature | 2D void consistent with a sphere | Not measured |
| Low H0 fragmentation | One connected component at meaningful scale | Not established |
| Stable embeddings across UMAP seeds | Shape is data-driven, not optimizer artifact | Current reports say seed-sensitive |
| High local fidelity | 3D neighborhoods preserve feature-space neighborhoods | Current kNN overlap is low |

The existing pipeline optimizes a local neighbor graph into 3D. UMAP does not preserve global topology by default, and it is especially unsafe to infer a sphere from UMAP coordinates without independent topology diagnostics.

## Mathematical Structure Of The Feature Space

A state is:

```text
s = (hero cards, board cards, street)
```

The feature map is:

```text
phi: S -> R^66
x = phi(s)
```

The compact vector combines several incompatible feature types:

| Feature type | Examples | Geometric consequence |
| --- | --- | --- |
| Continuous scalars | equity, probabilities, normalized ranks | Smooth-ish local variation |
| Integers/counts | category index, outs, rank counts | Step changes and repeated slices |
| One-hot categories | made-hand bucket flags | Orthogonal categorical jumps |
| Binary flags | rainbow/two-tone/monotone, gutshot, combo draw | Hyperplane-like partitions |
| Availability masks | street-specific feature availability | Separate strata by street and board length |
| Neutral zeros | unavailable runout/removal/transition fields | Artificial coordinate planes |

This is not the input geometry of a clean smooth manifold. It is a mixed discrete/continuous representation. The natural object is closer to a **stratified space**:

```text
S = union over regimes R_i
phi(S) = union over i phi(R_i)
```

where regimes are defined by made-hand class, board texture, draw type, street, pairedness, suit structure, and equity/vulnerability bands.

Each regime may have local continuity, but transitions between regimes are often discontinuous or thresholded. That produces clusters, sheets, filaments, gaps, and outliers.

## Why Clusters Are Mathematically Natural

### 1. Poker states are combinatorial, not continuous

Cards are discrete. A one-card change can alter:

- made-hand category,
- board pairedness,
- flush status,
- straight-draw availability,
- blocker effects,
- equity distribution over runouts.

Those changes are not small Euclidean perturbations in the raw state space. They are combinatorial transitions.

### 2. Category one-hot features create hard strata

The vector includes made-hand category encodings. A pair and a flush are not adjacent because of a smooth coordinate; they occupy categorically different axes.

In feature space, one-hot dimensions make category changes look like jumps:

```text
high_card = [1,0,0,...]
pair      = [0,1,0,...]
flush     = [0,0,0,0,0,1,...]
```

That construction encourages separated regimes, not a single continuous shell.

### 3. Board texture flags partition the space

Features like `boardRainbowFlag`, `boardTwoToneFlag`, `boardMonotoneFlag`, `boardPairCount`, and `boardConnectivityScore` divide states into board-texture regions.

A monotone board and a rainbow board differ by a binary coordinate, even when ranks are similar. That is useful for interpretation, but it is also a direct source of clustering.

### 4. Availability masks split streets and feature groups

Some features are only meaningful on specific streets. The schema handles this by setting unavailable values to zero and adding availability flags.

That is good engineering, but geometrically it creates street-specific coordinate planes:

```text
drawFeaturesAvailable = 0 for preflop/river
drawFeaturesAvailable = 1 for flop/turn
categoryTransitionAvailable = 1 for flop only
```

A single sphere would imply one globally coherent surface. Availability masks imply multiple strata.

### 5. UMAP optimizes local neighborhoods, not global shape

The embedding pipeline is:

```text
x = phi(s)
z = StandardScaler(x)
y = PCA(z)
u = UMAP(y) in R^3
```

UMAP builds a fuzzy nearest-neighbor graph and optimizes a low-dimensional layout. It is excellent for local inspection, but global geometry is not metric-faithful. Apparent holes, islands, arcs, and shells can be optimizer artifacts unless validated separately.

### 6. HDBSCAN explicitly looks for density regions

The project already runs HDBSCAN after UMAP:

```text
cluster_id = HDBSCAN(u)
```

This is aligned with a clustered-density interpretation. HDBSCAN does not assume every point belongs to a cluster; noise is a meaningful outcome.

## Current Measured Evidence

Local analysis reports exist under `artifacts/embeddings/<street>/analysis-report.md`. Treat them as local artifact evidence, not final production truth.

| Street | Points | PCA dims | Trustworthiness | kNN overlap | HDBSCAN clusters | Noise |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| preflop | 1,326 | 50 | 0.6620 | 0.1106 | 3 | 79.8% |
| flop | 2,500 | 50 | 0.6363 | 0.0702 | 6 | 78.4% |
| turn | 2,500 | 50 | 0.6363 | 0.0702 | 6 | 78.4% |
| river | 2,500 | 50 | 0.6363 | 0.0702 | 6 | 78.4% |

Important interpretation:

- Trustworthiness around 0.64-0.66 is not strong enough to claim a clean, faithful global manifold.
- kNN overlap around 0.07-0.11 is low; many high-dimensional neighbors are not preserved in 3D.
- Noise around 78-80% means HDBSCAN sees many points as non-core density points.
- Seed stability is reported as sensitive in these local reports.
- The flop/turn/river reports are suspiciously identical in several metrics and cluster tables, so they should be treated as smoke/local artifacts until a fresh batch release verifies them.

This evidence argues against a sphere. It argues for better sampling, embedding sweeps, and diagnostics.

## Is The Math Good?

Yes, for the right claim.

The math is good as a **poker-state representation pipeline**:

```text
combinatorial state
-> exact / deterministic feature extraction
-> fixed schema
-> scaling
-> PCA
-> local-neighborhood embedding
-> density clustering and diagnostics
```

This keeps the mathematical structure explicit: define a state, engineer poker factors, normalize, reduce dimension, inspect local neighborhoods, and measure fidelity.

The math is not good as a proof that poker is a sphere. A spherical presentation would be cosmetic unless backed by topology diagnostics.

## What Batch Compute Should Be Used For

Use more batch compute for validation, not for forcing shape.

Recommended next batch plan:

1. Generate larger per-street datasets with stratified sampling by category/equity/board texture.
2. Run embedding sweeps:
   - UMAP `n_neighbors`: 15, 30, 75, 150
   - UMAP `min_dist`: 0.02, 0.1, 0.3
   - PCA variance: 0.90, 0.95, 0.99
   - HDBSCAN `min_cluster_size`: 25, 50, 100, 250
3. Record per-run:
   - trustworthiness,
   - kNN overlap,
   - cluster count,
   - noise fraction,
   - seed-stability overlap,
   - category/equity/texture distributions by cluster.
4. Add topology diagnostics only if a global-shape claim is desired:
   - intrinsic dimension estimates,
   - radial shell variance,
   - persistent homology,
   - connected-component persistence.

If those diagnostics do not support a sphere, keep the clustered-strata story. That is not a failure; it is the honest structure of the data.

## Presentation Language

Use this:

> The point cloud is a learned 3D layout of poker-state feature neighborhoods. Dense islands correspond to regimes where equity, category, draw pressure, and board texture behave similarly. Outliers and gaps are expected because the underlying state space is combinatorial and stratified.

Avoid this:

> The point cloud is the true shape of poker.

Use this:

> The visualization is geometry in the factor-model sense: a distance-based representation of engineered state features, evaluated with neighborhood-preservation diagnostics.

Avoid this:

> UMAP distance equals strategic distance.

## Bottom Line

The right mathematical justification is clustered, stratified geometry.

The current system should be presented as:

- a rigorous feature-engineering and visualization pipeline,
- an exploratory manifold-learning tool,
- a cluster/outlier analysis surface,
- a poker-math project with honest diagnostics.

It should not be presented as:

- a sphere,
- a solved topology of poker,
- a proof of strategic equivalence classes.

Future batch compute should make the clustered story stronger or falsify it. It should not be used to decorate the output into a predetermined shape.
