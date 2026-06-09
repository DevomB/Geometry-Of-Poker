# Combinatorial Proofs - Geometry of Poker

This note records the exact counting arguments that the viewer can show for any selected state. These are pure deck-combinatorics statements; they do not depend on UMAP, clustering, heuristics, or strategic inference.

## State notation

Let a legal hero-centric state be:

```text
s = (h, b, d)
```

where `h` is the two-card hero hand, `b` is the public board, and `d` is an optional set of dead cards excluded from future villain and runout choices. Let:

```text
k = |h union b union d|
r = 52 - k
q = 5 - |b|
```

Here `r` is the number of live unseen cards before assigning a villain hand, and `q` is the number of public cards still needed to reach the river. For the precomputed dataset, `d` is empty. For manual projections, the picker can supply dead cards to study blocker-constrained universes.

## Legal villain hand count

A uniform random villain hand is an unordered two-card subset of the unseen deck. Therefore:

```text
|V(s)| = C(r, 2)
```

Proof: after removing hero and board cards, exactly `r` cards remain. A villain hand contains two distinct cards and card order is irrelevant, so the count is the binomial coefficient `C(r, 2)`.

## Street state universe

For a fixed street with `m = |b|` public board cards and `a = 52 - |d|` live cards before choosing hero cards, the full dead-card-conditioned hero-centric street universe is:

```text
|S_m(d)| = C(a, 2) * C(a - 2, m)
```

Proof: first remove dead cards. Choose the unordered two-card hero hand from the remaining `a` cards. Once the hero hand is removed, choose the unordered public board from the `a - 2` remaining cards. These choices are independent after the hero cards are removed, so the multiplication rule gives `C(a, 2) * C(a - 2, m)`. With no dead cards, `a = 52`, recovering `C(52, 2) * C(50, m)`.

Two useful selected-state slices also follow immediately:

```text
hero-fixed public boards = C(50 - |d|, m)
board-fixed hero hands = C(52 - |d| - m, 2)
```

The first holds the selected hero hand fixed and counts possible public boards on the same street. The second holds the selected public board fixed and counts legal two-card hero hands that do not collide with that board.

## Public runout count after villain

After a villain hand is fixed, two more cards are unavailable. The remaining public runout is an unordered `q`-card subset of `r - 2` cards:

```text
|R(s, v)| = C(r - 2, q)
```

For river states, `q = 0`, and `C(r - 2, 0) = 1`.

## Terminal equity leaf count

The terminal leaves in the declared uniform-villain equity universe are:

```text
L(s) = C(r, 2) * C(r - 2, q)
```

Proof: choose the unordered villain hand first, then choose the unordered public completion from the cards not used by hero, board, or villain. The multiplication rule applies because each legal villain choice has exactly `C(r - 2, q)` legal public completions.

For manual blocker scenarios, the viewer can compare the dead-card-conditioned leaf count with the no-dead baseline for the same hero and board:

```text
leafFraction(d) = L(h, b, d) / L(h, b, empty)
```

This is a pure count ratio. It proves how much of the original uniform-villain/runout enumeration universe remains after excluding the chosen dead cards; it does not claim that the removed leaves have equal strategic value.

The exact number of terminal leaves removed by the same dead-card set is the complement count:

```text
removedLeaves(d) = L(h, b, empty) - L(h, b, d)
```

Proof: `L(h, b, empty)` counts every villain/runout terminal leaf that is legal with only hero and board fixed. `L(h, b, d)` counts the subset of those leaves that avoids all dead cards. Because a leaf either uses at least one dead card or avoids all dead cards, the two classes are disjoint and exhaustive. Subtracting the live subset from the no-dead universe leaves exactly the dead-card-colliding complement.

The same complement argument applies to the street-state universe:

```text
removedStreetStates(d) = |S_m(empty)| - |S_m(d)|
```

Here `|S_m(empty)| = C(52, 2) * C(50, m)` and `|S_m(d)| = C(52 - |d|, 2) * C(50 - |d|, m)`. The difference counts hero/board street states that would exist with no dead cards but are invalid after the blocker set removes cards from the live deck.

## Blocker compatibility for reference points

Manual projections with dead cards are placed by feature-space interpolation against precomputed reference points. A reference point `p = (h_p, b_p)` is compatible with the manual blocker set `d` exactly when:

```text
d intersect (h_p union b_p) = empty
```

The viewer reports the collision count:

```text
C_blocker(p, d) = |d intersect (h_p union b_p)|
```

Proof: dead cards are removed from the live deck before villain and runout enumeration. If a reference point uses any card in `d`, then that point is not a legal state in the manual blocker's live deck. Counting the intersection gives zero exactly for compatible references and a positive integer exactly for incompatible references.

For a displayed nearest-neighbor set `N_k`, the compatible-neighbor count is:

```text
K_compatible = |{p in N_k : C_blocker(p, d) = 0}|
```

This is a set count over the shown reference neighbors, not a probability estimate over the full state space.

The manual projection also reports the compatible inverse-distance weight share. For neighbor distance `delta_p` and epsilon `eps > 0`:

```text
w_p = 1 / (delta_p + eps)
W_compatible = (sum_{p in N_k, C_blocker(p,d)=0} w_p) / (sum_{p in N_k} w_p)
```

This is the fraction of the displayed interpolation weight assigned to blocker-compatible references.

Examples:

| Street | Known cards | r | q | Leaves |
| --- | ---: | ---: | ---: | ---: |
| Preflop | 2 | 50 | 5 | C(50,2) * C(48,5) |
| Flop | 5 | 47 | 2 | C(47,2) * C(45,2) = 1,070,190 |
| Turn | 6 | 46 | 1 | C(46,2) * C(44,1) = 45,540 |
| River | 7 | 45 | 0 | C(45,2) = 990 |

## Next-card out probability

For flop and turn draw features, the next public card is one card from the currently unseen deck. If an exact enumeration finds `o` improving outs from `r` unseen cards, then:

```text
P(improve next card) = o / r
```

This is not an approximation. It follows from a uniform one-card draw over the unseen deck.

When the exact draw summary also marks `c` of those outs as clean, the viewer reports:

```text
dirtyOuts = o - c
blankCards = r - o
P(clean next card) = c / r
P(dirty next card) = (o - c) / r
P(miss next card) = (r - o) / r
```

Proof: clean outs are a subset of improvement outs by construction, so the improvement set splits into the disjoint union of clean and dirty improvement cards. The unseen deck also splits into improvement cards and non-improvement blanks. Dividing each disjoint count by the same one-card universe size `r` gives exact one-card probabilities, and the probabilities sum to one.

## Next-street branch count

The next public street deals `t` new public cards:

```text
t = 3 for preflop to flop
t = 1 for flop to turn
t = 1 for turn to river
```

Before assigning a future villain hand, the exact number of public next-street branches is:

```text
B_next(s) = C(r, t)
```

Proof: the next public street is an unordered subset of `t` cards from the `r` unseen cards. For river states there is no next public street, so this count is not reported.

## Leaf-scale standard error

The viewer reports a binomial-equivalent leaf-scale standard error:

```text
SE_leaf = sqrt(E * (1 - E) / L)
```

where `E` is the exact equity value and `L` is the terminal leaf count above. This number is a scale reference for the enumeration universe. It is not Monte Carlo error, because the engine equity is computed by exact combinatorial enumeration inside the declared model.

## Claim boundary

These proofs establish card-counting facts for the selected state and the default uniform-villain model. They do not prove optimal strategy, game-theoretic EV, cluster validity, or metric faithfulness of the 3D embedding.
