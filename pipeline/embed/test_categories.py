"""Parity checks: Python category index matches packages/shared hand-categories.json."""
from __future__ import annotations

import json
import unittest
from pathlib import Path

from .categories import category_index_for_label, load_category_index

_REPO_ROOT = Path(__file__).resolve().parents[2]
_CATEGORIES_JSON = _REPO_ROOT / "packages" / "shared" / "src" / "hand-categories.json"


class CategoryIndexParity(unittest.TestCase):
    def test_one_pair_canonical_and_alias(self) -> None:
        data = json.loads(_CATEGORIES_JSON.read_text(encoding="utf-8"))
        labels: list[str] = data["labels"]
        self.assertEqual(labels[1], "onePair")
        self.assertEqual(category_index_for_label("onePair"), 1)
        self.assertEqual(category_index_for_label("pair"), 1)

    def test_load_matches_json(self) -> None:
        data = json.loads(_CATEGORIES_JSON.read_text(encoding="utf-8"))
        labels: list[str] = data["labels"]
        index = load_category_index()
        for i, label in enumerate(labels):
            self.assertEqual(index[label], i)


if __name__ == "__main__":
    unittest.main()
