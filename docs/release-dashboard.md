# Release Dashboard - Geometry of Poker

The release dashboard reads the same street manifests used by the viewer and reports artifact readiness for each street.

## Readiness rule

For each street, the dashboard classifies the manifest as:

| Status | Meaning |
| --- | --- |
| ready | Manifest exists, point count is positive, and `projection-index.bin` is declared |
| partial | Manifest exists but a required production sidecar is missing |
| missing | No usable street manifest is available |

The projection index is treated as required because manual hand projection depends on saved PCA-space neighbor data.

## Diagnostics shown

The dashboard surfaces:

- point count
- feature dimensions
- PCA dimensions and retained variance
- trustworthiness
- kNN overlap
- HDBSCAN cluster count and noise fraction
- channel and projection sidecar availability

These values are release metadata, not recomputed in the browser.

## Claim boundary

The dashboard verifies that the viewer can discover declared artifacts and diagnostics. It does not prove the artifacts are statistically sufficient, strategically correct, or complete for every possible poker state.
