# Statistical Standing - Geometry of Poker

This note documents the population-standing panel in the inspector. The panel compares a selected state against the loaded street sample. It is descriptive statistics over the artifact currently in the browser, not a claim about the full strategic game tree.

## Sample frame

For a loaded street dataset, let:

```text
D_t = {s_1, ..., s_n}
```

where every `s_i` is a sampled state for street `t`. Each state has scalar channels such as equity, pNuts, equity variance, and board connectivity.

The panel only ranks within `D_t`. If the flop artifact has 25,000 points, the statement is "relative to these 25,000 flop states."

## Mid-rank percentile

For a scalar channel `x` and selected state `s_i`, define:

```text
less_i  = |{j : x_j < x_i}|
equal_i = |{j : x_j = x_i}|
p_i     = (less_i + 0.5 * equal_i) / n
```

The value `p_i` is the selected state's mid-rank percentile. Ties are split evenly instead of pretending that every tied state is strictly below or strictly above the selected state.

## Why mid-rank

Many poker features are discrete or partially discrete:

- category-derived channels
- board texture flags
- rounded or quantized artifact channels
- zeroed unavailable feature groups

For these channels, ordinary strict rank can produce unstable jumps. Mid-rank percentiles are deterministic, tie-aware, and easy to explain.

## Category and cluster shares

The inspector also reports simple frequency shares:

```text
share(category c) = |{s in D_t : category(s) = c}| / |D_t|
share(cluster k)  = |{s in D_t : cluster(s) = k}| / |D_t|
```

HDBSCAN noise is treated as its own displayed label, `noise`, because those points are explicitly not assigned to a dense cluster.

## Claim boundary

Population standing is not a solver signal. A high equity percentile means the selected state has higher uniform-villain equity than most loaded states on the same street. It does not prove optimal action, exploitability, or game-theoretic EV.
