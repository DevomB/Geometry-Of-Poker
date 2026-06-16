import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CATEGORY_INDEX,
  HAND_CATEGORY_LABELS,
  INDEX_CATEGORY,
  categoryIndexForLabel,
} from "../src/poker-categories.js";

describe("poker categories", () => {
  it("uses API canonical onePair at index 1", () => {
    assert.equal(HAND_CATEGORY_LABELS[1], "onePair");
    assert.equal(categoryIndexForLabel("onePair"), 1);
    assert.equal(INDEX_CATEGORY[1], "onePair");
  });

  it("accepts legacy pair alias", () => {
    assert.equal(categoryIndexForLabel("pair"), 1);
    assert.equal(CATEGORY_INDEX.pair, 1);
  });

  it("defaults unknown labels to high card", () => {
    assert.equal(categoryIndexForLabel("notACategory"), 0);
  });
});
