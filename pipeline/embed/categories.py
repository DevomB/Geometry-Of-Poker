from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[2]
_CATEGORIES_JSON = _REPO_ROOT / "packages" / "shared" / "src" / "hand-categories.json"


@lru_cache(maxsize=1)
def load_category_index() -> dict[str, int]:
    data = json.loads(_CATEGORIES_JSON.read_text(encoding="utf-8"))
    labels: list[str] = data["labels"]
    index = {label: i for i, label in enumerate(labels)}
    for alias, canonical in data.get("aliases", {}).items():
        if canonical in index:
            index[alias] = index[canonical]
    return index


def category_index_for_label(label: str) -> int:
    return load_category_index().get(str(label), 0)
