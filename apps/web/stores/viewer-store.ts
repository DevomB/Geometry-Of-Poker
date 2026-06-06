import { create } from "zustand";
import { loadStreetDatasetProgressive } from "@/lib/artifacts/load-street";
import { applyColorMode, applyFilters, buildLodIndices } from "@/lib/colors/color-modes";
import { computeBounds } from "@/lib/artifacts/parse-points-bin";
import type { Street } from "@geometry-of-poker/shared";
import type {
  CameraFlyTarget,
  ColorMode,
  ManualMarker,
  RenderQuality,
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
  targetFps: number;
  renderQuality: RenderQuality;
  visualizationRevision: number;
  visualUpdate:
    | { kind: "full" }
    | { kind: "points"; indices: number[] };
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

const TARGET_FPS = 30;
const MIN_SAMPLE_RATE = 0.15;

const RENDER_QUALITY: Record<RenderQuality["tier"], RenderQuality> = {
  high: { tier: "high", dprMax: 1.5, hoverIntervalMs: 48 },
  balanced: { tier: "balanced", dprMax: 1.25, hoverIntervalMs: 72 },
  performance: { tier: "performance", dprMax: 1, hoverIntervalMs: 112 },
};

function defaultLodSampleRate() {
  if (typeof navigator === "undefined") return 1;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const memoryGb = nav.deviceMemory ?? 16;
  const cores = nav.hardwareConcurrency ?? 8;
  if (memoryGb <= 8 || cores <= 6) return 0.55;
  if (memoryGb <= 16 || cores <= 8) return 0.75;
  return 1;
}

function lodStep(sampleRate: number) {
  return sampleRate < 1 ? Math.max(1, Math.floor(1 / sampleRate)) : 1;
}

function isLodVisible(index: number, sampleRate: number) {
  return sampleRate >= 1 || index % lodStep(sampleRate) === 0;
}

function copyPointVisual(dataset: StreetDataset, index: number) {
  if (index < 0 || index >= dataset.count) return;
  const colorOffset = index * 3;
  dataset.colors[colorOffset] = dataset.baseColors[colorOffset]!;
  dataset.colors[colorOffset + 1] = dataset.baseColors[colorOffset + 1]!;
  dataset.colors[colorOffset + 2] = dataset.baseColors[colorOffset + 2]!;
  dataset.sizes[index] = dataset.baseSizes[index]!;
}

function applyPointOverlay(dataset: StreetDataset, state: ViewerState, index: number) {
  if (index < 0 || index >= dataset.count) return;
  copyPointVisual(dataset, index);

  if (state.manualMarker) {
    for (const id of state.manualMarker.neighborIds) {
      if (dataset.idToIndex.get(id) === index) {
        dataset.sizes[index] = Math.max(dataset.sizes[index]!, POINT_SIZES.manualNeighbor);
        break;
      }
    }
  }

  if (state.selection?.locked && state.selection.index === index) {
    dataset.colors[index * 3] = SELECTION_COLOR[0];
    dataset.colors[index * 3 + 1] = SELECTION_COLOR[1];
    dataset.colors[index * 3 + 2] = SELECTION_COLOR[2];
    dataset.sizes[index] = POINT_SIZES.selected;
    return;
  }

  if (state.hoverIndex === index) {
    dataset.colors[index * 3] = HOVER_COLOR[0];
    dataset.colors[index * 3 + 1] = HOVER_COLOR[1];
    dataset.colors[index * 3 + 2] = HOVER_COLOR[2];
    dataset.sizes[index] = POINT_SIZES.hover;
  }
}

function applyOverlays(dataset: StreetDataset, state: ViewerState) {
  if (state.manualMarker && dataset.idToIndex.size > 0) {
    for (const id of state.manualMarker.neighborIds) {
      const idx = dataset.idToIndex.get(id);
      if (idx === undefined) continue;
      dataset.sizes[idx] = Math.max(dataset.sizes[idx]!, POINT_SIZES.manualNeighbor);
    }
  }

  if (state.selection?.locked) {
    applyPointOverlay(dataset, state, state.selection.index);
  }
  if (state.hoverIndex !== null && state.hoverIndex !== state.selection?.index) {
    applyPointOverlay(dataset, state, state.hoverIndex);
  }
}

function rebuildVisualization(state: ViewerState): Partial<ViewerState> {
  if (!state.dataset) return {};
  const dataset = state.dataset;
  const lodIndices = state.lodSampleRate < 1 ? buildLodIndices(dataset.count, state.lodSampleRate) : undefined;

  applyColorMode(dataset, state.colorMode, dataset.baseColors, lodIndices);
  applyFilters(dataset, state.filters, dataset.visible, dataset.baseColors);

  for (let i = 0; i < dataset.count; i++) {
    dataset.baseSizes[i] = isLodVisible(i, state.lodSampleRate) ? POINT_SIZES.base : 0;
    if (!dataset.visible[i]) dataset.baseSizes[i] = 0;
  }

  dataset.colors.set(dataset.baseColors);
  dataset.sizes.set(dataset.baseSizes);
  applyOverlays(dataset, state);

  return {
    visualizationRevision: state.visualizationRevision + 1,
    visualUpdate: { kind: "full" },
  };
}

function updateHoverVisual(state: ViewerState, hoverIndex: number | null): Partial<ViewerState> {
  if (state.hoverIndex === hoverIndex) return {};
  const dataset = state.dataset;
  if (!dataset) return { hoverIndex };

  const nextState = { ...state, hoverIndex };
  const previousHover = state.hoverIndex;

  if (previousHover !== null) applyPointOverlay(dataset, nextState, previousHover);
  if (hoverIndex !== null) applyPointOverlay(dataset, nextState, hoverIndex);

  const indices: number[] = [];
  if (previousHover !== null) indices.push(previousHover);
  if (hoverIndex !== null) indices.push(hoverIndex);

  return {
    hoverIndex,
    visualizationRevision: state.visualizationRevision + 1,
    visualUpdate: { kind: "points", indices },
  };
}

function nextLowerQuality(tier: RenderQuality["tier"]): RenderQuality["tier"] {
  if (tier === "high") return "balanced";
  return "performance";
}

function nextHigherQuality(tier: RenderQuality["tier"]): RenderQuality["tier"] {
  if (tier === "performance") return "balanced";
  return "high";
}

function adaptRenderQuality(state: ViewerState, fps: number): Partial<ViewerState> {
  const patch: Partial<ViewerState> = { fps };

  if (!state.dataset) return patch;

  if (fps > 0 && fps < TARGET_FPS) {
    const tier = nextLowerQuality(state.renderQuality.tier);
    patch.renderQuality = RENDER_QUALITY[tier];
    if (state.lodSampleRate > MIN_SAMPLE_RATE) {
      patch.lodSampleRate = Math.max(
        MIN_SAMPLE_RATE,
        Number((state.lodSampleRate * 0.78).toFixed(2)),
      );
    }
    return patch;
  }

  if (
    fps >= TARGET_FPS + 18 &&
    state.lodSampleRate < defaultLodSampleRate()
  ) {
    patch.lodSampleRate = Math.min(
      defaultLodSampleRate(),
      Number((state.lodSampleRate + 0.08).toFixed(2)),
    );
  }

  if (fps >= TARGET_FPS + 24 && state.renderQuality.tier !== "high") {
    const tier = nextHigherQuality(state.renderQuality.tier);
    patch.renderQuality = RENDER_QUALITY[tier];
  }

  return patch;
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
  lodSampleRate: defaultLodSampleRate(),
  manualMarker: null,
  cameraFlyTarget: null,
  fps: 0,
  targetFps: TARGET_FPS,
  renderQuality: RENDER_QUALITY.high,
  visualizationRevision: 0,
  visualUpdate: { kind: "full" },
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
    set(updateHoverVisual(get(), hoverIndex));
  },

  selectPoint: (index, locked = true) => {
    const { dataset, bounds } = get();
    if (!dataset) return;
    const p = dataset.metadata[index];
    if (!p) return;
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
  setFps: (fps) => {
    const state = get();
    const patch = adaptRenderQuality(state, fps);
    set(patch);
    if (patch.lodSampleRate !== undefined) {
      set(rebuildVisualization(get()));
    }
  },

  loadStreet: async () => {
    const { street, isLoading } = get();
    if (isLoading) return;
    set({ isLoading: true, loadError: null });
    try {
      const dataset = await loadStreetDatasetProgressive(street, (partial) => {
        const bounds = computeBounds(partial.positions, partial.count);
        const spatialIndex = new GridSpatialIndex(bounds.radius / 20);
        spatialIndex.build(partial.positions, partial.count);
        set({
          dataset: partial,
          spatialIndex,
          bounds,
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
      });
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
