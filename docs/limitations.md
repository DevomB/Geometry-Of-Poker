# Limitations - Geometry of Poker

Explicit boundaries on claims, data, and methodology. Read this before citing or extending the project.

## Claim Boundaries

| Claim | Status |
| --- | --- |
| "Clusters show optimal poker strategy" | False: clusters are unsupervised density regions in an embedding. |
| "Distance in the 3D viewer equals strategic distance" | False: UMAP distorts global geometry. |
| "UMAP preserves all feature relationships" | False: only local structure is approximate. |
| "Equity vs random equals EV in real games" | False: villain is uniform random, not a range or GTO opponent. |
| "The manifold shape is theoretically predicted" | False: shape is emergent and data-dependent. |

Always distinguish exact native combinatorial output, deterministic engineered features, embedding artifacts, and human observations.

## Data And Model Limits

- Default equity uses a uniform random villain hand.
- No bet sizing, position, stack depth, multiway pots, opponent modeling, ICM, or policy trajectory modeling.
- Postflop samples retain full suits, so strategically duplicate suit permutations may appear as distinct points.
- Preflop default enumerates 1,326 ordered hole-card combinations, not only 169 canonical classes.
- Random postflop sampling is not exhaustive; rare states are undersampled at fixed N.
- Cross-street comparisons use different effective feature subspaces because unavailable groups are zeroed with availability flags.

## Embedding Limits

- UMAP is nonlinear and non-metric in 3D.
- Results are sensitive to `n_neighbors`, `min_dist`, and `random_state`.
- PCA is lossy and may discard nonlinear structure before UMAP.
- HDBSCAN `-1` means low density in UMAP space, not a bad hand.
- High noise fraction can reflect parameter choice, sample size, or genuine strategic overlap.

## Manual Projection Limits

| Method | Limitation |
| --- | --- |
| Exact card match | Only works for states already in the dataset. |
| PCA kNN interpolation | Biased toward training density; less reliable far from sampled support. |
| Missing projection index | Manual projection fails closed rather than using partial summary features. |

Manual hand markers must display method and neighbor distances.

## Production Artifact Requirement

Viewer artifacts are expected to come from real feature-engine datasets generated with the native `poker-calculations` binding. Synthetic artifact generation has been removed from the production pipeline so fake manifolds cannot be published accidentally.

## Engineering Limits

| Area | Current Limit | Consequence |
| --- | --- | --- |
| Metadata JSON | Grows linearly with point count | Large releases need compact sidecars and lazy detail fetch. |
| Hover picking | Uses Three.js point hit index with throttled fallback scan | Very large releases may need GPU picking. |
| Mobile | Full viewer is blocked below desktop breakpoints | No full-fidelity phone experience yet. |
| Native binding | Platform-specific prebuild | Dataset generation and non-exact manual projection require native availability. |
| Cross-language scaler | sklearn fit consumed by TypeScript | Requires projection-index parity tests. |

When native extraction is unavailable, dataset generation fails and non-exact API projection returns a structured error. Exact card matches can still be resolved from artifacts.

## Appropriate Use

Appropriate:

- "We embed 66-dimensional hero-centric features into 3D for exploration."
- "Exact equity powers the feature vector; UMAP provides a navigable view."
- "Cluster observations are local to this sampled release."

Inappropriate:

- "The geometry proves GTO."
- "Points far apart are strategically unrelated."
- "This cluster is where you should fold."

See [performance-analysis.md](./performance-analysis.md) and [research-methodology.md](./research-methodology.md).
