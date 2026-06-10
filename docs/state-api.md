# State Analysis API

Public endpoint for full combinatorial poker analysis of a Texas Hold'em hero-centric state. No 3D map, no artifact dependency.

> **Interactive docs:** see `/api-docs/state` on the deployed app for the full API reference with examples.

## Endpoint

```http
POST /api/state
Content-Type: application/json
```

Works on any hostname served by the same deployment (for example `geometry-of-poker` or a `gop` subdomain alias on the same Vercel project).

## Request

```json
{
  "hero": ["8d", "2d"],
  "board": ["4h", "9h", "Tc", "3d"],
  "deadCards": [],
  "exactFeatureBudget": "full"
}
```

| Field | Required | Description |
| --- | --- | --- |
| `hero` | yes | Exactly two card strings, e.g. `"As"`, `"Td"` |
| `board` | yes | `0`, `3`, `4`, or `5` community cards |
| `deadCards` | no | Known dead cards (default `[]`) |
| `street` | no | Inferred from board length if omitted |
| `exactFeatureBudget` | no | `"full"` (default) or `"production"` |

`exactFeatureBudget=full` enables exact runout quantiles (preflop–flop), runout vulnerability (flop–turn), removal summaries, and flop transition features where the engine supports them. `production` uses bounded Monte Carlo equity only and zeros expensive groups.

## Example

```bash
curl -sS -X POST "https://geometry-of-poker.vercel.app/api/state" \
  -H "Content-Type: application/json" \
  -d '{"hero":["8d","2d"],"board":["4h","9h","Tc","3d"]}'
```

## Response

```json
{
  "state": {
    "hero": ["8d", "2d"],
    "board": ["4h", "9h", "Tc", "3d"],
    "deadCards": [],
    "street": "turn"
  },
  "metadata": {
    "category": "highCard",
    "categoryIndex": 0
  },
  "equityVsRandom": 0.5647,
  "exactFeatureBudget": "full",
  "features": {
    "core": { "...": 0 },
    "runouts": { "...": 0 },
    "vulnerability": { "...": 0 },
    "board": { "...": 0 },
    "draws": { "...": 0 },
    "removal": { "...": 0 },
    "transitions": { "...": 0 }
  },
  "combinatorics": {
    "knownCards": 6,
    "remainingCards": 46,
    "legalVillainHands": "1035",
    "terminalLeaves": "45540",
    "flushOuts": 9,
    "straightOutCount": 0,
    "improvementOutCount": 9,
    "cleanImprovementOutCount": 9
  },
  "availability": {
    "equityRunout": false,
    "runoutVulnerability": true,
    "removalGradient": true,
    "categoryTransition": false,
    "drawFeatures": true
  },
  "limitations": [
    "Equity is vs a uniform random villain hand, not a range or GTO opponent.",
    "No bet sizing, position, stack depth, or multiway modeling is included.",
    "Runout quantiles are only defined for preflop and flop (board length ≤ 3)."
  ]
}
```

Large combinatorial counts (`legalVillainHands`, `terminalLeaves`) are serialized as decimal strings.

Check `availability` before interpreting feature groups — neutral zeros mean the metric was not computed for this street or budget.

## Errors

Structured JSON errors match other API routes:

```json
{
  "error": {
    "code": "DUPLICATE_CARD",
    "message": "Card As appears in both hero and board.",
    "field": "board"
  }
}
```

| Status | Code | Meaning |
| --- | --- | --- |
| 400 | `MALFORMED_CARD`, `DUPLICATE_CARD`, … | Invalid request |
| 413 | `PAYLOAD_TOO_LARGE` | Body over 2KB |
| 503 | `FEATURE_ENGINE_UNAVAILABLE` | Native `poker-calculations` binding missing |
| 500 | `STATE_ANALYSIS_FAILED` | Unexpected engine failure |

## Related routes

| Route | Purpose |
| --- | --- |
| `POST /api/project` | Feature extract + 3D map projection (requires release artifacts) |
| `POST /api/state-metrics` | Runout/vulnerability only (legacy backfill) |
| `GET /api/health` | Engine and artifact status |

## GOP subdomain

Add `gop.<your-domain>` as a **domain alias** on the same Vercel project — no separate codebase. Alternatively, configure a **path-preserving** DNS redirect from `gop.*` to the canonical host so `/api/state` paths are preserved.
