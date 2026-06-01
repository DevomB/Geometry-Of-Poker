from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import umap
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler

from .analyze import embedding_quality_metrics, knn_overlap
from .config import EmbedConfig
from .fit import choose_pca_components
from .preprocess import drop_constant_columns


@dataclass
class ExperimentResult:
    name: str
    description: str
    retained_dim: int
    pca_dim: int
    trustworthiness: float
    knn_overlap: float
    n_clusters: int
    noise_pct: float
    skipped: bool = False
    skip_reason: str = ""


def _subsample(X: np.ndarray, n: int, seed: int) -> np.ndarray:
    if len(X) <= n:
        return X
    rng = np.random.default_rng(seed)
    idx = rng.choice(len(X), size=n, replace=False)
    return X[idx]


def run_experiment_variant(
    name: str,
    description: str,
    X: np.ndarray,
    feature_names: list[str],
    config: EmbedConfig,
) -> ExperimentResult:
    try:
        prep = drop_constant_columns(X, feature_names)
        X_sub = _subsample(prep.X, config.experiment_subsample, config.random_state)

        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X_sub)

        pca_full = PCA(random_state=config.random_state)
        pca_full.fit(X_scaled)
        n_comp = choose_pca_components(pca_full, config.pca_variance, config.pca_max_components)

        pca = PCA(n_components=n_comp, random_state=config.random_state)
        X_pca = pca.fit_transform(X_scaled)

        umap_model = umap.UMAP(
            n_components=3,
            n_neighbors=min(config.umap_n_neighbors, len(X_sub) - 1),
            min_dist=config.umap_min_dist,
            metric=config.umap_metric,
            random_state=config.random_state,
        )
        coords = umap_model.fit_transform(X_pca)

        import hdbscan

        labels = hdbscan.HDBSCAN(
            min_cluster_size=max(15, config.hdbscan_min_cluster_size // 3),
            min_samples=config.hdbscan_min_samples,
        ).fit_predict(coords)

        quality = embedding_quality_metrics(X_scaled, coords, config.knn_k)
        noise_pct = 100.0 * float(np.sum(labels == -1)) / len(labels)
        n_clusters = len(set(int(x) for x in labels if int(x) >= 0))

        return ExperimentResult(
            name=name,
            description=description,
            retained_dim=len(prep.retained_features),
            pca_dim=n_comp,
            trustworthiness=quality["trustworthiness"],
            knn_overlap=quality["knn_overlap"],
            n_clusters=n_clusters,
            noise_pct=noise_pct,
        )
    except Exception as exc:  # noqa: BLE001
        return ExperimentResult(
            name=name,
            description=description,
            retained_dim=0,
            pca_dim=0,
            trustworthiness=0.0,
            knn_overlap=0.0,
            n_clusters=0,
            noise_pct=0.0,
            skipped=True,
            skip_reason=str(exc),
        )


def seed_stability(
    X: np.ndarray,
    feature_names: list[str],
    config: EmbedConfig,
) -> dict:
    prep = drop_constant_columns(X, feature_names)
    X_sub = _subsample(prep.X, config.experiment_subsample, config.random_state)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_sub)

    pca_full = PCA(random_state=config.random_state)
    pca_full.fit(X_scaled)
    n_comp = choose_pca_components(pca_full, config.pca_variance, config.pca_max_components)
    pca = PCA(n_components=n_comp, random_state=config.random_state)
    X_pca = pca.fit_transform(X_scaled)

    embeddings = []
    for seed in config.stability_seeds:
        umap_model = umap.UMAP(
            n_components=3,
            n_neighbors=min(config.umap_n_neighbors, len(X_sub) - 1),
            min_dist=config.umap_min_dist,
            metric=config.umap_metric,
            random_state=seed,
        )
        embeddings.append(umap_model.fit_transform(X_pca))

    overlaps = []
    for i in range(len(embeddings)):
        for j in range(i + 1, len(embeddings)):
            overlaps.append(knn_overlap(embeddings[i], embeddings[j], k=config.knn_k))

    return {
        "seeds": list(config.stability_seeds),
        "pairwise_knn_overlap_mean": float(np.mean(overlaps)) if overlaps else 1.0,
        "pairwise_knn_overlap_min": float(np.min(overlaps)) if overlaps else 1.0,
        "interpretation": (
            "stable" if (overlaps and np.mean(overlaps) > 0.5) else "moderate" if (overlaps and np.mean(overlaps) > 0.3) else "sensitive"
        ),
    }
