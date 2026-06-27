"use client";

import { useMemo, useRef, useEffect } from "react";
import type { MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useViewerStore } from "@/stores/viewer-store";
import { nearestPointToRay } from "@/lib/spatial/grid-index";
import type { StreetDataset } from "@/lib/types";

const vertexShader = /* glsl */ `
  attribute float size;
  attribute vec3 color;
  varying vec3 vColor;
  void main() {
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float depth = max(2.0, -mvPosition.z);
    gl_PointSize = clamp(size * (36.0 / depth), 1.0, 10.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  void main() {
    vec2 c = gl_PointCoord - vec2(0.5);
    float d = dot(c, c);
    if (d > 0.25) discard;
    float alpha = smoothstep(0.25, 0.12, d);
    gl_FragColor = vec4(vColor, alpha * 0.82);
  }
`;

type Bounds = { radius: number };
type RenderQuality = { hoverIntervalMs: number; tier: string };
type DragStart = { x: number; y: number } | null;

interface PointPickingOptions {
  canvas: HTMLCanvasElement;
  camera: THREE.Camera;
  dataset: StreetDataset;
  bounds: Bounds;
  renderQuality: RenderQuality;
  lodSampleRate: number;
  pointer: THREE.Vector2;
  raycaster: THREE.Raycaster;
  lastHoverAt: MutableRefObject<number>;
  setHoverIndex: (index: number | null) => void;
  selectPoint: (index: number, focus?: boolean) => void;
}

function usePointCloudGeometry(dataset: StreetDataset | null): THREE.BufferGeometry | null {
  const geometry = useMemo(() => {
    if (!dataset) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.BufferAttribute(dataset.positions, 3).setUsage(THREE.StaticDrawUsage),
    );
    geo.setAttribute(
      "color",
      new THREE.BufferAttribute(dataset.colors, 3).setUsage(THREE.DynamicDrawUsage),
    );
    geo.setAttribute(
      "size",
      new THREE.BufferAttribute(dataset.sizes, 1).setUsage(THREE.DynamicDrawUsage),
    );
    return geo;
  }, [dataset]);

  useEffect(() => {
    return () => {
      geometry?.dispose();
    };
  }, [geometry]);

  return geometry;
}

function usePointCloudMaterial(): THREE.ShaderMaterial {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
      }),
    [],
  );

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  return material;
}

function useGeometryUpdates(dataset: StreetDataset | null, geometry: THREE.BufferGeometry | null) {
  const visualizationRevision = useViewerStore((s) => s.visualizationRevision);
  const visualUpdate = useViewerStore((s) => s.visualUpdate);

  useEffect(() => {
    if (!dataset || !geometry) return;
    const pos = geometry.getAttribute("position") as THREE.BufferAttribute;
    const col = geometry.getAttribute("color") as THREE.BufferAttribute;
    const size = geometry.getAttribute("size") as THREE.BufferAttribute;
    if (visualUpdate.kind === "full") {
      pos.needsUpdate = true;
      col.needsUpdate = true;
      size.needsUpdate = true;
      return;
    }

    col.clearUpdateRanges();
    size.clearUpdateRanges();
    for (const index of visualUpdate.indices) {
      col.addUpdateRange(index * 3, 3);
      size.addUpdateRange(index, 1);
    }

    col.needsUpdate = true;
    size.needsUpdate = true;
  }, [dataset, geometry, visualizationRevision, visualUpdate]);
}

function usePointPicking(dataset: StreetDataset | null) {
  const bounds = useViewerStore((s) => s.bounds);
  const renderQuality = useViewerStore((s) => s.renderQuality);
  const lodSampleRate = useViewerStore((s) => s.lodSampleRate);
  const setHoverIndex = useViewerStore((s) => s.setHoverIndex);
  const selectPoint = useViewerStore((s) => s.selectPoint);
  const lastHoverAt = useRef(0);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const pointer = useMemo(() => new THREE.Vector2(), []);
  const { camera, gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;
    if (!dataset || !bounds) {
      canvas.style.cursor = "";
      return;
    }
    return attachPointPicking({
      canvas,
      camera,
      dataset,
      bounds,
      renderQuality,
      lodSampleRate,
      pointer,
      raycaster,
      lastHoverAt,
      setHoverIndex,
      selectPoint,
    });
  }, [
    bounds,
    camera,
    dataset,
    gl,
    lodSampleRate,
    pointer,
    raycaster,
    renderQuality,
    selectPoint,
    setHoverIndex,
  ]);
}

function attachPointPicking(options: PointPickingOptions): () => void {
  let dragStart: DragStart = null;

  const handlePointerDown = (event: PointerEvent) => {
    dragStart = { x: event.clientX, y: event.clientY };
  };

  const handlePointerMove = (event: PointerEvent) => {
    updateHoverFromPointer(event, options);
  };

  const handlePointerUp = (event: PointerEvent) => {
    dragStart = selectHoveredPoint(event, dragStart, options.selectPoint);
  };

  const handlePointerLeave = () => {
    options.setHoverIndex(null);
  };

  options.canvas.addEventListener("pointerdown", handlePointerDown);
  options.canvas.addEventListener("pointermove", handlePointerMove, { passive: true });
  options.canvas.addEventListener("pointerup", handlePointerUp);
  options.canvas.addEventListener("pointerleave", handlePointerLeave);

  return () => {
    options.canvas.style.cursor = "";
    options.canvas.removeEventListener("pointerdown", handlePointerDown);
    options.canvas.removeEventListener("pointermove", handlePointerMove);
    options.canvas.removeEventListener("pointerup", handlePointerUp);
    options.canvas.removeEventListener("pointerleave", handlePointerLeave);
  };
}

function updateHoverFromPointer(event: PointerEvent, options: PointPickingOptions) {
  const now = performance.now();
  if (now - options.lastHoverAt.current < options.renderQuality.hoverIntervalMs) return;
  options.lastHoverAt.current = now;

  const rect = options.canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;
  options.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  options.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  options.raycaster.setFromCamera(options.pointer, options.camera);

  const index = nearestPointToRay({
    positions: options.dataset.positions,
    count: options.dataset.count,
    rayOrigin: options.raycaster.ray.origin.toArray() as [number, number, number],
    rayDirection: options.raycaster.ray.direction.toArray() as [number, number, number],
    threshold: pickingThreshold(options.bounds, options.renderQuality),
    sizes: options.dataset.sizes,
    sampleStep: pickingSampleStep(options.renderQuality, options.lodSampleRate),
  });
  options.canvas.style.cursor = index >= 0 ? "pointer" : "";
  options.setHoverIndex(index >= 0 ? index : null);
}

function selectHoveredPoint(
  event: PointerEvent,
  dragStart: DragStart,
  selectPoint: (index: number, focus?: boolean) => void,
): DragStart {
  if (!dragStart) return null;
  const dx = event.clientX - dragStart.x;
  const dy = event.clientY - dragStart.y;
  if (Math.hypot(dx, dy) <= 5) {
    const hover = useViewerStore.getState().hoverIndex;
    if (hover !== null) selectPoint(hover, true);
  }
  return null;
}

function pickingThreshold(bounds: Bounds, renderQuality: RenderQuality): number {
  if (renderQuality.tier === "performance") return bounds.radius * 0.035;
  if (renderQuality.tier === "balanced") return bounds.radius * 0.026;
  return bounds.radius * 0.02;
}

function pickingSampleStep(renderQuality: RenderQuality, lodSampleRate: number): number {
  if (renderQuality.tier !== "performance") return 1;
  return Math.max(1, Math.floor(1 / Math.max(lodSampleRate, 0.2)));
}

export function PointCloud() {
  const dataset = useViewerStore((s) => s.dataset);
  const pointsRef = useRef<THREE.Points>(null);
  const geometry = usePointCloudGeometry(dataset);
  const material = usePointCloudMaterial();

  useGeometryUpdates(dataset, geometry);
  usePointPicking(dataset);

  if (!geometry) return null;

  return <points ref={pointsRef} geometry={geometry} material={material} />;
}

export function FpsMonitor() {
  const setFps = useViewerStore((s) => s.setFps);
  const frames = useRef(0);
  const last = useRef(performance.now());

  useFrame(() => {
    frames.current += 1;
    const now = performance.now();
    if (now - last.current >= 1000) {
      const fps = Math.round((frames.current * 1000) / (now - last.current));
      setFps(fps);
      frames.current = 0;
      last.current = now;
    }
  });

  return null;
}

export function SceneGrid() {
  return (
    <gridHelper args={[40, 40, "#1a1a24", "#12121a"]} position={[0, -4, 0]} />
  );
}
