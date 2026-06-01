# Limitations — Geometry of Poker

Explicit boundaries on claims, data, and methodology. Read this before citing the project in talks, interviews, or writing.

---

## 1. Epistemic limitations (what we cannot claim)

| Claim | Status |
| --- | --- |
| "Clusters show optimal poker strategy" | **False** — clusters are unsupervised density regions in an embedding |
| "Distance in the 3D viewer equals strategic distance" | **False** — UMAP distorts global geometry |
| "UMAP preserves all feature relationships" | **False** — only local structure is approximate |
| "Equity vs random equals EV in real games" | **False** — villain is uniform random, not a range or GTO opponent |
| "The manifold shape is theoretically predicted" | **False** — shape is emergent and data-dependent |

Always label:

- **Exact** — native combinatorial output
- **Engineered** — deterministic feature design
- **Embedding artifact** — UMAP/HDBSCAN output
- **Observation** — human interpretation

---

## 2. Villain and game model

- Default equity: **uniform random villain hand** (consistent with `poker-calculations` defaults).
- No bet sizing, position, stack depth, or multiway pots.
- No opponent modeling, range parsing, or ICM.
- Features describe **hero-centric static states**, not policies or trajectories.

---

## 3. Suit isomorphism and sampling bias

- Postflop samples retain **full suits** — strategically duplicate suit permutations may appear as distinct points.
- Preflop default enumerates **1,326** ordered hole pairs, not 169 canonical classes.
- Random postflop sampling is **not stratified** by category or equity decile unless explicitly configured.
- Rare states (quads boards, specific blocker combos) are undersampled at fixed N.

---

## 4. Feature availability by street

Several feature groups are **intentionally zero** on some streets:

| Group | Missing on |
| --- | --- |
| Runout quantiles | turn, river |
| Vulnerability | preflop, river |
| Draw enumeration | preflop, turn, river |
| Category transitions | preflop, turn, river |

Cross-street comparisons compare **different effective feature subspaces**, even at fixed 66-dim width.

---

## 5. Dimensionality reduction limitations

### UMAP

- Nonlinear; **non-metric** in 3D
- Sensitive to `n_neighbors`, `min_dist`, `random_state` (demo: **seed-sensitive**, mean 3D kNN overlap ~0.12)
- Out-of-sample transform unreliable → kNN interpolation fallback

### PCA

- Linear; may discard nonlinear structure before UMAP
- 95% variance target may retain 50 dims at D=66 — still lossy

### HDBSCAN

- `-1` noise label is not "bad hand" — it means low density in **UMAP space**
- High noise fraction (demo flop: ~78%) may reflect parameter choice or genuine overlap

---

## 6. Out-of-sample projection limitations

| Method | Limitation |
| --- | --- |
| UMAP `.transform()` | Often unstable far from training support |
| kNN interpolation | Biased toward training density; fails for novel feature combos |
| Browser fallback (summary kNN) | Uses partial feature subset when full bundle unavailable |
| Exact card match | Only works for states in the dataset |

Manual hand markers must display **method + neighbor distances**.

---

## 7. Demo vs real data

Current viewer artifacts may be generated from **`--demo` synthetic Gaussian features**:

- **No strategic content**
- Category labels may not correlate with features
- Cluster analysis in demo reports is **pipeline validation only**

Do not present demo embeddings as poker discoveries. Regenerate with `pnpm generate:all` + real native binding.

---

## 8. Engineering and scale limitations

| Area | Current limit | Consequence |
| --- | --- | --- |
| Metadata JSON | ~2 MB / 2.5k points | ~75 MB at 100k — needs binary index |
| Hover picking | O(n) ray scan | Degrades above ~25k points |
| Mobile | Blocked below 768px / low memory | No full fidelity on phones |
| Native binding | Platform-specific prebuild | Dataset generation blocked if addon fails |
| Cross-language scaler | sklearn fit vs TS normalize | Requires parity tests |

---

## 9. Native dependency limitations

`poker-calculations` prebuilds may fail on some Node/OS combinations (observed: Node 22 win32-x64 `Invalid argument` on dlopen).

When native is unavailable:

- Feature extraction in Node fails
- Dataset generation fails
- API projection falls back to card match / summary kNN

---

## 10. Statistical and evaluation limitations

- kNN overlap in demo runs is **low (~0.07)** — 3D view is a lossy summary
- No held-out strategic labels for supervised validation
- Ablation experiments compare embedding metrics, not win-rate or human expert agreement
- Multiple comparisons across streets/seeds without formal correction

---

## 11. Ethical and data limitations

- No scraped hand histories or commercial datasets
- All states combinatorially generated — no privacy issues, but also no empirical poker population
- Research visualization, not gambling advice

---

## 12. Appropriate use statements

**Appropriate:**

- "We embed 66-dimensional hero-centric features into 3D for exploration."
- "Exact equity powers the feature vector; UMAP provides a navigable view."
- "Cluster 2 groups states with similar equity and texture **in this sample**."

**Inappropriate:**

- "The geometry proves GTO."
- "Points far apart are strategically unrelated."
- "This cluster is where you should fold."

---

## 13. Mitigation roadmap

| Limitation | Mitigation |
| --- | --- |
| UMAP instability | Multi-seed ensembles; report ranges |
| Out-of-sample error | kNN confidence bands; show neighbors |
| Demo data | Gate viewer with `dataSource` in manifest |
| Metadata scale | `browser-index.bin` compact sidecar |
| Removal cost | C++ batch API; worker pool |
| Villain model | Optional range-conditioned feature mode |

See [performance-analysis.md](./performance-analysis.md) and [research-methodology.md](./research-methodology.md).
