import { describe, expect, it } from "vitest";
import { create } from "zustand";
import type { Street } from "@geometry-of-poker/shared";
import type { ColorMode, ViewerFilters } from "@/lib/types";
import { DEFAULT_FILTERS } from "@/lib/types";
import {
  POINT_SIZES,
  SELECTION_COLOR,
  HOVER_COLOR,
} from "@/lib/visualization-theme";

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

describe("visualization theme constants", () => {
  it("selected and hover colors contrast with the base point size", () => {
    expect(POINT_SIZES.selected).toBeGreaterThan(POINT_SIZES.hover);
    expect(POINT_SIZES.hover).toBeGreaterThan(POINT_SIZES.base);
  });

  it("selection color is high-luminance for visibility against any palette", () => {
    const luminance =
      0.2126 * SELECTION_COLOR[0] + 0.7152 * SELECTION_COLOR[1] + 0.0722 * SELECTION_COLOR[2];
    expect(luminance).toBeGreaterThan(0.85);
  });

  it("hover color is distinct from selection color", () => {
    expect(HOVER_COLOR).not.toEqual(SELECTION_COLOR);
  });
});
