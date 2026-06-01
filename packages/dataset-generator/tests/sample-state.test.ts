import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  enumerateAll1326HoleCombos,
  enumerateCanonical169HoleCombos,
} from "../src/cards.js";
import { SeededRng } from "../src/rng.js";
import {
  enumeratePreflopStates,
  resolveStateBatch,
  sampleRandomState,
  sampleRandomStates,
} from "../src/sample-state.js";

describe("state sampling", () => {
  it("enumerates 1326 hole-card combinations", () => {
    assert.equal(enumerateAll1326HoleCombos().length, 1326);
  });

  it("enumerates at most 169 canonical classes", () => {
    const classes = enumerateCanonical169HoleCombos();
    assert.ok(classes.length <= 169);
    assert.ok(classes.length >= 169 - 1);
  });

  it("sampleRandomState produces unique cards", () => {
    const rng = new SeededRng(42);
    const state = sampleRandomState("flop", rng, 0, 42);
    const cards = [...state.hero, ...state.board];
    assert.equal(new Set(cards).size, cards.length);
    assert.equal(state.board.length, 3);
  });

  it("sampleRandomStates is reproducible from seed", () => {
    const a = sampleRandomStates("turn", 10, 99);
    const b = sampleRandomStates("turn", 10, 99);
    assert.deepEqual(a, b);
  });

  it("resolveStateBatch matches full sample prefix", () => {
    const full = sampleRandomStates("river", 50, 7);
    const batch = resolveStateBatch("river", 0, 50, 50, 7, "random");
    assert.deepEqual(full, batch);
  });

  it("preflop enumerate1326 returns ordered hole combos", () => {
    const states = enumeratePreflopStates("enumerate1326", 1326, 1);
    assert.equal(states.length, 1326);
    assert.deepEqual(states[0]!.hero, enumerateAll1326HoleCombos()[0]);
  });
});
