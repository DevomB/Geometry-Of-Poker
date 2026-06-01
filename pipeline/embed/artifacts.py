from __future__ import annotations

import json
import struct
from pathlib import Path

import numpy as np
import pandas as pd

from .load import metadata_frame, parse_board, summary_metrics_row


BINARY_MAGIC = b"GOPK"
BINARY_VERSION = 1


def write_browser_points(path: Path, coords: np.ndarray) -> None:
    """Float32 xyz interleaved with GOPK header (matches TypeScript convention)."""
    count, dim = coords.shape
    assert dim == 3
    header = struct.pack("<4sIII", BINARY_MAGIC, BINARY_VERSION, count, dim)
    body = coords.astype(np.float32).tobytes(order="C")
    path.write_bytes(header + body)


def build_embedding_dataframe(
    meta: pd.DataFrame,
    coords: np.ndarray,
    labels: np.ndarray,
    df: pd.DataFrame,
    retained_cols: list[str],
) -> pd.DataFrame:
    rows = []
    for i in range(len(meta)):
        board = parse_board(str(meta.iloc[i]["board_json"]))
        summary = summary_metrics_row(df, i, retained_cols)
        rows.append(
            {
                "id": meta.iloc[i]["id"],
                "x": float(coords[i, 0]),
                "y": float(coords[i, 1]),
                "z": float(coords[i, 2]),
                "cluster_id": int(labels[i]),
                "hero0": meta.iloc[i]["hero0"],
                "hero1": meta.iloc[i]["hero1"],
                "board_json": meta.iloc[i]["board_json"],
                "board": " ".join(board),
                "category": meta.iloc[i]["category"],
                "category_index": int(meta.iloc[i]["category_index"]),
                "equity_vs_random": float(meta.iloc[i]["equity_vs_random"]),
                **{f"summary_{k}": v for k, v in summary.items()},
            }
        )
    return pd.DataFrame(rows)


def write_browser_metadata(path: Path, embedding_df: pd.DataFrame, street: str) -> None:
    points = []
    for _, row in embedding_df.iterrows():
        board = parse_board(str(row["board_json"]))
        summary = {
            k.replace("summary_", ""): row[k]
            for k in row.index
            if str(k).startswith("summary_")
        }
        points.append(
            {
                "id": row["id"],
                "hero": [row["hero0"], row["hero1"]],
                "board": board,
                "clusterId": int(row["cluster_id"]),
                "category": row["category"],
                "equityVsRandom": float(row["equity_vs_random"]),
                "x": float(row["x"]),
                "y": float(row["y"]),
                "z": float(row["z"]),
                "summary": summary,
            }
        )

    payload = {
        "version": "1.0.0",
        "street": street,
        "count": len(points),
        "points": points,
    }
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def save_artifacts(
    output_dir: Path,
    street: str,
    df: pd.DataFrame,
    coords: np.ndarray,
    labels: np.ndarray,
    retained_cols: list[str],
) -> pd.DataFrame:
    output_dir.mkdir(parents=True, exist_ok=True)
    meta = metadata_frame(df)
    embedding_df = build_embedding_dataframe(meta, coords, labels, df, retained_cols)

    embedding_df.to_parquet(output_dir / "embedding.parquet", index=False)
    write_browser_points(output_dir / "browser-points.bin", coords)
    write_browser_metadata(output_dir / "browser-metadata.json", embedding_df, street)

    return embedding_df
