# Manifold Findings — Geometry of Poker

**Purpose:** structured template for documenting **interpretive observations** after exploring the embedded geometry. This is not a results paper — demo data below is explicitly synthetic unless marked **Real run**.

**Rule:** Every finding must tag its evidence type:

| Tag | Meaning |
| --- | --- |
| `[EXACT]` | From combinatorial / native calculation |
| `[FEATURE]` | From engineered feature vector |
| `[EMBED]` | From UMAP/HDBSCAN layout |
| `[OBS]` | Human interpretation — not a mathematical claim |

---

## 0. Run metadata (fill per experiment)

| Field | Value |
| --- | --- |
| Date | |
| Dataset seed | |
| UMAP seed | |
| Street(s) | preflop / flop / turn / river |
| Points / street | |
| Feature mode | compact / extended |
| Data source | real / demo / mixed |
| Git commit | |
| `analysis-report.md` path | |

---

## 1. Global embedding quality

Copy from `artifacts/embeddings/{street}/analysis-report.md`:

| Metric | Preflop | Flop | Turn | River |
| --- | --- | --- | --- | --- |
| Trustworthiness (k=15) | | | | |
| kNN overlap (feature ↔ 3D) | | | | |
| PCA dims / variance % | | | | |
| HDBSCAN clusters | | | | |
| Noise fraction | | | | |
| Seed stability (mean pairwise kNN overlap) | | | | |

### 1.1 Demo reference (synthetic — **not strategic**)

Flop demo (`--demo --seed 42`, 2,500 points):

| Metric | Value | Tag |
| --- | ---: | --- |
| Trustworthiness | 0.636 | `[EMBED]` |
| kNN overlap | 0.070 | `[EMBED]` |
| Clusters | 6 | `[EMBED]` |
| Noise | 78.4% | `[EMBED]` |
| Seed stability | mean 0.119 — **sensitive** | `[EMBED]` |

**Interpretation slot `[OBS]`:** _High noise may indicate overlapping regimes in feature space, insufficient sample size, or UMAP hyperparameter sensitivity — not necessarily absence of structure._

---

## 2. Cluster interpretation template

For each cluster `C` with label ≥ 0:

### Cluster C___

| Field | Notes |
| --- | --- |
| Size | |
| Noise? | yes / no |
| Mean equity vs random `[EXACT]` | |
| Category histogram `[EXACT]` | |
| Dominant board textures `[FEATURE]` | rainbow / two-tone / monotone / paired |
| Mean pNuts / pDominated `[EXACT]` | flop/turn only |
| Mean removalGradientMean `[FEATURE]` | |
| Mean transitionEntropy `[FEATURE]` | flop only |
| Representative hands (3) | id, hero, board |
| **Poker-language description `[OBS]`** | e.g. "medium-equity high-card on paired boards" |
| **Strategic claim?** | **No** — describe similarity, not optimality |

**Demo flop note `[OBS]`:** All six demo clusters were 100% `highCard` category — synthetic data artifact; real runs should show category mixing.

---

## 3. Transitional structures

Document continuous paths in the embedding that may correspond to feature gradients.

| Transition | From region | To region | Feature direction `[FEATURE]` | Visible in 3D? `[EMBED]` | Notes `[OBS]` |
| --- | --- | --- | --- | --- | --- |
| Weak → strong equity | | | ↑ equityVsRandom | | |
| Draw live → brick | | | ↓ straightOutCount | | |
| Vulnerable → nutted | | | ↑ pNuts, ↓ pDominated | | |
| High-card → pair category | | | category one-hot shift | | |

**Viewer workflow:** color by equity → rotate → enable NN links from a selected point → record whether neighbors form filaments or blobs.

---

## 4. Outlier / noise states

HDBSCAN label `-1` or spatial isolation in 3D.

| id | hero | board | equity | Why outlier? `[OBS]` | Feature anomaly `[FEATURE]` |
| --- | --- | --- | --- | --- | --- |
| | | | | | |

**Categories to check:**

- Rare board textures (quads, monotone)
- Extreme equity (≈0 or ≈1 vs random)
- Conflicting signals (high equity + high pDominated)

---

## 5. Street-to-street geometry comparison

Compare **separate per-street manifolds** (current design — not one unified 4D→3D embedding).

| Question | Preflop | Flop | Turn | River | Notes |
| --- | --- | --- | --- | --- | --- |
| Effective dimensionality (PCA) | | | | | |
| Cluster count | | | | | |
| Noise fraction | | | | | |
| Dominant feature groups in ablation | | | | | |
| Visual character `[OBS]` | | | | | filament / blob / sheet |

### 5.1 Hypotheses to test (not conclusions)

- `[OBS]` Turn/river manifolds may collapse draw dimensions as `drawFeaturesAvailable → 0`.
- `[OBS]` Preflop may spread along runout quantile axes; postflop along made-hand + texture axes.
- `[OBS]` River geometry may be lower-noise if fewer future-runout features apply.

---

## 6. Card-removal feature effects

Use ablation row from `analysis-report.md` → **Feature group experiments**.

| Variant | kNN overlap | Trustworthiness | Clusters | Noise % |
| --- | ---: | ---: | ---: | ---: |
| compact (full) | | | | |
| compact_no_removal | | | | |

**Demo flop reference:**

| Variant | kNN overlap | Noise % |
| --- | ---: | ---: |
| compact | 0.070 | 74.9% |
| compact_no_removal | 0.080 | 53.2% |

**Interpretation slot `[OBS]`:** _Removal summaries change density structure (noise ↓) but kNN overlap remains low — local neighborhoods still weakly preserved in 3D._

**Extended mode (52-dim gradient):** re-run when extended Parquet available; expect stronger blocker-sensitive separation `[FEATURE]`.

---

## 7. Category-transition matrix effects

Flop-only: `transitionEntropy`, `transitionUpgradeMass`, joint matrix (extended).

| Experiment | Observation `[EMBED]` | Interpretation `[OBS]` |
| --- | --- | --- |
| Color by transitionEntropy | | |
| High entropy cluster members | | |
| Compare compact vs extended (if run) | | |

---

## 8. Geometry stability across seeds

From `analysis-report.md` → **Seed stability**.

| Seed pair | kNN overlap (3D) | Visual similarity `[OBS]` |
| --- | ---: | --- |
| 42 vs 43 | | |
| 42 vs 44 | | |
| 43 vs 44 | | |

**Demo assessment:** sensitive (mean ~0.12).

**Reporting requirement:** always publish UMAP `random_state` with figures; prefer multi-seed panels for portfolio slides.

---

## 9. Manual projection spot checks

| Hand (hero / board) | Street | Method | Neighbor IDs | Max neighbor distance | Plausible? `[OBS]` |
| --- | --- | --- | --- | --- | --- |
| | | exact / umap / knn | | | |

---

## 10. Findings summary (executive)

Write 3–5 bullet points **only after real-data runs**. Template:

1. `[EMBED]` Local neighborhood preservation was (strong / moderate / weak) per trustworthiness = ___.
2. `[FEATURE]` Ablation implicated (board / removal / core) features as primary drivers of kNN overlap.
3. `[OBS]` Cluster ___ was visually interpretable as ___; **not** a strategy recommendation.
4. `[OBS]` Street ___ exhibited more filamentary structure than street ___.
5. `[EMBED]` Seed sensitivity was (low / moderate / high) — figures require fixed seed or ensemble.

**Do not write:** "Cluster 3 is where you should bluff."  
**Do write:** "Cluster 3 groups high-equity high-card states on dry boards by feature similarity."

---

## 11. Open follow-ups

- [ ] Real 25k/street dataset generation
- [ ] Extended-mode embedding comparison
- [ ] Villain range conditioning experiment
- [ ] Preflop `canonical169` vs `enumerate1326` geometry comparison
- [ ] Quantitative cluster labeling (supervised probe of cluster ids)
