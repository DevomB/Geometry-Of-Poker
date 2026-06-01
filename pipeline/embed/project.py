from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import joblib
import numpy as np
from sklearn.neighbors import NearestNeighbors


@dataclass
class ProjectionResult:
    xyz: np.ndarray
    method: str
    neighbor_ids: list[str]
    neighbor_distances: list[float]
    cluster_id: int | None


def load_projection_bundle(path: Path) -> dict:
    return joblib.load(path)


def project_feature_vector(
    vector: np.ndarray,
    feature_names: list[str],
    bundle_path: Path,
    k: int = 5,
) -> ProjectionResult:
    """
    Project an out-of-sample feature vector into 3D.

    Strategy:
    1. Align vector to retained feature order
    2. Scale → PCA
    3. Try UMAP transform if available
    4. Fallback: kNN interpolation in PCA space
    """
    bundle = load_projection_bundle(bundle_path)
    retained: list[str] = bundle["retained_features"]
    name_to_val = dict(zip(feature_names, vector, strict=False))

    x = np.array([name_to_val.get(f, 0.0) for f in retained], dtype=np.float64).reshape(1, -1)

    scaler = bundle["scaler"]
    pca = bundle["pca"]
    x_scaled = scaler.transform(x)
    x_pca = pca.transform(x_scaled)

    umap_model = bundle["umap"]
    method = "knn_interpolation"
    xyz = None

    try:
        xyz = umap_model.transform(x_pca)
        if np.all(np.isfinite(xyz)):
            method = "umap_transform"
    except Exception:  # noqa: BLE001
        xyz = None

    knn: NearestNeighbors = bundle["knn"]
    distances, indices = knn.kneighbors(x_pca, n_neighbors=min(k, len(bundle["ids_train"])))
    neighbor_ids = [str(bundle["ids_train"][i]) for i in indices[0]]
    neighbor_distances = [float(d) for d in distances[0]]

    if xyz is None or not np.all(np.isfinite(xyz)):
        train_emb = bundle["embedding_train"]
        weights = 1.0 / (np.array(neighbor_distances) + 1e-9)
        weights /= weights.sum()
        xyz = np.average(train_emb[indices[0]], axis=0, weights=weights).reshape(1, 3)
        method = "knn_interpolation"

    # Assign cluster via plurality of neighbors
    train_labels = bundle["labels_train"]
    neighbor_labels = [int(train_labels[i]) for i in indices[0]]
    valid = [l for l in neighbor_labels if l >= 0]
    cluster_id = max(set(valid), key=valid.count) if valid else None

    return ProjectionResult(
        xyz=xyz[0],
        method=method,
        neighbor_ids=neighbor_ids,
        neighbor_distances=neighbor_distances,
        cluster_id=cluster_id,
    )
