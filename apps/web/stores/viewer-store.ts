import { create } from "zustand";
import { loadStreetDataset } from "@/lib/artifacts/load-street";
import { applyColorMode, applyFilters, buildLodIndices } from "@/lib/colors/color-modes";
import { computeBounds } from "@/lib/artifacts/parse-points-bin";
import type { Street } from "@geometry-of-poker/shared";
import type {
  CameraFlyTarget,
  ColorMode,
  ManualMarker,
  SelectionState,
  StreetDataset,
  ViewerFilters,
} from "@/lib/types";
import { DEFAULT_FILTERS as DEFAULT_FILTER_VALUES } from "@/lib/types";
import { GridSpatialIndex } from "@/lib/spatial/grid-index";
import { HOVER_COLOR, POINT_SIZES, SELECTION_COLOR } from "@/lib/visualization-theme";

interface ViewerState {
  street: Street;
  dataset: StreetDataset | null;
  spatialIndex: GridSpatialIndex | null;
  isLoading: boolean;
  loadError: string | null;
  colorMode: ColorMode;
  filters: ViewerFilters;
  selection: SelectionState | null;
  hoverIndex: number | null;
  showNnLinks: boolean;
  showClusterLabels: boolean;
  lodSampleRate: number;
  manualMarker: ManualMarker | null;
  cameraFlyTarget: CameraFlyTarget | null;
  fps: number;
  bounds: ReturnType<typeof computeBounds> | null;

  setStreet: (street: Street) => void;
  setColorMode: (mode: ColorMode) => void;
  setFilters: (patch: Partial<ViewerFilters>) => void;
  resetFilters: () => void;
  setHoverIndex: (index: number | null) => void;
  selectPoint: (index: number, locked?: boolean) => void;
  clearSelection: () => void;
  toggleNnLinks: () => void;
  toggleClusterLabels: () => void;
  setLodSampleRate: (rate: number) => void;
  setManualMarker: (marker: ManualMarker | null) => void;
  flyTo: (target: CameraFlyTarget) => void;
  clearCameraFlyTarget: () => void;
  setFps: (fps: number) => void;
  loadStreet: () => Promise<void>;
  refreshVisualization: () => void;
}

function rebuildVisualization(state: ViewerState): Partial<ViewerState> {
  if (!state.dataset) return {};
  const dataset = state.dataset;
  const lodIndices = buildLodIndices(dataset.count, state.lodSampleRate);

  applyColorMode(dataset, state.colorMode, dataset.colors, lodIndices);
  applyFilters(dataset, state.filters, dataset.visible, dataset.colors);

  for (let i = 0; i < dataset.count; i++) {
    dataset.sizes[i] = state.lodSampleRate < 1 && i % Math.floor(1 / state.lodSampleRate) !== 0 ? 0 : POINT_SIZES.base;
    if (!dataset.visible[i]) dataset.sizes[i] = 0;
  }

  // Highlight projected manual neighbors so they stay visible against any palette.
  if (state.manualMarker && dataset.idToIndex.size > 0) {
    for (const id of state.manualMarker.neighborIds) {
      const idx = dataset.idToIndex.get(id);
      if (idx === undefined) continue;
      dataset.sizes[idx] = Math.max(dataset.sizes[idx]!, POINT_SIZES.manualNeighbor);
    }
  }

  if (state.selection?.locked) {
    const idx = state.selection.index;
    dataset.colors[idx * 3] = SELECTION_COLOR[0];
    dataset.colors[idx * 3 + 1] = SELECTION_COLOR[1];
    dataset.colors[idx * 3 + 2] = SELECTION_COLOR[2];
    dataset.sizes[idx] = POINT_SIZES.selected;
  }
  if (state.hoverIndex !== null && state.hoverIndex !== state.selection?.index) {
    const idx = state.hoverIndex;
    dataset.colors[idx * 3] = HOVER_COLOR[0];
    dataset.colors[idx * 3 + 1] = HOVER_COLOR[1];
    dataset.colors[idx * 3 + 2] = HOVER_COLOR[2];
    dataset.sizes[idx] = POINT_SIZES.hover;
  }

  return { dataset: { ...dataset } };
}

export const useViewerStore = create<ViewerState>((set, get) => ({
  street: "flop",
  dataset: null,
  spatialIndex: null,
  isLoading: false,
  loadError: null,
  colorMode: "equity",
  filters: { ...DEFAULT_FILTER_VALUES },
  selection: null,
  hoverIndex: null,
  showNnLinks: false,
  showClusterLabels: false,
  lodSampleRate: 1,
  manualMarker: null,
  cameraFlyTarget: null,
  fps: 0,
  bounds: null,

  setStreet: (street) => {
    set({
      street,
      dataset: null,
      spatialIndex: null,
      selection: null,
      hoverIndex: null,
      manualMarker: null,
      filters: { ...DEFAULT_FILTER_VALUES },
    });
    void get().loadStreet();
  },

  setColorMode: (colorMode) => {
    set({ colorMode });
    set(rebuildVisualization(get()));
  },

  setFilters: (patch) => {
    set({ filters: { ...get().filters, ...patch } });
    set(rebuildVisualization(get()));
  },

  resetFilters: () => {
    set({ filters: { ...DEFAULT_FILTER_VALUES } });
    set(rebuildVisualization(get()));
  },

  setHoverIndex: (hoverIndex) => {
    set({ hoverIndex });
    set(rebuildVisualization(get()));
  },

  selectPoint: (index, locked = true) => {
    const { dataset, bounds } = get();
    if (!dataset) return;
    const p = dataset.metadata[index]!;
    const offset = bounds?.radius ? bounds.radius * 0.35 : 2;
    set({
      selection: { index, locked },
      hoverIndex: index,
    });
    set(rebuildVisualization(get()));
    set({
      cameraFlyTarget: {
        position: [p.x + offset, p.y + 1.5, p.z + offset] as [number, number, number],
        target: [p.x, p.y, p.z],
      },
    });
  },

  clearSelection: () => {
    set({ selection: null });
    set(rebuildVisualization(get()));
  },

  toggleNnLinks: () => set({ showNnLinks: !get().showNnLinks }),
  toggleClusterLabels: () => set({ showClusterLabels: !get().showClusterLabels }),
  setLodSampleRate: (lodSampleRate) => {
    set({ lodSampleRate });
    set(rebuildVisualization(get()));
  },

  setManualMarker: (manualMarker) => {
    set({ manualMarker });
    if (manualMarker) {
      set({
        cameraFlyTarget: {
          position: [
            manualMarker.position[0] + 2,
            manualMarker.position[1] + 1.5,
            manualMarker.position[2] + 2.5,
          ],
          target: manualMarker.position,
        },
        filters: { ...get().filters, searchNeighborOf: manualMarker.neighborIds[0] ?? null },
      });
      set(rebuildVisualization(get()));
    }
  },

  flyTo: (cameraFlyTarget) => set({ cameraFlyTarget }),
  clearCameraFlyTarget: () => set({ cameraFlyTarget: null }),
  setFps: (fps) => set({ fps }),

  loadStreet: async () => {
    const { street, isLoading } = get();
    if (isLoading) return;
    set({ isLoading: true, loadError: null });
    try {
      const dataset = await loadStreetDataset(street);
      const bounds = computeBounds(dataset.positions, dataset.count);

      const spatialIndex = new GridSpatialIndex(bounds.radius / 20);
      spatialIndex.build(dataset.positions, dataset.count);

      set({
        dataset,
        spatialIndex,
        bounds,
        isLoading: false,
        selection: null,
        hoverIndex: null,
        manualMarker: null,
        cameraFlyTarget: {
          position: [
            bounds.center[0],
            bounds.center[1],
            bounds.center[2] + bounds.radius * 2.2,
          ],
          target: bounds.center,
        },
      });
      set(rebuildVisualization(get()));
    } catch (err) {
      set({
        isLoading: false,
        loadError: err instanceof Error ? err.message : String(err),
      });
    }
  },

  refreshVisualization: () => set(rebuildVisualization(get())),
}));

export type { ViewerFilters, SelectionState, ManualMarker, CameraFlyTarget };
