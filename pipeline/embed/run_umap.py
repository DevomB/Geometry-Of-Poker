#!/usr/bin/env python3
"""Deprecated — use `python -m embed.run` from the pipeline directory."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]


def main() -> int:
    cmd = [sys.executable, "-m", "embed.run", "--all", "--demo"]
    if len(sys.argv) > 1:
        cmd = [sys.executable, "-m", "embed.run", *sys.argv[1:]]
    return subprocess.call(cmd, cwd=REPO / "pipeline")


if __name__ == "__main__":
    sys.exit(main())
