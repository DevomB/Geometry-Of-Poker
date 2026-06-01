#!/usr/bin/env python3
"""Test out-of-sample projection using saved projection_bundle.joblib."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np

# Allow running from repo: visualizer/pipeline/scripts/
PIPELINE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PIPELINE_ROOT))

from embed.features import COMPACT_FEATURE_ORDER, sanitize_column  # noqa: E402
from embed.project import project_feature_vector  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Test manual-state projection into embedded manifold")
    parser.add_argument("--street", default="flop", choices=["preflop", "flop", "turn", "river"])
    parser.add_argument(
        "--bundle",
        help="Path to projection_bundle.joblib (default: artifacts/embeddings/{street}/)",
    )
    parser.add_argument("--vector-file", help="JSON file with feature name → value map")
    args = parser.parse_args()

    bundle_path = Path(args.bundle) if args.bundle else (
        PIPELINE_ROOT.parent / "artifacts" / "embeddings" / args.street / "projection_bundle.joblib"
    )
    if not bundle_path.exists():
        print(f"Bundle not found: {bundle_path}")
        print("Run: cd pipeline && python -m embed.run --street flop --demo")
        return 1

    if args.vector_file:
        import json

        with open(args.vector_file, encoding="utf-8") as f:
            feat_map = json.load(f)
        feature_names = list(feat_map.keys())
        vector = np.array([feat_map[k] for k in feature_names], dtype=np.float64)
    else:
        # Demo vector: neutral compact features
        feature_names = COMPACT_FEATURE_ORDER
        vector = np.zeros(len(COMPACT_FEATURE_ORDER), dtype=np.float64)
        vector[0] = 0.55  # equityVsRandom
        idx = sanitize_column("equityVsRandom")
        print(f"Using demo vector (equityVsRandom=0.55, dim={len(vector)})")

    result = project_feature_vector(vector, feature_names, bundle_path, k=5)

    print(f"Method: {result.method}")
    print(f"XYZ: [{result.xyz[0]:.4f}, {result.xyz[1]:.4f}, {result.xyz[2]:.4f}]")
    print(f"Cluster (via neighbors): {result.cluster_id}")
    print("Nearest neighbors:")
    for nid, dist in zip(result.neighbor_ids, result.neighbor_distances):
        print(f"  {nid}  distance={dist:.4f}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
