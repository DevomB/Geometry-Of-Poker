# Combinatorial Proofs - Geometry of Poker

This note records the exact counting arguments that the viewer can show for any selected state. These are pure deck-combinatorics statements; they do not depend on UMAP, clustering, heuristics, or strategic inference.

## State notation

Let a legal hero-centric state be:

```text
s = (h, b)
```

where `h` is the two-card hero hand and `b` is the public board. Let:

```text
k = |h union b|
r = 52 - k
q = 5 - |b|
```

Here `r` is the number of unseen cards before assigning a villain hand, and `q` is the number of public cards still needed to reach the river.

## Legal villain hand count

A uniform random villain hand is an unordered two-card subset of the unseen deck. Therefore:

```text
|V(s)| = C(r, 2)
```

Proof: after removing hero and board cards, exactly `r` cards remain. A villain hand contains two distinct cards and card order is irrelevant, so the count is the binomial coefficient `C(r, 2)`.

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

## Leaf-scale standard error

The viewer reports a binomial-equivalent leaf-scale standard error:

```text
SE_leaf = sqrt(E * (1 - E) / L)
```

where `E` is the exact equity value and `L` is the terminal leaf count above. This number is a scale reference for the enumeration universe. It is not Monte Carlo error, because the engine equity is computed by exact combinatorial enumeration inside the declared model.

## Claim boundary

These proofs establish card-counting facts for the selected state and the default uniform-villain model. They do not prove optimal strategy, game-theoretic EV, cluster validity, or metric faithfulness of the 3D embedding.
