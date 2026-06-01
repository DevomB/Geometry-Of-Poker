# Geometry of Poker

Research-grade interactive 3D visualization of Texas Hold'em state space. Strategically meaningful feature vectors are embedded into a three-dimensional manifold via PCA and UMAP — geometry emerges from poker mathematics, not manual mesh design.

**Status:** Phase 0 scaffold — architecture, types, and placeholders only.

## Goals

- C++Con presentation material
- Quantitative finance portfolio demonstration
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
- **Python** ≥ 3.11 (for embedding pipeline, later phases)

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

Open [http://localhost:3000](http://localhost:3000). You should see a placeholder point cloud and mode switcher.

### 4. Python pipeline (optional, not functional yet)

```bash
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r pipeline/requirements.txt
python pipeline/generate/build_dataset.py   # prints placeholder message
```

### 5. Run tests

```bash
pnpm --filter @geometry-of-poker/feature-engine test
pnpm typecheck
```

## Application modes

| Mode | Description | Status |
| --- | --- | --- |
| **Research Dataset Explorer** | Render precomputed 3D point cloud from artifacts | Placeholder UI |
| **Manual Hand Explorer** | Enter cards → extract → project → highlight neighbors | Placeholder UI |

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
| [docs/manifold-findings.md](docs/manifold-findings.md) | Findings template for cluster interpretation |
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
| `pnpm pipeline:extract` | Feature extraction CLI (placeholder) |
| `pnpm generate --street flop --count 25000 --seed 42` | Generate one street dataset |
| `pnpm generate:all` | Generate all four initial street datasets |
| `pnpm pipeline:embed:demo` | UMAP embedding (synthetic demo data) |
| `pnpm pipeline:cluster` | HDBSCAN clustering |
| `pnpm benchmark` | Artifact parse + load timing snapshot |

## Design decisions

1. **Monorepo with language split** — TypeScript for features + web (direct `poker-calculations` import); Python for sklearn/UMAP ecosystem.
2. **Published npm dependency** — `poker-calculations@2.2.0` from npm, not a local `file:` link, so the visualizer deploys independently.
3. **Artifact-driven rendering** — the web app loads precomputed binaries; no embedding at request time for Mode 1.
4. **Single GPU point cloud** — `Float32Array` positions in one `BufferGeometry`; no per-state React nodes.
5. **Explicit schema versioning** — `FEATURE_SCHEMA_VERSION` gates artifact compatibility.
6. **kNN fallback for Mode 2** — UMAP out-of-sample transform is unreliable; nearest-neighbor interpolation in feature space is the planned default.

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
- [x] Placeholder feature-engine, web app, Python scripts
- [x] README and talk outline

### Phase 1 — Feature engine

- [ ] Finalize feature schema with poker-calculations API mapping
- [ ] Implement `extractFeatures()` for all columns
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
- [x] Out-of-sample projection (UMAP transform + kNN fallback)
- [ ] Run on real generated datasets (requires native poker-calculations)
- [ ] Replace placeholder with artifact-driven GPU cloud in web app

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

- [ ] Copy artifacts to CDN / Vercel Blob
- [ ] Subdomain deployment
- [ ] C++Con slides and demo rehearsal
- [ ] Portfolio write-up

## License

Private research project. Poker calculation primitives subject to `poker-calculations` license.
