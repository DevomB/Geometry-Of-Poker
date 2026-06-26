import assert from "node:assert/strict";
import { describe, it } from "node:test";

function kebabToCamel(key: string): string {
  return key.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

describe("CLI kebab-case flags", () => {
  it("maps documented generate flags to camelCase keys", () => {
    assert.equal(kebabToCamel("exact-feature-budget"), "exactFeatureBudget");
    assert.equal(kebabToCamel("batch-size"), "batchSize");
    assert.equal(kebabToCamel("preflop-mode"), "preflopMode");
    assert.equal(kebabToCamel("target-count"), "targetCount");
    assert.equal(kebabToCamel("extend-from"), "extendFrom");
  });
});
