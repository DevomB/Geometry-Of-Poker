"use client";

import { useEffect } from "react";
import { useViewerStore } from "@/stores/viewer-store";
import { resetCameraView } from "@/features/scene/camera-actions";
import { STREETS } from "@/lib/types";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

/**
 * Global keyboard shortcuts for the viewer:
 * 1-4 street · R reset camera · L neighbor links · C cluster labels · Esc clear selection.
 */
export function useViewerShortcuts() {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      const state = useViewerStore.getState();
      const key = event.key.toLowerCase();

      if (["1", "2", "3", "4"].includes(key)) {
        const street = STREETS[Number(key) - 1];
        if (street && street !== state.street) state.setStreet(street);
        return;
      }
      if (key === "r") {
        resetCameraView();
        return;
      }
      if (key === "l") {
        state.toggleNnLinks();
        return;
      }
      if (key === "c") {
        state.toggleClusterLabels();
        return;
      }
      if (key === "escape") {
        if (state.selection) state.clearSelection();
        else if (state.manualMarker) state.setManualMarker(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
