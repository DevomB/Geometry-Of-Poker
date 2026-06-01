from __future__ import annotations

import json
from dataclasses import dataclass

import numpy as np


@dataclass
class PreprocessResult:
    X: np.ndarray
    retained_features: list[str]
    dropped_constant: list[str]
    original_features: list[str]


def assert_finite(X: np.ndarray) -> None:
    if not np.all(np.isfinite(X)):
        n_bad = int(np.size(X) - np.isfinite(X).sum())
        raise ValueError(f"Feature matrix contains {n_bad} non-finite values")


def drop_constant_columns(X: np.ndarray, feature_names: list[str]) -> PreprocessResult:
    assert_finite(X)
    original = list(feature_names)
    variances = np.var(X, axis=0)
    retained_mask = variances > 1e-12
    dropped = [name for name, keep in zip(feature_names, retained_mask) if not keep]
    retained = [name for name, keep in zip(feature_names, retained_mask) if keep]
    if not retained:
        raise ValueError("All feature dimensions are constant after filtering")
    X_ret = X[:, retained_mask]
    return PreprocessResult(
        X=X_ret,
        retained_features=retained,
        dropped_constant=dropped,
        original_features=original,
    )


def save_retained_features(path: str, result: PreprocessResult, street: str) -> None:
    payload = {
        "street": street,
        "original_features": result.original_features,
        "retained_features": result.retained_features,
        "dropped_constant": result.dropped_constant,
        "original_dimension": len(result.original_features),
        "retained_dimension": len(result.retained_features),
    }
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
