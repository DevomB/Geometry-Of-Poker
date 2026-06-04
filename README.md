# Geometry of Poker

Research-grade interactive 3D visualization of Texas Hold'em state space. Strategically meaningful feature vectors are embedded into a three-dimensional manifold via PCA and UMAP — geometry emerges from poker mathematics, not manual mesh design.

**Status:** Production-readiness track — artifact-driven viewer, real-data pipeline, and manual projection API.

## Goals

- C++Con presentation material
- Quantitative finance portfolio project
- Technical research artifact
- Interactive page on a personal website subdomain

## Repository structure

```
visualizer/
├── apps/web/                 # Next.js + R3F viewer (two modes)
├── packages/
│   ├── feature-engine/       # Feature extraction (poker-calculations)
│   └── shared/               # Cross-package TypeScript types
├── pipeline/                 # Python embedding pipeline
│   ├── generate/
│   ├── embed/
│   └── analyze/
├── artifacts/                # Generated data (gitignored)
├── docs/                     # Architecture and research docs
├── package.json
└── pnpm-workspace.yaml
```

## Prerequisites

- **Node.js** ≥ 20
- **pnpm** ≥ 9
- **Python** ≥ 3.11 (for embedding pipeline tooling)

## Compute Policy

Do not run production poker generation, embedding, clustering, or release validation workloads on a laptop. Local work is limited to app development, typechecking, linting, unit tests, builds, artifact parsing, and tiny smoke runs only. Balanced-small and larger poker workloads belong on AWS Batch or another approved remote compute target.

Reasonable laptop work:

- `pnpm dev`, `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`
- API/viewer checks against already-generated CloudFront artifacts
- Tiny smoke runs such as one street with tens of records, only when needed to debug pipeline wiring

Remote-only by default:

- `1,326 + 25,000 + 25,000 + 25,000` balanced-small release generation
- Full `pnpm generate:all`
- Full `pnpm pipeline:embed`
- UMAP/HDBSCAN experiments and release validation over real artifact sets

## Local setup

### 1. Install JavaScript dependencies

```bash
cd visualizer
pnpm install
```

### 2. Build workspace packages (or use production build)

```bash
pnpm --filter @geometry-of-poker/web... build
```

Or build packages individually before `pnpm dev`:

```bash
pnpm --filter @geometry-of-poker/shared build
pnpm --filter @geometry-of-poker/feature-engine build
```

### 3. Run the web app

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The viewer loads generated local artifacts or CDN artifacts configured through `GOP_ARTIFACT_BASE_URL`.

### 4. Python pipeline tooling

```bash
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r pipeline/requirements.txt
```

Do not run full dataset generation from the laptop. Use the AWS release worker in [deploy/aws/README.md](deploy/aws/README.md) for production artifacts.

### 5. Run tests

```bash
pnpm --filter @geometry-of-poker/feature-engine test
pnpm typecheck
```

## Application modes

| Mode | Description | Status |
| --- | --- | --- |
| **Research Dataset Explorer** | Render precomputed 3D point cloud from artifacts | Artifact-driven UI |
| **Manual Hand Explorer** | Enter cards → extract → project → highlight neighbors | Production API path |

## Key dependencies

- [`poker-calculations`](https://www.npmjs.com/package/poker-calculations) — hand evaluation, equity, vulnerability (not reimplemented here)
- Next.js 15, React Three Fiber, Three.js, Zustand, Tailwind CSS
- Python: NumPy, pandas, scikit-learn, umap-learn, hdbscan

## Documentation

| Doc | Contents |
| --- | --- |
| [docs/architecture.md](docs/architecture.md) | System design, data flow, deployment |
| [docs/research-methodology.md](docs/research-methodology.md) | State definition, features, embedding, reproducibility |
| [docs/performance-analysis.md](docs/performance-analysis.md) | Throughput benchmarks, component runtime map |
| [docs/limitations.md](docs/limitations.md) | Epistemic and engineering boundaries |
| [docs/cppcon-talk-outline.md](docs/cppcon-talk-outline.md) | C++Con talk structure (6-beat narrative) |
| [docs/quant-firm-project-summary.md](docs/quant-firm-project-summary.md) | Interview / portfolio one-pager |
| [docs/feature-schema.md](docs/feature-schema.md) | 66-dim feature column reference |
| [docs/pipeline-embedding.md](docs/pipeline-embedding.md) | Python embed CLI and artifacts |
| [docs/dataset-generation.md](docs/dataset-generation.md) | CLI, output layout, scaling |

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start Next.js dev server |
| `pnpm build` | Build all packages and web app |
| `pnpm test` | Run package tests |
| `pnpm typecheck` | TypeScript check all packages |
| `pnpm pipeline:extract` | Feature extraction CLI |
| `pnpm generate --street flop --count 20 --seed 42` | Tiny local smoke dataset only |
| `pnpm generate:all` | Full release dataset; use AWS Batch, not laptop |
| `pnpm benchmark` | Artifact parse + load timing snapshot |

## Design decisions

1. **Monorepo with language split** — TypeScript for features + web (direct `poker-calculations` import); Python for sklearn/UMAP ecosystem.
2. **Published npm dependency** — `poker-calculations@2.2.0` from npm, not a local `file:` link, so the visualizer deploys independently.
3. **Artifact-driven rendering** — the web app loads precomputed binaries; no embedding at request time for Mode 1.
4. **Single GPU point cloud** — `Float32Array` positions in one `BufferGeometry`; no per-state React nodes.
5. **Explicit schema versioning** — `FEATURE_SCHEMA_VERSION` gates artifact compatibility.
6. **PCA kNN projection for Mode 2** — manual hands use the saved projection index and bounded nearest-neighbor interpolation in PCA space.

## Open technical risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| UMAP out-of-sample projection | Manual hands may land inaccurately | kNN interpolation; show neighbor distance confidence |
| Dataset size vs. browser memory | 500k+ points may stress mobile | LOD, octree culling, or server-side tile streaming |
| Metadata JSON at scale | Single JSON file too large | Shard by id range; use Parquet + indexed lookup |
| Feature extraction throughput | 1M states × MC equity is slow | Exact equity where possible; cache; worker pool |
| Suit isomorphism | 4× duplicate states inflate cloud | Canonicalize or weight; document choice |
| Cross-language scaler parity | TS normalize ≠ sklearn | Export scaler JSON from Python; test round-trip |
| `poker-calculations` API gaps | Some planned features may need new exports | Extend npm package in sibling `NPM/` repo |

## Implementation checklist

### Phase 0 — Scaffold ✅

- [x] Monorepo structure
- [x] Architecture and pipeline docs
- [x] Shared TypeScript types
- [x] Initial feature-engine, web app, and pipeline scripts
- [x] README and talk outline

### Phase 1 — Feature engine

- [ ] Finalize feature schema with poker-calculations API mapping
- [x] Implement `extractGeometryFeatures()` for compact columns
- [ ] Implement `normalizeFeatures()` with exported scaler JSON
- [ ] Unit tests against known hand scenarios
- [ ] CLI batch extraction

### Phase 2 — Dataset generation ✅ (pipeline)

- [x] `@geometry-of-poker/dataset-generator` package
- [x] Seeded sampling (`sampleRandomState`, `sampleRandomStates`, `generateStreetDataset`)
- [x] Per-street separation (preflop / flop / turn / river)
- [x] Parquet + Float32 binary + manifest + summary report
- [x] Resumable batches, validation, profiling
- [x] CLI: `pnpm generate`
- [ ] Run initial 1326 + 75k generation on machine with working native binding

### Phase 3 — Embedding + viewer

- [x] Per-street Python pipeline (Scaler → PCA → UMAP → HDBSCAN)
- [x] Artifacts: models, embedding.parquet, browser-points.bin, analysis-report.md
- [x] Feature-group experiments + seed stability
- [x] Out-of-sample projection sidecar (`projection-index.bin`)
- [ ] Run on real generated datasets (requires native poker-calculations)
- [x] Replace scaffold viewer with artifact-driven GPU cloud in web app

### Phase 4 — Manual hand explorer

- [ ] Wire validation → extraction → normalization
- [ ] kNN search (in-browser index or precomputed KD-tree)
- [ ] Camera fly-to animation
- [ ] Metrics panel with feature breakdown
- [ ] Highlight nearest neighbors in scene

### Phase 5 — Research polish

- [ ] HDBSCAN clustering + evaluation metrics
- [ ] Scale to 100k+ states
- [ ] Research notes with findings
- [ ] Performance profiling

### Phase 6 — Deploy + talk

- [ ] Run one-off `deploy/aws/release-worker.Dockerfile` Batch job or equivalent local release generation
- [ ] Upload validated release artifacts to S3/CloudFront
- [ ] Subdomain deployment
- [ ] C++Con slides and presentation rehearsal
- [ ] Portfolio write-up

## License

Private research project. Poker calculation primitives subject to `poker-calculations` license.
