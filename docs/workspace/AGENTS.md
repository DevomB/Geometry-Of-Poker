# Agent guide — three-repo local workspace

> Moved here from the parent `Poker-Calculator/` folder on 2026-09-30, when the local workspace was archived. It describes how the three repositories sat side by side on disk.

The parent `Poker-Calculator/` directory has **no `.git`**. Three **independent repositories** usually live here as sibling folders:

| Folder | Repo | Deploy / publish |
| --- | --- | --- |
| `NPM/` | Poker-Calculations | **npm** (`poker-calculations`) |
| `visualizer/` | Geometry-Of-Poker | **Vercel** + S3/CloudFront artifacts |
| `Website/` | Poker-Calculations-Website | **Vercel** (docs) |

CI, GitHub Actions, and Vercel only see **one repo at a time**. Paths like `../NPM` exist on your machine only.

## Required reading

- **Visualizer (this product):** [visualizer/RELEASE.md](../../RELEASE.md), [visualizer/NEXT_STEPS.md](../../NEXT_STEPS.md)
- **Website / docs:** [Website/AGENTS.md](https://github.com/DevomB/Poker-Calculations-Website/blob/main/AGENTS.md)
- **Maintaining MDX API pages:** [Website/MAINTAINING-DOCS.md](https://github.com/DevomB/Poker-Calculations-Website/blob/main/MAINTAINING-DOCS.md)

## Rules

1. Do not commit `file:../NPM` (or any `file:../…`) in **Website** or **visualizer** lockfiles intended for CI.
2. Publish `poker-calculations` from **NPM/**, then bump the version in the other repos.
3. When editing **visualizer**, treat `visualizer/` as the repo root (`.github/`, `pnpm-workspace.yaml`, `apps/web/`).
4. Do not import package subpaths unless listed in that package’s npm `exports`.
