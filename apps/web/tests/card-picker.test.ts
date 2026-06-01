import { describe, expect, it } from "vitest";
import {
  emptyPickerState,
  validateCardPicker,
  cardKey,
  boardLengthForStreet,
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
