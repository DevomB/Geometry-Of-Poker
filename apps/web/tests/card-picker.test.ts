import { describe, expect, it } from "vitest";
import {
  emptyPickerState,
  validateCardPicker,
  cardKey,
  boardLengthForStreet,
  placeCardInZone,
  removeCard,
  pickerReady,
  inferredStreet,
  nextTargetZone,
  cardsUsed,
  HAND_SCENARIO_PRESETS,
  presetToPickerState,
} from "@/lib/cards/card-picker";

describe("card picker validation", () => {
  it("rejects incomplete hero cards", () => {
    const state = emptyPickerState();
    state.hero[0] = "As";
    const result = validateCardPicker(state, "flop");
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("two hero");
  });

  it("rejects invalid board length for street", () => {
    const state = emptyPickerState();
    state.hero = ["As", "Kd"];
    state.board[0] = "2c";
    const result = validateCardPicker(state, "flop");
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("3");
  });

  it("rejects duplicate cards", () => {
    const state = emptyPickerState();
    state.hero = ["As", "Kd"];
    state.board = ["As", "2c", "3d"];
    const result = validateCardPicker(state, "flop");
    expect(result.valid).toBe(false);
  });

  it("accepts valid flop hand", () => {
    const state = emptyPickerState();
    state.hero = ["As", "Kd"];
    state.board = ["2c", "7d", "Jh"];
    const result = validateCardPicker(state, "flop");
    expect(result.valid).toBe(true);
    expect(result.normalizedState?.street).toBe("flop");
  });

  it("maps board lengths per street", () => {
    expect(boardLengthForStreet("preflop")).toBe(0);
    expect(boardLengthForStreet("flop")).toBe(3);
    expect(boardLengthForStreet("turn")).toBe(4);
    expect(boardLengthForStreet("river")).toBe(5);
  });

  it("builds stable card keys", () => {
    expect(cardKey("A", "s")).toBe("As");
  });
});

describe("card picker zone-based placement", () => {
  it("places into next available hero slot", () => {
    let state = emptyPickerState();
    state = placeCardInZone(state, "As", "hero");
    expect(state.hero).toEqual(["As", null]);
    state = placeCardInZone(state, "Kh", "hero");
    expect(state.hero).toEqual(["As", "Kh"]);
  });

  it("ignores placement into a full hero zone", () => {
    let state = emptyPickerState();
    state.hero = ["As", "Kh"];
    state = placeCardInZone(state, "Qd", "hero");
    expect(state.hero).toEqual(["As", "Kh"]);
  });

  it("does not place duplicate cards", () => {
    let state = emptyPickerState();
    state.hero = ["As", null];
    state = placeCardInZone(state, "As", "board");
    expect(state.board.filter(Boolean)).toEqual([]);
  });

  it("places and validates dead cards as blockers", () => {
    let state = emptyPickerState();
    state.hero = ["As", "Kh"];
    state = placeCardInZone(state, "2c", "dead");
    state = placeCardInZone(state, "3d", "dead");

    expect(state.deadCards.filter(Boolean)).toEqual(["2c", "3d"]);
    expect(cardsUsed(state)).toEqual(new Set(["As", "Kh", "2c", "3d"]));
    expect(validateCardPicker(state, "preflop").valid).toBe(true);
  });

  it("rejects dead-card collisions", () => {
    const state = emptyPickerState();
    state.hero = ["As", "Kh"];
    state.deadCards[0] = "As";
    const result = validateCardPicker(state, "preflop");
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("Duplicate");
  });

  it("removes a card by value from any zone", () => {
    let state = emptyPickerState();
    state.hero = ["As", "Kh"];
    state.board = ["2c", "3d", "4s", null, null];
    state = removeCard(state, "Kh");
    expect(state.hero).toEqual(["As", null]);
    state = removeCard(state, "3d");
    expect(state.board.filter(Boolean)).toEqual(["2c", "4s"]);
    state = placeCardInZone(state, "5h", "dead");
    state = removeCard(state, "5h");
    expect(state.deadCards.filter(Boolean)).toEqual([]);
  });

  it("infers street from board count", () => {
    const state = emptyPickerState();
    expect(inferredStreet(state)).toBe("preflop");
    state.board = ["2c", "3d", "4s", null, null];
    expect(inferredStreet(state)).toBe("flop");
    state.board = ["2c", "3d", "4s", "5h", null];
    expect(inferredStreet(state)).toBe("turn");
    state.board = ["2c", "3d", "4s", "5h", "6d"];
    expect(inferredStreet(state)).toBe("river");
    state.board = ["2c", null, null, null, null];
    expect(inferredStreet(state)).toBeNull();
  });

  it("readiness requires 2 hero + valid board count", () => {
    const state = emptyPickerState();
    expect(pickerReady(state)).toBe(false);
    state.hero = ["As", "Kh"];
    expect(pickerReady(state)).toBe(true);
    state.board = ["2c", null, null, null, null];
    expect(pickerReady(state)).toBe(false);
    state.board = ["2c", "3d", "4s", null, null];
    expect(pickerReady(state)).toBe(true);
  });

  it("auto target switches from hero to board when hero filled", () => {
    let state = emptyPickerState();
    expect(nextTargetZone(state)).toBe("hero");
    state = placeCardInZone(state, "As", "hero");
    expect(nextTargetZone(state)).toBe("hero");
    state = placeCardInZone(state, "Kh", "hero");
    expect(nextTargetZone(state)).toBe("board");
  });

  it("cardsUsed reflects every populated slot", () => {
    const state = emptyPickerState();
    state.hero = ["As", "Kh"];
    state.board = ["2c", "3d", "4s", null, null];
    expect(cardsUsed(state)).toEqual(new Set(["As", "Kh", "2c", "3d", "4s"]));
  });

  it("ships scenario presets that map to valid picker states", () => {
    expect(HAND_SCENARIO_PRESETS.length).toBeGreaterThan(0);

    for (const preset of HAND_SCENARIO_PRESETS) {
      const state = presetToPickerState(preset);
      expect(pickerReady(state)).toBe(true);
      expect(new Set([...preset.hero, ...preset.board]).size).toBe(
        preset.hero.length + preset.board.length,
      );
      expect(inferredStreet(state)).not.toBeNull();
    }
  });
});
