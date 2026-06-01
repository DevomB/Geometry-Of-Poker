from __future__ import annotations

import json

import numpy as np
import pandas as pd

from .features import META_COLUMNS, compact_columns_sanitized, parquet_feature_columns, sanitize_column


def load_parquet(path: str | Path) -> pd.DataFrame:
    df = pd.read_parquet(path)
    if "id" not in df.columns:
        raise ValueError("Parquet missing required column: id")
    return df


def feature_matrix(
    df: pd.DataFrame,
    feature_cols: list[str] | None = None,
    exclude: list[str] | None = None,
) -> tuple[np.ndarray, list[str]]:
    cols = feature_cols or parquet_feature_columns(list(df.columns))
    if exclude:
        exclude_s = {sanitize_column(x) for x in exclude}
        cols = [c for c in cols if c not in exclude_s]
    if not cols:
        raise ValueError("No feature columns found in parquet")
    X = df[cols].to_numpy(dtype=np.float64)
    return X, cols


def metadata_frame(df: pd.DataFrame) -> pd.DataFrame:
    out = pd.DataFrame(
        {
            "id": df["id"],
            "hero0": df["hero0"],
            "hero1": df["hero1"],
            "board_json": df["board_json"],
            "category": df["category"],
            "category_index": df["category_index"],
            "equity_vs_random": df["equity_vs_random"],
        }
    )
    if "street" in df.columns:
        out["street"] = df["street"]
    return out


def parse_board(board_json: str) -> list[str]:
    return json.loads(board_json)


def summary_metrics_row(df: pd.DataFrame, row_idx: int, retained_cols: list[str]) -> dict[str, float]:
    """Selected summary metrics for browser metadata."""
    mapping = {
        "equityVsRandom": "equity_vs_random",
        "equityMean": sanitize_column("equityMean"),
        "pNuts": sanitize_column("pNuts"),
        "pDominated": sanitize_column("pDominated"),
        "flushOutCount": sanitize_column("flushOutCount"),
        "straightOutCount": sanitize_column("straightOutCount"),
        "removalGradientMean": sanitize_column("removalGradientMean"),
        "transitionEntropy": sanitize_column("transitionEntropy"),
    }
    out: dict[str, float] = {}
    for label, col in mapping.items():
        if col in df.columns:
            out[label] = float(df.iloc[row_idx][col])
        elif label == "equityVsRandom":
            out[label] = float(df.iloc[row_idx]["equity_vs_random"])
    return out
