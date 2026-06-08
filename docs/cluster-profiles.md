# Cluster Profiles - Geometry of Poker

The cluster profile panel compares the selected state's HDBSCAN cohort with the full loaded street sample.

## Cohort definition

For a selected state `s_i` with cluster label `c_i`, define the cohort:

```text
C_i = {s_j in D_t : cluster(s_j) = c_i}
```

If `c_i = -1`, the cohort is the HDBSCAN noise population. Noise is shown separately because these states are explicitly not assigned to a dense cluster.

## Mean deltas

For a scalar feature channel `x`, the panel computes:

```text
mean_cluster(x) = (1 / |C_i|) * sum over s_j in C_i of x_j
mean_street(x)  = (1 / |D_t|) * sum over s_j in D_t of x_j
delta(x)        = mean_cluster(x) - mean_street(x)
```

For equity, deltas are displayed in percentage points. Other scalar channels are displayed as raw feature units.

## Category mix

The category mix is a frequency distribution inside the selected cohort:

```text
share(category k | C_i) = |{s in C_i : category(s) = k}| / |C_i|
```

This helps explain whether a cluster is dominated by made hands, high-card states, draws, or mixed regimes.

## Claim boundary

Cluster profiles describe HDBSCAN labels over the current embedding artifact. They are useful for interpretation, but they do not prove that the cluster is a strategic type, that the boundaries are stable under every UMAP seed, or that the cluster corresponds to optimal poker action.
