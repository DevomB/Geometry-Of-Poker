# Research Notes

Working document for quantitative analysis and C++Con narrative.

## Hypothesis

Texas Hold'em states, when embedded via strategically meaningful features, exhibit **low-dimensional manifold structure** — clusters corresponding to equity regimes, draw classes, and board textures.

We do not assert a predefined shape (sphere, simplex, etc.). Structure must **emerge** from data.

## Feature space

- Dimension: ~10–50 (initial scaffold: 10 placeholder columns)
- Domain: hero hole cards + partial/complete board
- Constraints: valid card sets, street-consistent board lengths

## Manifold learning choices

| Method | Role |
| --- | --- |
| StandardScaler | Remove scale differences between equity % and binary texture flags |
| PCA | Optional pre-reduction if feature count exceeds ~20 |
| UMAP | Primary 3D embedding for visualization |
| HDBSCAN | Unsupervised cluster discovery without fixed k |

## Evaluation metrics (planned)

- **Trustworthiness** — are nearby points in 3D also nearby in feature space?
- **Continuity** — are feature-space neighbors preserved in 3D?
- **kNN overlap** — fraction of shared neighbors at k=10, 30, 100
- **Silhouette** — if HDBSCAN produces stable clusters

## Interpretability goals

Each cluster should be describable in poker language:

- "Strong made hands on dry boards"
- "Combo draws with equity > 40%"
- "Vulnerable one-pair on wet boards"

Cross-tabulate cluster id vs. category rank and vulnerability deciles.

## Dataset size targets

| Stage | States | Purpose |
| --- | --- | --- |
| Dev | 10k | Pipeline smoke test |
| Research | 100k–500k | Talk-quality visualization |
| Production | 1M+ | Dense coverage (optional) |

Sampling strategy: stratified by street + category rank bins.

## Manual hand projection

Out-of-sample states are inevitable in Mode 2. Document chosen projection method and error bounds (distance to kNN neighbors in feature space).

## References (internal)

- `poker-calculations` npm package — equity, vulnerability, categories
- UMAP: McInnes, Healy, Melville (2018)
- HDBSCAN: Campello et al.

## Open questions

1. Suit isomorphism — canonicalize or retain full suits for blocker features?
2. Default villain range for equity features — fixed JSON range vs. street-dependent
3. Metadata size at 500k points — binary + sharded Parquet vs. single JSON
4. Whether to embed preflop and postflop in one manifold or separate views
