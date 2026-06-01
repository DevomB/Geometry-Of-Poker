from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

STREETS = ("preflop", "flop", "turn", "river")

# Repo: visualizer/artifacts
REPO_ROOT = Path(__file__).resolve().parents[2]
ARTIFACTS_ROOT = REPO_ROOT / "artifacts"
DATASETS_ROOT = ARTIFACTS_ROOT / "datasets"
EMBEDDINGS_ROOT = ARTIFACTS_ROOT / "embeddings"


@dataclass(frozen=True)
class EmbedConfig:
    street: str
    input_path: Path
    output_dir: Path
    random_state: int = 42
    pca_variance: float = 0.95
    pca_max_components: int = 50
    umap_n_neighbors: int = 30
    umap_min_dist: float = 0.1
    umap_metric: str = "euclidean"
    hdbscan_min_cluster_size: int = 50
    hdbscan_min_samples: int | None = 10
    knn_k: int = 15
    experiment_subsample: int = 8000
    stability_seeds: tuple[int, ...] = (42, 43, 44)


def default_dataset_path(street: str) -> Path:
    return DATASETS_ROOT / street / "records.parquet"


def default_output_dir(street: str) -> Path:
    return EMBEDDINGS_ROOT / street


def resolve_paths(street: str, input_arg: str | None, output_arg: str | None) -> EmbedConfig:
    input_path = Path(input_arg) if input_arg else default_dataset_path(street)
    output_dir = Path(output_arg) if output_arg else default_output_dir(street)
    return EmbedConfig(street=street, input_path=input_path, output_dir=output_dir)
