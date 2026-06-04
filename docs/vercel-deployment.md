# Vercel Deployment

Vercel hosts the Next.js app. Runtime artifacts are served from S3/CloudFront through `GOP_ARTIFACT_BASE_URL`.

## Project Settings

### Root Directory

Set **Root Directory** to the Next.js app folder, not the monorepo root:

| Git repository root | Vercel Root Directory |
| --- | --- |
| `visualizer/` only | `apps/web` |
| `Poker-Calculator/` parent workspace | `visualizer/apps/web` |

Enable **Include source files outside of the Root Directory in the Build Step** if prompted. The pnpm workspace needs access to `pnpm-workspace.yaml` and `packages/`.

### Framework And Build

- Framework preset: Next.js.
- Output Directory: leave default; do not set `public`.
- Node.js: 22.x.

Configured in `apps/web/vercel.json`:

```bash
pnpm -C ../.. install --frozen-lockfile
pnpm -C ../.. --filter @geometry-of-poker/web... build
```

The trailing `...` builds workspace dependencies before `next build`.

## Required Environment

Production requires:

```text
GOP_ARTIFACT_BASE_URL=https://<cloudfront-domain>/releases/<release-id>
```

The app appends `/embeddings/<street>/...` internally. If this variable is missing in Vercel production, `/api/health` reports `misconfigured` and artifact APIs fail closed.

No AWS secret is needed in Vercel for public CloudFront artifact reads.

## Artifact Contract

Publish this layout to S3 and serve through CloudFront:

```text
releases/<release-id>/embeddings/<street>/
  viewer-manifest.json
  browser-points.bin
  browser-channels.bin
  browser-metadata.json
  retained-features.json
  projection-index.bin
```

Artifact files are generated offline:

```bash
pnpm generate:all
pnpm pipeline:embed
pnpm release:artifacts -- --release-id <release-id>
pnpm validate:artifacts -- --release-id <release-id>
```

Then upload `artifacts/releases/<release-id>/embeddings/` to S3.

For production releases, run these commands inside the AWS Batch release worker. Do not run balanced-small generation or embedding on a laptop; local pipeline runs should be tiny smoke tests only.

Recommended cache headers:

- Versioned files: `Cache-Control: public,max-age=31536000,immutable`
- Release pointer files, if introduced later: `Cache-Control: public,max-age=60`

## Runtime Behavior

The route handlers that touch artifacts or `poker-calculations` use:

```ts
export const runtime = "nodejs";
```

Do not move these routes to Edge runtime.

Manual projection behavior:

- Exact card matches use saved metadata coordinates.
- Non-exact hands require native feature extraction and `projection-index.bin`.
- If native extraction or the projection index is unavailable, `/api/project` returns a structured error instead of approximating from partial metadata.

## Local Verification

From `visualizer`:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm dev
```

For full local viewer verification, set `GOP_ARTIFACT_BASE_URL` to a release on CloudFront. Local generated artifacts should be tiny smoke data only. Without artifacts, the app shell builds and runs but the manifold loader reports missing street artifacts.

## Offline Pipeline Boundary

Do not run dataset generation, PCA/UMAP fitting, HDBSCAN, or corpus validation inside Vercel functions. Vercel consumes precomputed artifacts only.

## Production Checklist

1. Generate balanced-small artifacts with the AWS Batch release worker.
2. Confirm the worker ran `pnpm pipeline:embed`.
3. Confirm the worker ran `pnpm release:artifacts -- --release-id <release-id>`.
4. Confirm the worker ran `pnpm validate:artifacts -- --release-id <release-id>`.
5. Upload release artifacts to S3.
6. Set Vercel `GOP_ARTIFACT_BASE_URL`.
7. Deploy.
8. Confirm `/api/health`, `/api/manifests`, all artifact URLs, and one manual projection per street.
