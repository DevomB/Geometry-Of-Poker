#!/usr/bin/env python3
"""
Sample valid poker states for feature extraction.

Generates hero + community card combinations without scraping external data.
Uses combinatorial enumeration with stratified street sampling.

NOT YET IMPLEMENTED — placeholder entry point.
"""

from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
OUTPUT_DIR = REPO_ROOT / "artifacts" / "datasets"


def main() -> int:
    print("[pipeline/generate/sample_states.py] Not yet implemented.")
    print(f"Planned output directory: {OUTPUT_DIR}")
    print("Phase 2: enumerate canonical states per street with deduplication.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
