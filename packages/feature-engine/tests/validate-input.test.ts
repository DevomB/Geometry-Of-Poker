import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validatePokerStateInput } from "../src/validate-input.js";
import { GeometryFeatureError } from "../src/types.js";

describe("validatePokerStateInput", () => {
  it("accepts valid preflop", () => {
    const v = validatePokerStateInput({ hero: ["As", "Kd"], board: [] });
    assert.equal(v.street, "preflop");
  });

  it("rejects duplicate cards", () => {
    assert.throws(
      () => validatePokerStateInput({ hero: ["As", "As"], board: [] }),
      GeometryFeatureError,
    );
  });

  it("rejects hero on board", () => {
    assert.throws(
      () => validatePokerStateInput({ hero: ["As", "Kd"], board: ["As", "2c", "3d"] }),
      /cannot appear on the board/,
    );
  });

  it("rejects dead card collision", () => {
    assert.throws(
      () => validatePokerStateInput({ hero: ["As", "Kd"], board: [], deadCards: ["As"] }),
      /Duplicate/,
    );
  });

  it("rejects invalid board length", () => {
    assert.throws(
      () => validatePokerStateInput({ hero: ["As", "Kd"], board: ["2c", "3d"] }),
      GeometryFeatureError,
    );
  });

  it("classifies streets from board length", () => {
    assert.equal(validatePokerStateInput({ hero: ["As", "Kd"], board: ["2c", "3d", "4h"] }).street, "flop");
    assert.equal(
      validatePokerStateInput({ hero: ["As", "Kd"], board: ["2c", "3d", "4h", "5s"] }).street,
      "turn",
    );
    assert.equal(
      validatePokerStateInput({ hero: ["As", "Kd"], board: ["2c", "3d", "4h", "5s", "6c"] }).street,
      "river",
    );
  });
});
