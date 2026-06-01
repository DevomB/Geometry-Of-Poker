# Dataset Generation

Reproducible per-street datasets via `@geometry-of-poker/dataset-generator`.

## Requirements

- Working `poker-calculations` native addon (Node 18–22 with matching prebuild)
- ~2 GB RAM for 25k postflop streets (compact mode)

## CLI

```bash
cd visualizer

# Single street
pnpm generate --street flop --count 25000 --seed 42 --mode compact

# All initial streets (preflop 1326 + 25k each postflop)
pnpm generate:all

# Resume interrupted batch
pnpm generate --street turn --count 25000 --seed 42 --resume
```

### Options

| Flag | Default | Description |
| --- | --- | --- |
| `--street` | required | `preflop` \| `flop` \| `turn` \| `river` |
| `--count` | 1326 / 25000 | Target record count |
| `--seed` | 42 | PRNG seed (reproducible) |
| `--mode` | `compact` | `compact` (66) or `extended` (199) |
| `--batch-size` | 1000 | Records per resumable shard |
| `--resume` | false | Skip completed batches |
| `--all` | false | Generate all four streets |
| `--artifacts` | `artifacts/` | Output root |

## Output layout (per street)

```
artifacts/datasets/flop/
  manifest.json           # schema, seed, timing, validation
  summary-report.json     # feature stats, correlations, sizes
  records.parquet         # full dataset for Python pipeline
  vectors.f32.bin         # Float32 matrix for browser (GOPK header)
  sample.json             # 20-record debug subset
  shards/                 # resumable batch parquets
  .generation-progress.json
```

## Dataset record schema

```typescript
interface DatasetRecord {
  id: string;
  hero: [string, string];
  board: string[];
  street: 'preflop' | 'flop' | 'turn' | 'river';
  vector: number[];
  metadata: {
    category: string;
    categoryIndex: number;
    equityVsRandom: number;
  };
}
```

## Preflop modes

| Mode | Count | Strategy |
| --- | --- | --- |
| `enumerate1326` | 1326 | All C(52,2) hole pairs (default) |
| `canonical169` | ≤169 | One representative per suit-canonical class |
| `random` | user | Subsample of 1326 with seed |

## Scaling

| Tier | Count / street | Notes |
| --- | --- | --- |
| Dev | 1,000 | Fast smoke test |
| Initial | 25,000 | Default postflop |
| Research | 100,000 | `--count 100000` |
| Large | 1,000,000 | Batch + SSD; expect hours |

## Performance notes

Feature extraction bottlenecks (typical):

1. **removal** — `exactEquityCardRemovalGradient` (52 equity solves)
2. **transitions** — `exactHeroCategoryJointFlopToRiver` (flop only)
3. **core runouts** — `exactHeroEquityRunoutQuantiles` (preflop–flop)

Recommended scaling: batch size 1000–5000, street-separated pipelines, cache villain uniform range, future upstream batch APIs.

## Validation

Post-generation checks:

- Legal states (`validatePokerStateInput`)
- Finite vectors, fixed dimension
- Feature names match schema
- No duplicate cards per state
- First record reproducible from seed
- Binary vector header matches Parquet count

See `manifest.json` → `validation` and `summary-report.json`.
