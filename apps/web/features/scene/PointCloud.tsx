"use client";

import { useMemo, useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useViewerStore } from "@/stores/viewer-store";
import { nearestPointToRay } from "@/lib/spatial/grid-index";

const vertexShader = /* glsl */ `
  attribute float size;
  attribute vec3 color;
  varying vec3 vColor;
  void main() {
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (220.0 / -mvPosition.z);
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
    gl_FragColor = vec4(vColor, alpha);
  }
`;

export function PointCloud() {
  const dataset = useViewerStore((s) => s.dataset);
  const bounds = useViewerStore((s) => s.bounds);
  const visualizationRevision = useViewerStore((s) => s.visualizationRevision);
  const visualUpdate = useViewerStore((s) => s.visualUpdate);
  const renderQuality = useViewerStore((s) => s.renderQuality);
  const lodSampleRate = useViewerStore((s) => s.lodSampleRate);
  const setHoverIndex = useViewerStore((s) => s.setHoverIndex);
  const selectPoint = useViewerStore((s) => s.selectPoint);
  const pointsRef = useRef<THREE.Points>(null);
  const lastHoverAt = useRef(0);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const pointer = useMemo(() => new THREE.Vector2(), []);
  const { camera, gl } = useThree();

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

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );

  useEffect(() => {
    return () => {
      geometry?.dispose();
    };
  }, [geometry]);

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

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

  useEffect(() => {
    const canvas = gl.domElement;
    if (!dataset || !bounds) {
      canvas.style.cursor = "";
      return;
    }

    let dragStart: { x: number; y: number } | null = null;

    const updateHoverFromPointer = (event: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverAt.current < renderQuality.hoverIntervalMs) return;
      lastHoverAt.current = now;

      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      const origin = raycaster.ray.origin.toArray() as [number, number, number];
      const direction = raycaster.ray.direction.toArray() as [number, number, number];
      const threshold =
        bounds.radius *
        (renderQuality.tier === "performance"
          ? 0.035
          : renderQuality.tier === "balanced"
            ? 0.026
            : 0.02);
      const sampleStep =
        renderQuality.tier === "performance"
          ? Math.max(1, Math.floor(1 / Math.max(lodSampleRate, 0.2)))
          : 1;
      const index = nearestPointToRay(
        dataset.positions,
        dataset.count,
        origin,
        direction,
        threshold,
        dataset.sizes,
        sampleStep,
      );
      canvas.style.cursor = index >= 0 ? "pointer" : "";
      setHoverIndex(index >= 0 ? index : null);
    };

    const handlePointerDown = (event: PointerEvent) => {
      dragStart = { x: event.clientX, y: event.clientY };
    };

    const handlePointerMove = (event: PointerEvent) => {
      updateHoverFromPointer(event);
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (!dragStart) return;
      const dx = event.clientX - dragStart.x;
      const dy = event.clientY - dragStart.y;
      dragStart = null;
      if (Math.hypot(dx, dy) > 5) return;
      const hover = useViewerStore.getState().hoverIndex;
      if (hover !== null) selectPoint(hover, true);
    };

    const handlePointerLeave = () => {
      setHoverIndex(null);
    };

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove, { passive: true });
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      canvas.style.cursor = "";
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointerleave", handlePointerLeave);
    };
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
