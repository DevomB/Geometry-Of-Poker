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
import {
  CAMERA_FRAME_DISTANCE,
  SCENE_BACKGROUND,
  SCENE_FOG_FAR,
  SCENE_FOG_NEAR,
} from "@/lib/visualization-theme";

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
        cz + bounds.radius * CAMERA_FRAME_DISTANCE,
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
    <div className="absolute inset-0">
      <div className="gop-grid-bg pointer-events-none absolute inset-0 opacity-60" />

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
          <p className="text-[12px] text-[var(--text-tertiary)]">
            Streaming binary point positions and metadata…
          </p>
        </SceneOverlay>
      )}

      {loadError && !isLoading && (
        <SceneOverlay tone="error" title="Couldn't load manifold">
          <p>{summarizeError(loadError)}</p>
          <button
            type="button"
            onClick={() => void loadStreet()}
            className="gop-btn gop-btn-primary mt-3"
          >
            Retry
          </button>
        </SceneOverlay>
      )}

      {showRefresh && (
        <div className="gop-float pointer-events-none absolute left-1/2 top-[84px] z-30 flex -translate-x-1/2 items-center gap-2 px-3.5 py-2 text-[12px] text-[var(--text-secondary)]">
          <span className="gop-pulse-soft inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
          Streaming {street} states…
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
      <div className="gop-vignette pointer-events-none absolute inset-0" aria-hidden="true" />
    </div>
  );
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
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
    >
      <div className="gop-float gop-fade-in w-full max-w-sm p-6 text-center">
        <div
          className={`mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full ${
            tone === "error"
              ? "bg-rose-500/15 text-rose-300"
              : "bg-[var(--accent-soft)] text-[var(--accent)]"
          }`}
          aria-hidden="true"
        >
          {tone === "error" ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 8v5M12 16h.01" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          ) : (
            <span className="gop-pulse-soft h-2.5 w-2.5 rounded-full bg-current" />
          )}
        </div>
        <h3 className="mb-2 text-[15px] font-semibold text-[var(--text-primary)]">{title}</h3>
        <div className="space-y-2 text-[13px] leading-relaxed text-[var(--text-secondary)]">
          {children}
        </div>
      </div>
    </div>
  );
}

function LoadingProgress() {
  return (
    <div className="mx-auto mb-3 h-1 w-56 overflow-hidden rounded-full bg-white/[0.07]">
      <div
        className="h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent"
        style={{ animation: "gop-loading-track 1.4s ease-in-out infinite" }}
      />
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

