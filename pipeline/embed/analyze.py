from __future__ import annotations

from collections import Counter, defaultdict

import numpy as np
import pandas as pd
from sklearn.manifold import trustworthiness
from sklearn.neighbors import NearestNeighbors

from .config import EmbedConfig
from .fit import FitResult


def knn_overlap(X_high: np.ndarray, X_low: np.ndarray, k: int = 15) -> float:
    n = len(X_high)
    k = min(k, n - 1)
    if k < 1:
        return 1.0
    nn_h = NearestNeighbors(n_neighbors=k + 1).fit(X_high)
    nn_l = NearestNeighbors(n_neighbors=k + 1).fit(X_low)
    _, idx_h = nn_h.kneighbors(X_high)
    _, idx_l = nn_l.kneighbors(X_low)
    overlaps = []
    for i in range(n):
        sh = set(idx_h[i, 1:])
        sl = set(idx_l[i, 1:])
        overlaps.append(len(sh & sl) / k)
    return float(np.mean(overlaps))


def cluster_stats(labels: np.ndarray) -> dict:
    counts = Counter(int(x) for x in labels)
    noise = counts.pop(-1, 0)
    total = len(labels)
    sizes = sorted(counts.values(), reverse=True)
    return {
        "n_clusters": len(counts),
        "noise_count": noise,
        "noise_pct": 100.0 * noise / total if total else 0.0,
        "cluster_sizes": sizes[:20],
        "largest_cluster": sizes[0] if sizes else 0,
    }


def category_by_cluster(embedding_df: pd.DataFrame) -> dict[int, dict[str, int]]:
    out: dict[int, dict[str, int]] = defaultdict(dict)
    for _, row in embedding_df.iterrows():
        cid = int(row["cluster_id"])
        cat = str(row["category"])
        out[cid][cat] = out[cid].get(cat, 0) + 1
    return dict(out)


def equity_by_cluster(embedding_df: pd.DataFrame) -> dict[int, dict[str, float]]:
    out: dict[int, dict[str, float]] = {}
    for cid, group in embedding_df.groupby("cluster_id"):
        eq = group["equity_vs_random"].astype(float)
        out[int(cid)] = {
            "mean": float(eq.mean()),
            "std": float(eq.std()),
            "min": float(eq.min()),
            "max": float(eq.max()),
        }
    return out


def representative_hands(
    embedding_df: pd.DataFrame,
    coords: np.ndarray,
    labels: np.ndarray,
    top_n: int = 3,
) -> dict[int, list[dict]]:
    reps: dict[int, list[dict]] = {}
    for cid in sorted(set(int(x) for x in labels if int(x) >= 0)):
        mask = labels == cid
        cluster_coords = coords[mask]
        centroid = cluster_coords.mean(axis=0)
        dists = np.linalg.norm(cluster_coords - centroid, axis=1)
        idxs = np.where(mask)[0]
        nearest = idxs[np.argsort(dists)[:top_n]]
        reps[cid] = []
        for idx in nearest:
            row = embedding_df.iloc[idx]
            reps[cid].append(
                {
                    "id": row["id"],
                    "hero": [row["hero0"], row["hero1"]],
                    "board": row["board"],
                    "category": row["category"],
                    "equityVsRandom": float(row["equity_vs_random"]),
                }
            )
    return reps


def embedding_quality_metrics(
    X_scaled: np.ndarray,
    coords: np.ndarray,
    k: int = 15,
) -> dict[str, float]:
    k = min(k, len(X_scaled) - 1)
    trust = float(trustworthiness(X_scaled, coords, n_neighbors=k))
    overlap = knn_overlap(X_scaled, coords, k=k)
    return {
        "trustworthiness": trust,
        "knn_overlap": overlap,
        "k": k,
    }


def build_analysis_context(
    street: str,
    result: FitResult,
    embedding_df: pd.DataFrame,
    config: EmbedConfig,
) -> dict:
    cstats = cluster_stats(result.labels)
    quality = embedding_quality_metrics(result.X_scaled, result.coords, config.knn_k)
    return {
        "street": street,
        "n_points": len(embedding_df),
        "original_dimensions": len(result.retained_features) + len([]),
        "retained_dimensions": len(result.retained_features),
        "pca_dimensions": result.pca_components,
        "explained_variance_total": float(result.explained_variance_ratio.sum()),
        "explained_variance_per_component": result.explained_variance_ratio.tolist(),
        "umap_params": {
            "n_components": 3,
            "n_neighbors": config.umap_n_neighbors,
            "min_dist": config.umap_min_dist,
            "metric": config.umap_metric,
            "random_state": config.random_state,
        },
        "hdbscan": cstats,
        "quality": quality,
        "category_by_cluster": category_by_cluster(embedding_df),
        "equity_by_cluster": equity_by_cluster(embedding_df),
        "representative_hands": representative_hands(
            embedding_df, result.coords, result.labels
        ),
    }
