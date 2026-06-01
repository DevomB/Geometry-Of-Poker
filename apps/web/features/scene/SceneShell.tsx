"use client";

import { useEffect, useRef, type ElementRef } from "react";
import { Canvas } from "@react-three/fiber";
import { CameraControls } from "@react-three/drei";
import { PointCloud, FpsMonitor, SceneGrid } from "@/features/scene/PointCloud";
import { NeighborLinks } from "@/features/scene/NeighborLinks";
import { ManualMarkerMesh } from "@/features/scene/ManualMarker";
import { ClusterLabels } from "@/features/scene/ClusterLabels";
import { HoverTooltip } from "@/features/scene/HoverTooltip";
import { useViewerStore } from "@/stores/viewer-store";

function CameraRig() {
  const controlsRef = useRef<ElementRef<typeof CameraControls>>(null);
  const flyTarget = useViewerStore((s) => s.cameraFlyTarget);
  const bounds = useViewerStore((s) => s.bounds);
  const clearCameraFlyTarget = useViewerStore((s) => s.clearCameraFlyTarget);

  useEffect(() => {
    if (!controlsRef.current || !flyTarget) return;
    const [tx, ty, tz] = flyTarget.target;
    const [px, py, pz] = flyTarget.position;
    void controlsRef.current.setLookAt(px, py, pz, tx, ty, tz, true);
    clearCameraFlyTarget();
  }, [flyTarget, clearCameraFlyTarget]);

  const resetView = () => {
    if (!controlsRef.current || !bounds) return;
    const [cx, cy, cz] = bounds.center;
    void controlsRef.current.setLookAt(cx, cy, cz + bounds.radius * 2.2, cx, cy, cz, true);
  };

  useEffect(() => {
    (window as Window & { __resetGeometryView?: () => void }).__resetGeometryView = resetView;
    return () => {
      delete (window as Window & { __resetGeometryView?: () => void }).__resetGeometryView;
    };
  }, [bounds]);

  return (
    <CameraControls
      ref={controlsRef}
      makeDefault
      minDistance={0.5}
      maxDistance={200}
      dollySpeed={0.8}
      smoothTime={0.35}
    />
  );
}

export function SceneShell() {
  const dataset = useViewerStore((s) => s.dataset);
  const isLoading = useViewerStore((s) => s.isLoading);
  const loadError = useViewerStore((s) => s.loadError);
  const loadStreet = useViewerStore((s) => s.loadStreet);

  useEffect(() => {
    void loadStreet();
  }, [loadStreet]);

  return (
    <div className="absolute inset-0 pt-14">
      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <p className="text-sm text-zinc-300">Loading manifold artifacts…</p>
        </div>
      )}
      {loadError && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60">
          <p className="max-w-md text-center text-sm text-rose-300">{loadError}</p>
        </div>
      )}
      <Canvas camera={{ position: [0, 0, 12], fov: 45 }} dpr={[1, 2]} gl={{ antialias: true }}>
        <color attach="background" args={["#0a0a0f"]} />
        <fog attach="fog" args={["#0a0a0f", 30, 80]} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[8, 12, 6]} intensity={0.45} />
        <SceneGrid />
        {dataset && <PointCloud />}
        <NeighborLinks />
        <ManualMarkerMesh />
        <ClusterLabels />
        <HoverTooltip />
        <FpsMonitor />
        <CameraRig />
      </Canvas>
    </div>
  );
}

export function resetCameraView() {
  (window as Window & { __resetGeometryView?: () => void }).__resetGeometryView?.();
}
