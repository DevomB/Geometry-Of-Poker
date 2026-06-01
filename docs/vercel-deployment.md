# Vercel Deployment

## Project Settings

Use the `visualizer` directory as the Vercel Root Directory. If this repository is imported from the parent `Poker-Calculator` folder, set Root Directory to `visualizer`.

Install command:

```bash
pnpm install --frozen-lockfile
```

Build command:

```bash
pnpm --filter @geometry-of-poker/web... build
```

The trailing `...` tells pnpm to build `@geometry-of-poker/web` **and its workspace dependencies** (`shared`, `feature-engine`) first. Those packages publish `dist/` via `tsc` (gitignored); `next build` alone cannot resolve them without that step.

The Next.js app lives in `apps/web`; shared TypeScript packages are resolved through the pnpm workspace.

## Runtime

Use Node.js 22.x. The workspace pins `"node": ">=22 <23"` because `poker-calculations@2.2.0` is a native N-API package and Vercel should install the Linux x64 prebuild consistently.

The API route handlers that touch runtime artifacts or `poker-calculations` explicitly use:

```ts
export const runtime = "nodejs";
```

Do not move these routes to the Edge runtime.

## Artifacts

Current production artifacts are committed under:

```text
apps/web/public/artifacts/embeddings/{preflop,flop,turn,river}/
```

Each street contains:

```text
viewer-manifest.json
browser-points.bin
browser-metadata.json
retained-features.json
```

The browser fetches point-cloud artifacts directly from static URLs returned by `/api/manifests`. Serverless functions do not proxy large binary files.

If artifacts become too large for Git or Vercel static deployment, upload the same `embeddings/{street}/...` directory layout to Vercel Blob or another CDN and set:

```bash
GOP_ARTIFACT_BASE_URL=https://your-public-blob-base.example
```

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

Then open the local Next.js URL, load each street, and submit one manual hand for preflop, flop, turn, and river.

If the Vercel CLI is installed:

```bash
vercel build
vercel deploy --prebuilt
```

## Environment Variables

Required:

```text
none
```

Optional:

```text
GOP_ARTIFACT_BASE_URL
```

No secrets are required by the production viewer.

## Native Dependency Check

`poker-calculations@2.2.0` declares Node `>=18`, N-API 8, and ships prebuilds for Linux x64, Linux arm64, macOS, and Windows. `/api/health` reports whether the native module loaded successfully in the deployed function.

If `/api/health` returns `pokerCalculations.available: false`, manual projection falls back to exact/precomputed-neighbor behavior where possible and reports warnings in `/api/project`.

## Offline Pipeline

The Python pipeline remains offline-only. Do not run dataset generation, PCA/UMAP fitting, HDBSCAN, or corpus validation inside Vercel functions. Vercel consumes precomputed artifacts only.

`.vercelignore` excludes the offline pipeline and non-public generated artifact roots. Keep only browser-safe runtime artifacts under `apps/web/public/artifacts` or an external public artifact base.

## Deployments

Preview:

```bash
vercel
```

Production:

```bash
vercel --prod
```

Custom domain:

1. Add the domain in Vercel Project Settings.
2. Point DNS to the Vercel-provided records.
3. Confirm `/api/health`, `/api/manifests`, and the static artifact URLs return 200.

Rollback:

1. Open Vercel Deployments.
2. Select the last known-good deployment.
3. Promote it to production.
4. Recheck `/api/health` and one manual projection.

## Known Limitations

The checked-in artifacts do not include a saved UMAP transform or PCA/scaler projection bundle. Runtime projection therefore uses exact precomputed matches when available and nearest-neighbor interpolation over browser metadata features otherwise. `/api/project` reports this as `precomputed-nearest-neighbor` and includes warnings when no true transform is available.
