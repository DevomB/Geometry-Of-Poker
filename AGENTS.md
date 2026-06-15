# Geometry of Poker Agent Guide

Work from this `visualizer/` directory as the repository root.

## Scope

- Keep visualizer work inside this repo unless the user explicitly expands scope.
- Do not edit sibling repos such as `../NPM` or `../Website` from this checkout.
- Do not replace `poker-calculations` with a local `file:../NPM` dependency.

## Standard Checks

Run these before calling a broad fix complete:

```bash
pnpm typecheck
pnpm lint
pnpm --filter @geometry-of-poker/web test
pnpm --filter @geometry-of-poker/feature-engine test
pnpm --filter @geometry-of-poker/dataset-generator test
pnpm build
```

`pnpm test` is the repo-wide aggregate. Some exact feature tests are intentionally slow because they exercise native combinatorial analysis.

## Runtime Notes

- `/api/state` does not require release artifacts.
- `/`, `/api/project`, and `/api/manifests` require complete street artifacts.
- Production blob mode uses `GOP_ARTIFACT_BASE_URL`; local public mode uses `apps/web/public/artifacts/embeddings` or `GOP_PUBLIC_ARTIFACTS_ROOT`.
- Manual projections with dead cards use PCA kNN interpolation even when the same raw hero+board exists in the dataset.
