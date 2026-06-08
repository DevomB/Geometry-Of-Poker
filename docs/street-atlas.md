# Street Atlas - Geometry of Poker

The street atlas summarizes the currently loaded street artifact. It is designed to answer a simple question before drilling into individual points:

```text
What does this sampled street population look like?
```

## Quantile summary

For each scalar channel, the atlas sorts all finite values:

```text
x_(1) <= x_(2) <= ... <= x_(n)
```

It reports minimum, first quartile, median, third quartile, and maximum. Quartiles use linear interpolation between adjacent sorted positions:

```text
position = q * (n - 1)
Q(q) = (1 - w) * x_floor(position) + w * x_ceil(position)
```

where `w` is the fractional part of `position`.

## Slice shares

Category and cluster rows are frequency estimates over the loaded artifact:

```text
share(label) = count(label) / n
```

Clicking a slice applies the corresponding viewer filter. The atlas is therefore both a statistical summary and a navigation surface.

## Claim boundary

The atlas describes the loaded sample, not the complete postflop state space. A 25,000-point flop artifact gives a useful empirical overview of that sampled artifact; it does not prove full-game frequencies unless the sampling design supports that claim.
