# Vercel Deployment

## Project Settings

### Root Directory (required)

Set **Root Directory** to the Next.js app folder, **not** the monorepo root:

| Git repository root | Vercel Root Directory |
| --- | --- |
| `visualizer/` only | `apps/web` |
| `Poker-Calculator/` (full monorepo) | `visualizer/apps/web` |

If Root Directory is `visualizer` (parent), Vercel treats the project as a static site and fails with **“No Output Directory named public found”**. The Next.js app and `vercel.json` live in `apps/web`.

Enable **Include source files outside of the Root Directory in the Build Step** if prompted (pnpm workspace needs `pnpm-workspace.yaml` and `packages/` at the parent).

### Framework and output

- **Framework preset:** Next.js (`framework: "nextjs"` in `apps/web/vercel.json`)
- **Output Directory:** leave empty / default — do **not** set `public` (that override is for static sites only)

### Install and build

Configured in `apps/web/vercel.json` (commands run from the workspace root via `pnpm -C ../..`):

```bash
pnpm install --frozen-lockfile
pnpm --filter @geometry-of-poker/web... build
```

The trailing `...` builds `@geometry-of-poker/web` **and workspace dependencies** (`shared`, `feature-engine`) before `next build`. Their `dist/` output is gitignored and must be compiled on the build machine.

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
