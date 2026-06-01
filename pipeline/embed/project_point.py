#!/usr/bin/env python3
"""
Project a single normalized feature vector into 3D using saved UMAP transform.

Used for Mode 2 (Manual Hand Explorer) when UMAP supports transform,
or kNN interpolation fallback in embedding space.

NOT YET IMPLEMENTED — placeholder entry point.
"""

from __future__ import annotations

import sys


def main() -> int:
    print("[pipeline/embed/project_point.py] Not yet implemented.")
    print("Fallback strategy: weighted kNN average of neighbor embeddings in feature space.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
