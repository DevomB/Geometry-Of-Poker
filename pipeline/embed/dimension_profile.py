from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path

import numpy as np

from .analyze import cluster_stats, embedding_quality_metrics
from .config import EmbedConfig
from .fit import FitResult


def feature_group(name: str) -> str:
    if name == "streetIndex":
        return "meta"
    if name.startswith("category"):
        return "category"
    if name.startswith("equity") and "Runout" not in name:
        return "equity"
    if "Runout" in name:
        return "runout"
    if name in {"pNuts", "pDominated"} or "Vulnerability" in name:
        return "vulnerability"
    if name.startswith("board"):
        return "texture"
    if (
        "Draw" in name
        or "OutCount" in name
        or "Flush" in name
        or "Straight" in name
        or name.startswith("improvement")
        or name.startswith("cleanImprovement")
        or name == "gutshotFlag"
    ):
        return "draw"
    if name.startswith("removal"):
        return "removal"
    if name.startswith("transition"):
        return "transition"
    return "meta"


def _top_loadings(loadings: np.ndarray, feature_names: list[str], n: int = 8) -> list[dict]:
    order = np.argsort(np.abs(loadings))[::-1][:n]
    return [
        {
            "feature": feature_names[int(i)],
            "group": feature_group(feature_names[int(i)]),
            "loading": float(loadings[int(i)]),
            "direction": "positive" if loadings[int(i)] >= 0 else "negative",
        }
        for i in order
    ]


def _safe_corr(a: np.ndarray, b: np.ndarray) -> float:
    if len(a) < 2 or np.std(a) == 0 or np.std(b) == 0:
        return 0.0
    return float(np.corrcoef(a, b)[0, 1])


def _axis_correlations(X_scaled: np.ndarray, coords: np.ndarray, feature_names: list[str], n: int = 6) -> list[dict]:
    axes = []
    for axis_idx, axis_name in enumerate(("x", "y", "z")):
        correlations = [
            {
                "feature": feature_names[i],
                "group": feature_group(feature_names[i]),
                "correlation": _safe_corr(X_scaled[:, i], coords[:, axis_idx]),
            }
            for i in range(len(feature_names))
        ]
        correlations.sort(key=lambda row: abs(row["correlation"]), reverse=True)
        axes.append(
            {
                "axis": axis_name,
                "interpretation": "descriptive nonlinear layout coordinate",
                "topCorrelations": correlations[:n],
            }
        )
    return axes


def _group_contributions(result: FitResult) -> list[dict]:
    scores: dict[str, float] = defaultdict(float)
    for component_idx, variance in enumerate(result.explained_variance_ratio):
        component = result.pca.components_[component_idx]
        for feature_idx, loading in enumerate(component):
            group = feature_group(result.retained_features[feature_idx])
            scores[group] += float(abs(loading) * variance)
    total = sum(scores.values()) or 1.0
    rows = [
        {"group": group, "share": score / total, "score": score}
        for group, score in scores.items()
    ]
    return sorted(rows, key=lambda row: row["share"], reverse=True)


def build_dimension_profile(street: str, result: FitResult, config: EmbedConfig) -> dict:
    cstats = cluster_stats(result.labels)
    quality = embedding_quality_metrics(result.X_scaled, result.coords, config.knn_k)
    return {
        "version": "1.0.0",
        "street": street,
        "pointCount": int(result.coords.shape[0]),
        "method": "StandardScaler -> PCA -> UMAP -> HDBSCAN",
        "interpretation": {
            "kind": "empirical manifold diagnostics",
            "axisCaveat": "UMAP coordinates are nonlinear layout coordinates; use feature loadings and correlations as descriptive diagnostics, not independent poker dimensions.",
        },
        "pca": {
            "retainedComponents": int(result.pca_components),
            "explainedVarianceTotal": float(result.explained_variance_ratio.sum()),
            "explainedVarianceRatio": result.explained_variance_ratio.astype(float).tolist(),
            "components": [
                {
                    "component": int(i + 1),
                    "explainedVariance": float(result.explained_variance_ratio[i]),
                    "topLoadings": _top_loadings(result.pca.components_[i], result.retained_features),
                }
                for i in range(result.pca_components)
            ],
        },
        "featureGroups": _group_contributions(result),
        "umap": {
            "axes": _axis_correlations(result.X_scaled, result.coords, result.retained_features),
            "params": {
                "n_components": 3,
                "n_neighbors": config.umap_n_neighbors,
                "min_dist": config.umap_min_dist,
                "metric": config.umap_metric,
                "init": config.umap_init,
                "random_state": config.random_state,
            },
        },
        "hdbscan": {
            "clusters": cstats["n_clusters"],
            "noiseFraction": cstats["noise_pct"] / 100.0,
            "noiseCount": cstats["noise_count"],
        },
        "quality": {
            "trustworthiness": quality["trustworthiness"],
            "knnOverlap": quality["knn_overlap"],
            "k": quality["k"],
        },
    }


def write_dimension_profile(path: Path, street: str, result: FitResult, config: EmbedConfig) -> dict:
    profile = build_dimension_profile(street, result, config)
    path.write_text(json.dumps(profile, indent=2), encoding="utf-8")
    return profile
