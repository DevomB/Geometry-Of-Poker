#!/usr/bin/env python3
"""Deprecated — dataset generation now runs via Node (pnpm generate)."""
from __future__ import annotations
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def main() -> int:
    print("[pipeline/generate/build_dataset.py] Delegating to pnpm generate --all")
    cmd = ["pnpm", "generate", "--", "--all", "--seed", "42", "--mode", "compact"]
    return subprocess.call(cmd, cwd=REPO_ROOT)


if __name__ == "__main__":
    sys.exit(main())
