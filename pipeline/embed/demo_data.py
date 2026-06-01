"""Generate synthetic parquet for pipeline smoke tests when real datasets are unavailable."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

from .features import COMPACT_FEATURE_ORDER, sanitize_column


def generate_demo_parquet(street: str, count: int, seed: int, output: Path) -> Path:
    rng = np.random.default_rng(seed)
    output.parent.mkdir(parents=True, exist_ok=True)

    rows = []
    deck = [f"{r}{s}" for r in "23456789TJQKA" for s in "cdhs"]

    for i in range(count):
        cards = rng.choice(deck, size=7, replace=False)
        hero = [cards[0], cards[1]]
        blen = {"preflop": 0, "flop": 3, "turn": 4, "river": 5}[street]
        board = list(cards[2 : 2 + blen])
        vec = rng.normal(size=len(COMPACT_FEATURE_ORDER))
        vec[0] = rng.uniform(0.2, 0.8)  # equityVsRandom
        row = {
            "id": f"{street}-{seed}-{i:08d}",
            "hero0": hero[0],
            "hero1": hero[1],
            "board_json": json.dumps(board),
            "street": street,
            "category": "highCard",
            "category_index": 0,
            "equity_vs_random": float(vec[0]),
        }
        for name, val in zip(COMPACT_FEATURE_ORDER, vec):
            row[sanitize_column(name)] = float(val)
        rows.append(row)

    df = pd.DataFrame(rows)
    df.to_parquet(output, index=False)
    return output
