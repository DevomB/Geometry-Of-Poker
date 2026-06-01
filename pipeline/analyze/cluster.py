#!/usr/bin/env python3
"""
Optional HDBSCAN clustering on embedded coordinates or feature space.

Outputs:
  artifacts/embeddings/clusters.json
  cluster id column appended to metadata

NOT YET IMPLEMENTED — placeholder entry point.
"""

from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def main() -> int:
    print("[pipeline/analyze/cluster.py] Not yet implemented.")
    print("Planned: HDBSCAN on 3D UMAP coordinates with noise label -1.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
