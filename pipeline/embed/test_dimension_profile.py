from __future__ import annotations

import unittest
from types import SimpleNamespace

import numpy as np

from .config import EmbedConfig
from .dimension_profile import build_dimension_profile


class DimensionProfileTest(unittest.TestCase):
    def test_profile_uses_retained_features_and_marks_umap_axes_descriptive(self) -> None:
        result = SimpleNamespace(
            labels=np.array([0, 0, 1, 1, -1, -1, 0, 1]),
            X_scaled=np.array(
                [
                    [0.1, 1.0],
                    [0.2, 0.9],
                    [0.8, 0.2],
                    [0.9, 0.1],
                    [0.4, 0.5],
                    [0.5, 0.4],
                    [0.3, 0.7],
                    [0.7, 0.3],
                ],
                dtype=float,
            ),
            coords=np.array(
                [
                    [0.0, 0.0, 0.0],
                    [0.1, 0.0, 0.1],
                    [1.0, 1.0, 0.8],
                    [1.1, 1.0, 0.9],
                    [0.4, 0.6, 0.2],
                    [0.5, 0.5, 0.3],
                    [0.2, 0.1, 0.2],
                    [0.9, 0.8, 0.7],
                ],
                dtype=float,
            ),
            pca_components=2,
            explained_variance_ratio=np.array([0.7, 0.2]),
            retained_features=["equityVsRandom", "boardConnectivityScore"],
            pca=SimpleNamespace(components_=np.array([[0.8, -0.2], [0.1, 0.9]], dtype=float)),
        )

        profile = build_dimension_profile(
            "flop",
            result,
            EmbedConfig(street="flop", input_path="", output_dir="", knn_k=3),
        )

        loading_features = {
            row["feature"]
            for component in profile["pca"]["components"]
            for row in component["topLoadings"]
        }
        self.assertLessEqual(loading_features, set(result.retained_features))
        self.assertIn("nonlinear", profile["interpretation"]["axisCaveat"])
        self.assertEqual(profile["umap"]["axes"][0]["interpretation"], "descriptive nonlinear layout coordinate")


if __name__ == "__main__":
    unittest.main()
