# Poker-Calculator (local workspace)

> Moved here from the parent `Poker-Calculator/` folder on 2026-09-30, when the local workspace was archived. It describes how the three repositories sat side by side on disk.

This folder on disk is **not** a git repository. It is a convenient place to keep **three separate projects** side by side for local development:

| Folder | Git remote (typical) | Role |
| --- | --- | --- |
| [NPM/](https://github.com/DevomB/Poker-Calculations) | [Poker-Calculations](https://github.com/DevomB/Poker-Calculations) | [`poker-calculations`](https://www.npmjs.com/package/poker-calculations) npm package |
| [visualizer/](https://github.com/DevomB/Geometry-Of-Poker) | [Geometry-Of-Poker](https://github.com/DevomB/Geometry-Of-Poker) | 3D manifold viewer + pipeline |
| [Website/](https://github.com/DevomB/Poker-Calculations-Website) | [Poker-Calculations-Website](https://github.com/DevomB/Poker-Calculations-Website) | Docusaurus API docs |

**Push, CI, and Vercel each apply to one repo only.** Do not assume GitHub Actions or deploy settings from one folder apply to the others.

## Geometry of Poker (visualizer repo)

- **Live app:** https://geometry-of-poker.devomb.com (Vercel)
- **Release process:** [visualizer/RELEASE.md](../../RELEASE.md)
- **Operator checklist:** [visualizer/NEXT_STEPS.md](../../NEXT_STEPS.md)

```bash
cd visualizer
pnpm install
pnpm dev
```

## Cross-repo workflow

1. Change C++ / npm API in **NPM** → publish to npm.
2. Bump `poker-calculations` in **visualizer** and **Website** `package.json` + lockfiles.
3. Deploy **visualizer** and **Website** from their own remotes.

See [AGENTS.md](AGENTS.md) and per-repo `AGENTS.md` files.
