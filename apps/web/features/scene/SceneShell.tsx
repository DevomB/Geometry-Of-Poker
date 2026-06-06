"use client";

import { useEffect, useRef, useState, type ElementRef } from "react";
import { Canvas } from "@react-three/fiber";
import { CameraControls } from "@react-three/drei";
import { PointCloud, FpsMonitor, SceneGrid } from "@/features/scene/PointCloud";
import { NeighborLinks } from "@/features/scene/NeighborLinks";
import { ManualMarkerMesh } from "@/features/scene/ManualMarker";
import { ClusterLabels } from "@/features/scene/ClusterLabels";
import { HoverTooltip } from "@/features/scene/HoverTooltip";
import { SceneAxes } from "@/features/scene/SceneAxes";
import { useViewerStore } from "@/stores/viewer-store";
import { SCENE_BACKGROUND, SCENE_FOG_FAR, SCENE_FOG_NEAR } from "@/lib/visualization-theme";

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

  useEffect(() => {
    const resetView = () => {
      if (!controlsRef.current || !bounds) return;
      const [cx, cy, cz] = bounds.center;
      void controlsRef.current.setLookAt(
        cx,
        cy,
        cz + bounds.radius * 2.2,
        cx,
        cy,
        cz,
        true,
      );
    };
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

/** Detect WebGL availability without side-effects on the actual canvas. */
function useWebGLAvailable(): boolean | null {
  const [available, setAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const gl =
        (canvas.getContext("webgl2") as WebGLRenderingContext | null) ??
        (canvas.getContext("webgl") as WebGLRenderingContext | null);
      setAvailable(!!gl);
    } catch {
      setAvailable(false);
    }
  }, []);
  return available;
}

export function SceneShell() {
  const dataset = useViewerStore((s) => s.dataset);
  const isLoading = useViewerStore((s) => s.isLoading);
  const loadError = useViewerStore((s) => s.loadError);
  const street = useViewerStore((s) => s.street);
  const loadStreet = useViewerStore((s) => s.loadStreet);
  const renderQuality = useViewerStore((s) => s.renderQuality);
  const webglAvailable = useWebGLAvailable();

  useEffect(() => {
    void loadStreet();
  }, [loadStreet]);

  const showSpinner = isLoading && !dataset;
  const showRefresh = isLoading && dataset;

  return (
    <div className="absolute inset-0 pt-14">
      <div className="gop-grid-bg pointer-events-none absolute inset-0 opacity-40" />

      {webglAvailable === false && (
        <SceneOverlay tone="error" title="WebGL unavailable">
          <p>
            This research visualization requires WebGL. Please use a modern
            desktop browser (Chrome, Firefox, Safari, or Edge) with hardware
            acceleration enabled.
          </p>
        </SceneOverlay>
      )}

      {showSpinner && (
        <SceneOverlay tone="info" title={`Loading ${street} manifold`}>
          <LoadingProgress />
          <p className="text-[10px] text-zinc-500">
            Streaming binary point positions and metadata…
          </p>
        </SceneOverlay>
      )}

      {loadError && !isLoading && (
        <SceneOverlay tone="error" title="Couldn't load manifold">
          <p className="text-zinc-300">{summarizeError(loadError)}</p>
          <button
            type="button"
            onClick={() => void loadStreet()}
            className="mt-2 rounded border border-[var(--border-default)] bg-white/[0.06] px-3 py-1.5 text-xs text-zinc-100 transition hover:bg-white/[0.12]"
          >
            Retry
          </button>
        </SceneOverlay>
      )}

      {showRefresh && (
        <div className="pointer-events-none absolute right-4 top-4 z-10 flex items-center gap-2 rounded border border-[var(--border-default)] bg-[var(--surface-glass-strong)] px-2.5 py-1 text-[11px] text-zinc-300 backdrop-blur">
          <span className="gop-pulse-soft inline-block h-1.5 w-1.5 rounded-full bg-cyan-300" />
          Refreshing {street}…
        </div>
      )}

      {webglAvailable !== false && (
        <Canvas
          camera={{ position: [0, 0, 12], fov: 45 }}
          dpr={[1, renderQuality.dprMax]}
          gl={{ antialias: false, powerPreference: "high-performance" }}
        >
          <color attach="background" args={[SCENE_BACKGROUND]} />
          <fog attach="fog" args={[SCENE_BACKGROUND, SCENE_FOG_NEAR, SCENE_FOG_FAR]} />
          <ambientLight intensity={0.35} />
          <directionalLight position={[8, 12, 6]} intensity={0.45} />
          <SceneGrid />
          <SceneAxes />
          {dataset && <PointCloud />}
          <NeighborLinks />
          <ManualMarkerMesh />
          <ClusterLabels />
          <HoverTooltip />
          <FpsMonitor />
          <CameraRig />
        </Canvas>
      )}
    </div>
  );
}

export function resetCameraView() {
  (window as Window & { __resetGeometryView?: () => void }).__resetGeometryView?.();
}

function SceneOverlay({
  tone,
  title,
  children,
}: {
  tone: "info" | "error";
  title: string;
  children: React.ReactNode;
}) {
  const ring =
    tone === "error" ? "border-rose-500/30" : "border-cyan-400/30";
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className="absolute inset-0 z-20 flex items-center justify-center bg-black/45 backdrop-blur-sm"
    >
      <div
        className={`gop-fade-in max-w-md rounded-md border ${ring} bg-[var(--surface-glass-strong)] p-5 text-center shadow-2xl`}
      >
        <h3 className="mb-2 text-sm font-medium text-zinc-100">{title}</h3>
        <div className="space-y-2 text-[12px] leading-relaxed text-zinc-400">
          {children}
        </div>
      </div>
    </div>
  );
}

function LoadingProgress() {
  return (
    <div className="mx-auto mb-2 h-1 w-48 overflow-hidden rounded-full bg-white/[0.06]">
      <div
        className="h-full w-1/3 rounded-full bg-cyan-400/60"
        style={{
          animation: "gop-loading-track 1.6s ease-in-out infinite",
        }}
      />
      <style>{`@keyframes gop-loading-track { 0% { transform: translateX(-50%);} 100% { transform: translateX(220%);} }`}</style>
    </div>
  );
}

function summarizeError(message: string): string {
  if (/artifact.*cdn|cdn.*artifact/i.test(message)) {
    return "Artifact CDN unreachable. Check CloudFront CORS/status or retry after cache propagation.";
  }
  if (/network|fetch|failed to fetch/i.test(message)) {
    return "Backend unreachable. Check your network connection or the server status.";
  }
  if (/manifest/i.test(message) && /404|missing/i.test(message)) {
    return "Artifacts for this street are not yet available.";
  }
  if (/version mismatch|schema/i.test(message)) {
    return "Artifact schema version mismatch. The server and client are out of sync.";
  }
  if (/parse|magic|count mismatch|corrupt/i.test(message)) {
    return "Binary artifact appears corrupted. Try refreshing or rebuilding artifacts.";
  }
  return message;
}

