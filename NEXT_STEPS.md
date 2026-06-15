# Next Steps

## Active Priorities

- Keep API docs and shared response types aligned with route behavior.
- Keep artifact health honest: configured artifact URLs are not considered available until manifests are reachable.
- Continue separating lightweight local app checks from expensive release generation and embedding work.

## Known Watch Points

- Exact `/api/state` analysis and some feature-engine tests are slow because they call native combinatorial routines.
- Manual projection with dead cards intentionally uses PCA kNN interpolation to preserve dead-card-conditioned feature semantics.
- Larger artifact releases should remain AWS Batch or CodeBuild work, not laptop work.
