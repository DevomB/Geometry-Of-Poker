import { describe, expect, it } from "vitest";
import { create } from "zustand";
import type { Street } from "@geometry-of-poker/shared";
import type { ColorMode, ViewerFilters } from "@/lib/types";
import { DEFAULT_FILTERS } from "@/lib/types";

interface TestViewerState {
  street: Street;
  colorMode: ColorMode;
  filters: ViewerFilters;
  selection: { index: number; locked: boolean } | null;
  setStreet: (s: Street) => void;
  selectPoint: (index: number) => void;
  clearSelection: () => void;
}

function createTestStore() {
  return create<TestViewerState>((set) => ({
    street: "flop",
    colorMode: "equity",
    filters: { ...DEFAULT_FILTERS },
    selection: null,
    setStreet: (street) => set({ street, selection: null }),
    selectPoint: (index) => set({ selection: { index, locked: true } }),
    clearSelection: () => set({ selection: null }),
  }));
}

describe("street switching", () => {
  it("clears selection when street changes", () => {
    const store = createTestStore();
    store.getState().selectPoint(42);
    expect(store.getState().selection?.index).toBe(42);
    store.getState().setStreet("turn");
    expect(store.getState().street).toBe("turn");
    expect(store.getState().selection).toBeNull();
  });
});

describe("selection state", () => {
  it("locks selection on point pick", () => {
    const store = createTestStore();
    store.getState().selectPoint(10);
    expect(store.getState().selection).toEqual({ index: 10, locked: true });
    store.getState().clearSelection();
    expect(store.getState().selection).toBeNull();
  });
});
