# Geometry of Poker

Geometry of Poker is a production-deployed research visualization for Texas Hold'em state space. It converts poker states into compact feature vectors, embeds those vectors into a three-dimensional manifold, and serves the resulting map as an interactive GPU point cloud.

The project is built as a reproducible poker-math system: real release artifacts, a manual hand projection API, S3/CloudFront artifact hosting, Vercel app deployment, and a documented compute policy that keeps heavy poker workloads off local laptops.

## Live System

- App host: Vercel
- Artifact host: private S3 bucket behind CloudFront
- Current release base: `https://d38kt2l1nex9vr.cloudfront.net/releases/2026-06-balanced-small-1`
- Release size: `1,326` preflop states plus `25,000` flop, `25,000` turn, and `25,000` river states
- Runtime projection: `/api/project`
- Health check: `/api/health`
- Presentation page: `/map`

## What This Demonstrates

- Data-oriented rendering with binary browser artifacts and typed arrays
- A serverless deployment that avoids always-on compute
- Native poker evaluation via `poker-calculations`
- A reproducible feature and embedding pipeline
- Production-safe manual hand projection using saved scaler/PCA/projection sidecars
- Clear research boundaries: visualization and neighborhood analysis, not poker-solver claims

## Architecture

```text
Cards
  -> TypeScript feature engine
  -> compact feature schema
  -> AWS Batch release worker
  -> Parquet datasets
  -> Python scaler/PCA/UMAP/HDBSCAN pipeline
  -> browser artifacts
  -> S3 + CloudFront
  -> Vercel Next.js viewer/API
```

Main workspaces:

```text
apps/web/                  Next.js app, API routes, React Three Fiber viewer
packages/feature-engine/   TypeScript poker feature extraction
packages/dataset-generator/Seeded street dataset generation
packages/shared/           Shared schemas, street types, artifact contracts
pipeline/                  Python embedding and artifact production
deploy/aws/                S3/CloudFront, CodeBuild, Batch release worker
docs/                      Research and engineering documentation
```

## Research Model

Each point is a poker state:

```text
s = (hero, board, street)
x = phi(s) in R^66
z = (x - mu) / sigma
y = V_k^T z
u = UMAP(y) in R^3
```

Feature groups include equity against a uniform random villain, hand category, board texture, draw pressure, card-removal summaries, and transition-style instability measures. The app visualizes the learned UMAP coordinate `u`; it does not claim that UMAP global distance is equivalent to optimal poker strategy.

Manual hand input follows the production path:

```text
cards -> validate -> feature extraction -> retained feature alignment
      -> scaler -> PCA -> bounded kNN in PCA space
      -> weighted 3D interpolation from existing map points
```

## Compute Policy

Do not run production poker generation, embedding, clustering, or release validation workloads on a laptop.

Allowed local work:

- `pnpm dev`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- Small smoke checks against already-generated CloudFront artifacts
- Tiny dataset/debug runs only when needed to test wiring

Remote-only by default:

- Balanced-small release generation: `1,326 + 25,000 + 25,000 + 25,000`
- Full dataset generation
- Full embedding/clustering runs
- Release validation over complete generated artifacts
- Any larger research sweep

Preferred remote compute is short-lived AWS Batch or CodeBuild-backed image construction. Avoid always-on servers and NAT gateways for budget control.

## Production Environment

Vercel production requires:

```text
GOP_ARTIFACT_BASE_URL=https://d38kt2l1nex9vr.cloudfront.net/releases/2026-06-balanced-small-1
```

CloudFront must serve release artifacts with:

```text
Cache-Control: public,max-age=31536000,immutable
Access-Control-Allow-Origin: *
```

The S3 bucket remains private. Public reads go through CloudFront Origin Access Control.

## Local Development

```bash
cd visualizer
pnpm install
pnpm dev
```

For a production-equivalent local build:

```bash
$env:VERCEL_ENV="production"
$env:GOP_ARTIFACT_BASE_URL="https://d38kt2l1nex9vr.cloudfront.net/releases/2026-06-balanced-small-1"
pnpm --filter @geometry-of-poker/web... build
```

Run checks:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Key Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the Next.js viewer |
| `pnpm typecheck` | Type-check all workspace packages |
| `pnpm lint` | Run web lint checks |
| `pnpm test` | Run package and app tests |
| `pnpm build` | Build packages and app |
| `pnpm validate:artifacts` | Validate generated release artifacts |
| `pnpm aws:deploy-artifacts` | Deploy/update S3, CloudFront, Batch infrastructure |
| `pnpm aws:build-worker` | Build the release worker image remotely through CodeBuild |
| `pnpm aws:submit-release` | Submit an approved one-off Batch release job |

## Artifact Contract

Each street release folder contains:

```text
viewer-manifest.json
browser-points.bin
browser-channels.bin
browser-metadata.json
retained-features.json
projection-index.bin
```

The viewer consumes `browser-points.bin` and `browser-channels.bin` for rendering. The API consumes `projection-index.bin` plus metadata for manual hand projection.

## Performance Notes

The viewer renders a single `THREE.Points` geometry backed by typed arrays. The production path avoids per-point React components. Current optimizations include:

- Binary point and channel artifacts
- Progressive loading of positions before metadata
- Adaptive point density on constrained hardware
- Capped device pixel ratio for integrated GPUs
- Targeted hover/selection buffer updates instead of full point-cloud rebuilds
- Bounded nearest-neighbor projection instead of full-array sort

The current balanced-small release is intended to be usable on laptops with integrated or workstation-class mobile GPUs. Future larger releases should use tiled or paged artifacts.

## Documentation

| File | Description |
| --- | --- |
| `docs/math-showpiece.md` | Compact mathematical narrative for the poker-state geometry |
| `docs/topology-and-clustering-audit.md` | Honest audit of whether the learned geometry supports a sphere or clustered structure |
| `docs/research-methodology.md` | Feature and embedding methodology |
| `docs/architecture.md` | System design and data flow |
| `docs/performance-analysis.md` | Performance model and benchmarks |
| `docs/limitations.md` | Research and engineering boundaries |
| `docs/feature-schema.md` | Compact feature schema reference |
| `deploy/aws/README.md` | AWS artifact and Batch workflow |

## Research Talking Points

- "I separated app hosting from artifact hosting so the system has no always-on poker compute."
- "The viewer is data-oriented: one point cloud, typed arrays, binary channels, no per-point React tree."
- "Manual input uses a saved projection sidecar and reports the projection method truthfully."
- "The research page distinguishes measured poker facts, engineered features, embedding artifacts, and interpretation."
- "The AWS path is budget-conscious: private S3, CloudFront, and approved one-off Batch jobs only."

## License

Private research project. Poker calculation primitives are provided by the separately published `poker-calculations` package.
