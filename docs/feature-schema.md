# Feature Schema — Geometry of Poker

Version: **1.0.0** (`@geometry-of-poker/feature-engine`)

Primary API:

```typescript
extractGeometryFeatures(state: PokerStateInput, options?: GeometryFeatureOptions): GeometryFeatureResult
```

## Modes

| Mode | Dimensions | Description |
| --- | ---: | --- |
| `compact` | **66** | Default; summaries only |
| `extended` | **199** | Adds 52 card-removal gradient + 81 flop category joint matrix |

Feature order is fixed in `packages/feature-engine/src/feature-order.ts`.

## Input contract

```typescript
interface PokerStateInput {
  hero: [string, string];
  board: string[];       // length 0 | 3 | 4 | 5
  deadCards?: string[];
}
```

Validation rejects invalid card strings, duplicates, invalid board lengths, hero cards on board, and dead-card collisions.

## Availability flags

When a feature group cannot be computed for a street, scalar features use **0** and a companion `*Available` flag is **0**. Never `undefined`, never `NaN`.

| Flag | Available when |
| --- | --- |
| `equityRunoutAvailable` | Board length ≤ 3 (preflop–flop) |
| `runoutVulnerabilityAvailable` | Board length 3–4 (flop–turn) |
| `boardFeaturesAvailable` | Board length ≥ 3 |
| `drawFeaturesAvailable` | Board length 3–4 (flop–turn) |
| `removalGradientAvailable` | Card-removal gradient computed successfully |
| `categoryTransitionAvailable` | Flop only (board length 3) |

---

## Core features

### `equityVsRandom`

| | |
| --- | --- |
| **Definition** | Heads-up equity vs a uniformly random villain hand |
| **Range** | `[0, 1]` |
| **Streets** | All |
| **Source** | Production budget: seeded bounded `simulateHandOutcomeDetailed(hero, board, 4096, seed)`; full budget: `exactHuEquityVsRandomHand(hero, board)` |
| **Type** | Seeded Monte Carlo in production; exact in full budget |

### `categoryIndex`

| | |
| --- | --- |
| **Definition** | Integer rank of hero's best five-card category |
| **Range** | `[0, 9]` — `highCard` … `royalFlush` |
| **Streets** | All |
| **Source** | `handRankCategoryOrder(evaluateHandCategory(hero, board))` |
| **Type** | Exact |

### `streetIndex`

| | |
| --- | --- |
| **Definition** | Numeric street encoding |
| **Range** | `{0=preflop, 1=flop, 2=turn, 3=river}` |
| **Streets** | All |
| **Source** | Derived from board length |
| **Type** | Derived |

### Category one-hot (`categoryHighCard` … `categoryRoyalFlush`)

| | |
| --- | --- |
| **Definition** | One-hot encoding of made-hand category; `onePair` → `categoryPair` |
| **Range** | `{0, 1}` — exactly one active |
| **Streets** | All |
| **Source** | `evaluateHandCategory` |
| **Type** | Exact |

---

## Runout equity distribution

Requires `equityRunoutAvailable = 1`.

### `equityMean`, `equityVariance`, `equityP05`, `equityP50`, `equityP95`

| | |
| --- | --- |
| **Definition** | Mean, variance, and quantiles of hero equity vs random over all uniform runouts from the current board |
| **Range** | Mean/quantiles: `[0, 1]`; variance: `[0, 0.25]` |
| **Streets** | Preflop–flop only |
| **Source** | `exactHeroEquityRunoutQuantiles(hero, board)` (no range → vs random) |
| **Type** | Exact |

**Production budget:** balanced-small generation sets these fields to neutral zeros and `equityRunoutAvailable = 0`. Use `--exact-feature-budget full` only for small research runs. `poker-calculations` rejects board length > 3 for this API; turn/river use neutral zeros.

---

## Runout vulnerability

Requires `runoutVulnerabilityAvailable = 1`.

### `pNuts`, `pDominated`

| | |
| --- | --- |
| **Definition** | Fraction of uniform runouts where hero holds nuts / is dominated |
| **Range** | `[0, 1]` |
| **Streets** | Flop–turn only |
| **Source** | `exactHeroRunoutVulnerability(hero, board, deadCards)` |
| **Type** | Exact |

**Production budget:** balanced-small generation sets these fields to neutral zeros and `runoutVulnerabilityAvailable = 0`. Use `--exact-feature-budget full` only for small research runs. Not defined for preflop or river (requires incomplete board 3–4).

---

## Board texture features

Requires `boardFeaturesAvailable = 1`. All metrics are **suit-invariant** (use counts, not suit labels).

### `boardRankDistinctCount`

Unique ranks on board. Range: `[1, 5]`. Derived.

### `boardPairCount`

Number of ranks appearing exactly twice. Range: `[0, 2]`. Derived.

### `boardTripsFlag` / `boardQuadsFlag`

Binary flags for any rank appearing ≥3 / exactly 4 times. Range: `{0, 1}`. Derived.

### `boardPairednessScore`

\((n - d) / \max(1, n-1)\) where \(n\) = board size, \(d\) = distinct ranks. Range: `[0, 1]`. Derived.

### `boardMaxSuitCount`

Maximum cards sharing one suit on board. Range: `[1, 5]`. Derived.

### `boardDistinctSuitCount`

Unique suits on board. Range: `[1, 4]`. Derived.

### `boardRainbowFlag`

`1` iff all board cards differ in suit and \(n \geq 3\). Range: `{0, 1}`. Derived.

### `boardTwoToneFlag`

`1` iff max suit count is 2 and at least two suits appear. Range: `{0, 1}`. Derived.

### `boardMonotoneFlag`

`1` iff all board cards share one suit. Range: `{0, 1}`. Derived.

### `boardConnectivityScore`

For sorted unique board ranks, fraction of adjacent rank pairs differing by 1:

\[\text{connectivity} = \frac{\#\{(r_i, r_{i+1}) : r_{i+1} - r_i = 1\}}{\max(1, u - 1)}\]

Range: `[0, 1]`. Derived.

### `boardBroadwayDensity`

Fraction of board cards with rank ≥ T (index ≥ 8). Range: `[0, 1]`. Derived.

### `boardHighCardNormalized` / `boardLowCardNormalized`

Highest / lowest board rank divided by 12 (Ace-high). Range: `[0, 1]`. Derived.

---

## Draw features

Requires `drawFeaturesAvailable = 1`. Computed by **exact enumeration** of each remaining deck card as the next board card.

### `flushOutCount`

Count of remaining cards that complete a flush (category ≥ flush) on the next street when not already made. Range: `[0, 13]`. Derived (exact enumeration).

### `backdoorFlushFlag`

On flop only: `1` if no one-card flush out exists but some two-card runout completes a flush. Range: `{0, 1}`. Derived (exact enumeration).

### `straightOutCount`

Remaining cards completing a straight (category ≥ straight) on next street. Range: `[0, 13]`. Derived.

### `openEndedStraightDrawFlag`

`1` iff `straightOutCount === 8` and out ranks span ≤ 4 (open-ended pattern). Range: `{0, 1}`. Derived.

### `gutshotFlag`

`1` iff `straightOutCount === 4`. Range: `{0, 1}`. Derived.

### `doubleGutshotFlag`

`1` iff `straightOutCount === 8` but not open-ended (two gutshot windows). Range: `{0, 1}`. Derived.

### `comboDrawFlag`

`1` iff both flush and straight outs exist. Range: `{0, 1}`. Derived.

### `improvementOutCount`

Cards where `evaluateHandStrengthFast` strictly increases. Range: `[0, 52]`. Derived (exact).

### `cleanImprovementOutCount`

Improvement outs excluding `exactVillainLeapfrogOutCounts.leapfrogDeckIndices`. Range: `[0, 52]`. Derived (exact).

### `improvementProbabilityNextCard`

`hypergeometricOneCardHitProbability(improvementOutCount, unseenCards)`. Range: `[0, 1]`. Exact (via poker-calculations helper).

**Streets:** Flop–turn only. Preflop/river neutral.

---

## Card-removal gradient summaries

Default villain range: uniform `Float64Array(1326)` unless `options.villainRange` supplied.

Gradient definition per deck index \(c\):

\[\nabla_c = \text{Equity}(\text{range}) - \text{Equity}(\text{range filtered by dead } c)\]

Summaries computed over **active** (non-blocked) indices only:

| Feature | Definition | Range |
| --- | --- | --- |
| `removalGradientMean` | Mean of active gradient | ℝ |
| `removalGradientStdDev` | Std dev | `[0, ∞)` |
| `removalGradientMin` / `Max` | Min / max | ℝ |
| `removalGradientL1` | \(\sum \|\nabla_c\|\) | `[0, ∞)` |
| `removalGradientL2` | \(\sqrt{\sum \nabla_c^2}\) | `[0, ∞)` |
| `removalGradientPositiveMass` | \(\sum_{\nabla>0} \nabla\) | `[0, ∞)` |
| `removalGradientNegativeMass` | \(\sum_{\nabla<0} \|\nabla\|\) | `[0, ∞)` |

**Source:** `exactEquityCardRemovalGradient(hero, board, range)` — Exact.

### Extended only: `removalGradientDeck0` … `removalGradientDeck51`

Full 52-dimensional gradient (blocked cards are 0). Range: ℝ per dimension.

---

## Category transition features (flop only)

From `exactHeroCategoryJointFlopToRiver(hero, flop, dead).jointMatrix` — 9×9 row-major probabilities \(P(\text{turn cat}, \text{river cat})\).

### Compact summaries

| Feature | Definition | Range |
| --- | --- | --- |
| `transitionEntropy` | \(-\sum p \log p\) | `[0, \log 81]` |
| `transitionMaxProbability` | \(\max p_{ij}\) | `[0, 1]` |
| `transitionStdDev` | Std dev of all 81 cells | `[0, 0.5]` |
| `transitionDiagonalMass` | \(\sum_i p_{ii}\) | `[0, 1]` |
| `transitionUpgradeMass` | \(\sum_{j>i} p_{ij}\) | `[0, 1]` |
| `transitionDowngradeMass` | \(\sum_{j<i} p_{ij}\) | `[0, 1]` |
| `transitionRiverPairOrBetterMass` | River column ≥ pair | `[0, 1]` |
| `transitionRiverFlushOrBetterMass` | River column ≥ flush | `[0, 1]` |

**Streets:** Flop only. Turn/preflop/river neutral.

### Extended only: `categoryJointTurn{i}River{j}`

81 matrix entries \(p_{ij}\). Range: `[0, 1]`.

---

## Compact feature order (66)

1. Core scalars (3): `equityVsRandom`, `categoryIndex`, `streetIndex`
2. Category one-hot (10)
3. Runout (6): mean, variance, p05, p50, p95, available
4. Vulnerability (3): pNuts, pDominated, available
5. Board (15): 14 texture + available
6. Draws (11): 10 draw + available
7. Removal summaries (9): 8 stats + available
8. Transition summaries (9): 8 stats + available

## Extended additions (133)

- `removalGradientDeck0` … `removalGradientDeck51` (52)
- `categoryJointTurn0River0` … `categoryJointTurn8River8` (81)

**Total extended: 199**

---

## Design rules enforced

1. Every dimension has an explicit name in `featureNames`.
2. Documented ranges above; outputs validated finite at extraction time.
3. Fixed deterministic ordering via `COMPACT_FEATURE_ORDER` / `EXTENDED_FEATURE_ORDER`.
4. No undefined dimensions; unavailable → 0 + flag.
5. `evaluateHandStrengthFast` used only for pairwise improvement comparison, never exported as a feature.
6. No raw deck indices as ordinal features.
7. Board/draw metrics are suit-invariant.

---

## Known `poker-calculations` limitations

| API | Limitation |
| --- | --- |
| `exactHeroEquityRunoutQuantiles` | Board length ≤ 3 only |
| `exactHeroRunoutVulnerability` | Board length 3–4 only |
| `exactHeroCategoryJointFlopToRiver` | Flop (3 cards) only |
| `exactVillainLeapfrogOutCounts` | Board length 3–4 only |
| `exactEquityCardRemovalGradient` | Requires explicit villain range (no default random shorthand) |
| Category label | API returns `onePair`, not `pair` |

## Suggested upstream APIs

| Proposal | Benefit |
| --- | --- |
| `exactHeroEquityRunoutQuantiles` for turn (4-card board) | Turn runout stats without neutral flags |
| `exactDrawOutEnumeration(hero, board, dead)` | Native flush/straight/clean-out counts |
| `defaultUniformVillainRange()` | Avoid manual 1326-vector construction |
| `exactHeroCategoryJointTurnToRiver` | Turn transition matrix for extended mode |
| Export scaler-friendly JSON from gradient result | Pipeline parity |
