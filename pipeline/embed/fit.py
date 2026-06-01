from __future__ import annotations

from dataclasses import dataclass

import hdbscan
import joblib
import numpy as np
import umap
from sklearn.decomposition import PCA
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import StandardScaler

from .config import EmbedConfig


@dataclass
class FitResult:
    scaler: StandardScaler
    pca: PCA
    umap_model: umap.UMAP
    clusterer: hdbscan.HDBSCAN
    X_scaled: np.ndarray
    X_pca: np.ndarray
    coords: np.ndarray
    labels: np.ndarray
    pca_components: int
    explained_variance_ratio: np.ndarray
    retained_features: list[str]


def choose_pca_components(pca_full: PCA, variance_target: float, max_components: int) -> int:
    cumulative = np.cumsum(pca_full.explained_variance_ratio_)
    n = int(np.searchsorted(cumulative, variance_target) + 1)
    n = min(n, max_components, len(cumulative))
    return max(1, n)


def fit_embedding_pipeline(
    X: np.ndarray,
    retained_features: list[str],
    config: EmbedConfig,
) -> FitResult:
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    pca_full = PCA(random_state=config.random_state)
    pca_full.fit(X_scaled)
    n_components = choose_pca_components(pca_full, config.pca_variance, config.pca_max_components)

    pca = PCA(n_components=n_components, random_state=config.random_state)
    X_pca = pca.fit_transform(X_scaled)

    umap_model = umap.UMAP(
        n_components=3,
        n_neighbors=config.umap_n_neighbors,
        min_dist=config.umap_min_dist,
        metric=config.umap_metric,
        random_state=config.random_state,
    )
    coords = umap_model.fit_transform(X_pca)

    clusterer = hdbscan.HDBSCAN(
        min_cluster_size=config.hdbscan_min_cluster_size,
        min_samples=config.hdbscan_min_samples,
        metric="euclidean",
        cluster_selection_method="eom",
    )
    labels = clusterer.fit_predict(coords)

    return FitResult(
        scaler=scaler,
        pca=pca,
        umap_model=umap_model,
        clusterer=clusterer,
        X_scaled=X_scaled,
        X_pca=X_pca,
        coords=coords,
        labels=labels,
        pca_components=n_components,
        explained_variance_ratio=pca.explained_variance_ratio_,
        retained_features=retained_features,
    )


def save_models(result: FitResult, output_dir: str, ids: np.ndarray) -> None:
    from pathlib import Path

    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    joblib.dump(result.scaler, out / "scaler.joblib")
    joblib.dump(result.pca, out / "pca.joblib")
    joblib.dump(result.umap_model, out / "umap.joblib")
    joblib.dump(result.clusterer, out / "hdbscan.joblib")

    knn = NearestNeighbors(n_neighbors=min(15, len(ids)), metric="euclidean")
    knn.fit(result.X_pca)

    bundle = {
        "scaler": result.scaler,
        "pca": result.pca,
        "umap": result.umap_model,
        "hdbscan": result.clusterer,
        "retained_features": result.retained_features,
        "knn": knn,
        "pca_train": result.X_pca,
        "embedding_train": result.coords,
        "ids_train": ids,
        "labels_train": result.labels,
    }
    joblib.dump(bundle, out / "projection_bundle.joblib")


def fit_variant(
    X: np.ndarray,
    feature_names: list[str],
    config: EmbedConfig,
) -> tuple[FitResult, list[str]]:
    from .preprocess import drop_constant_columns

    prep = drop_constant_columns(X, feature_names)
    result = fit_embedding_pipeline(prep.X, prep.retained_features, config)
    return result, prep.retained_features
