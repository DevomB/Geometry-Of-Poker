# Release Notes

Geometry of Poker ships as a Vercel app plus versioned S3/CloudFront artifact releases.

## Current Release Contract

- App runtime: Next.js on Node.js 22.
- Artifact base: `GOP_ARTIFACT_BASE_URL=https://<cloudfront-domain>/releases/<release-id>`.
- Required files per street: `viewer-manifest.json`, `browser-points.bin`, `browser-channels.bin`, `browser-metadata.json`, and `projection-index.bin`.
- Public endpoints: `/api/state`, `/api/project`, `/api/health`, `/api/manifests`, and legacy `/api/state-metrics`.

## Release Checks

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm validate:artifacts
```

Use `scripts/post-deploy-smoke.mjs` against the deployed host when available.
