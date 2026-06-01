import { create } from "zustand";
import type {
  AppMode,
  ManualHandProjection,
  PointCloudBuffers,
  ViewerArtifacts,
} from "@geometry-of-poker/shared";
import { DEFAULT_VIEWER_ARTIFACTS } from "@geometry-of-poker/shared";

export type { AppMode };

export interface ManualHandInput {
  hero: string;
  board: string;
}

interface AppState {
  mode: AppMode;
  artifacts: ViewerArtifacts | null;
  pointCloud: PointCloudBuffers | null;
  manualHandInput: ManualHandInput | null;
  manualProjection: ManualHandProjection | null;
  isLoadingArtifacts: boolean;
  setMode: (mode: AppMode) => void;
  setManualHandInput: (input: ManualHandInput) => void;
  loadArtifacts: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  mode: "research-explorer",
  artifacts: null,
  pointCloud: null,
  manualHandInput: null,
  manualProjection: null,
  isLoadingArtifacts: false,

  setMode: (mode) => set({ mode }),

  setManualHandInput: (input) => {
    set({ manualHandInput: input, manualProjection: null });
    // Phase 4: validate → extract → normalize → project → find neighbors
  },

  loadArtifacts: async () => {
    if (get().isLoadingArtifacts) return;
    set({ isLoadingArtifacts: true });
    try {
      // Phase 3: fetch binary point cloud + metadata from public/ or CDN
      set({ artifacts: DEFAULT_VIEWER_ARTIFACTS, pointCloud: null });
    } finally {
      set({ isLoadingArtifacts: false });
    }
  },
}));
