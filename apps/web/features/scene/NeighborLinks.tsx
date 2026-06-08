"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { useViewerStore } from "@/stores/viewer-store";
import { NEIGHBOR_LINK_COLOR } from "@/lib/visualization-theme";

export function NeighborLinks() {
  const show = useViewerStore((s) => s.showNnLinks);
  const dataset = useViewerStore((s) => s.dataset);
  const spatialIndex = useViewerStore((s) => s.spatialIndex);
  const selection = useViewerStore((s) => s.selection);
  const manualMarker = useViewerStore((s) => s.manualMarker);

  const geometry = useMemo(() => {
    if (!show || !dataset) return null;

    const anchorIndex = selection?.index;
    const anchorPosition = manualMarker
      ? manualMarker.position
      : anchorIndex !== undefined && anchorIndex >= 0
        ? ([
            dataset.positions[anchorIndex * 3]!,
            dataset.positions[anchorIndex * 3 + 1]!,
            dataset.positions[anchorIndex * 3 + 2]!,
          ] as [number, number, number])
        : null;
    if (!anchorPosition) return null;

    const neighbors: number[] = [];
    if (manualMarker) {
      for (const id of manualMarker.neighborIds) {
        const idx = dataset.idToIndex.get(id);
        if (idx !== undefined) neighbors.push(idx);
      }
    } else if (spatialIndex && anchorIndex !== undefined) {
      const [px, py, pz] = anchorPosition;
      neighbors.push(
        ...spatialIndex.nearestK(px, py, pz, 8, anchorIndex).map((s) => s.index),
      );
    }

    const positions = new Float32Array(neighbors.length * 6);
    let offset = 0;
    const [ax, ay, az] = anchorPosition;

    for (const ni of neighbors) {
      positions[offset++] = ax;
      positions[offset++] = ay;
      positions[offset++] = az;
      positions[offset++] = dataset.positions[ni * 3]!;
      positions[offset++] = dataset.positions[ni * 3 + 1]!;
      positions[offset++] = dataset.positions[ni * 3 + 2]!;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [show, dataset, spatialIndex, selection, manualMarker]);

  if (!geometry) return null;

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={NEIGHBOR_LINK_COLOR} transparent opacity={0.4} />
    </lineSegments>
  );
}
