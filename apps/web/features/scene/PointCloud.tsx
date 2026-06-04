"use client";

import { useMemo, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
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
  const setHoverIndex = useViewerStore((s) => s.setHoverIndex);
  const selectPoint = useViewerStore((s) => s.selectPoint);
  const pointsRef = useRef<THREE.Points>(null);
  const lastFallbackHoverAt = useRef(0);

  const geometry = useMemo(() => {
    if (!dataset) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(dataset.positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(dataset.colors, 3));
    geo.setAttribute("size", new THREE.BufferAttribute(dataset.sizes, 1));
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
    if (!dataset || !geometry) return;
    const pos = geometry.getAttribute("position") as THREE.BufferAttribute;
    const col = geometry.getAttribute("color") as THREE.BufferAttribute;
    const size = geometry.getAttribute("size") as THREE.BufferAttribute;
    pos.needsUpdate = true;
    col.array = dataset.colors;
    col.needsUpdate = true;
    size.array = dataset.sizes;
    size.needsUpdate = true;
  }, [dataset, geometry]);

  useFrame(() => {
    // FPS tracked in FpsMonitor
  });

  const handlePointerMove = (event: THREE.Event & { point: THREE.Vector3; index?: number }) => {
    if (!dataset) return;
    if (typeof event.index === "number") {
      setHoverIndex(event.index);
      return;
    }

    const now = performance.now();
    if (now - lastFallbackHoverAt.current < 50) return;
    lastFallbackHoverAt.current = now;

    const ray = event as unknown as { ray?: THREE.Ray };
    if (!ray.ray) return;
    const origin = ray.ray.origin.toArray() as [number, number, number];
    const direction = ray.ray.direction.toArray() as [number, number, number];
    const threshold = bounds?.radius ? bounds.radius * 0.02 : 0.15;
    const index = nearestPointToRay(
      dataset.positions,
      dataset.count,
      origin,
      direction,
      threshold,
    );
    setHoverIndex(index >= 0 ? index : null);
  };

  const handleClick = () => {
    const hover = useViewerStore.getState().hoverIndex;
    if (hover !== null) selectPoint(hover, true);
  };

  if (!geometry) return null;

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      material={material}
      onPointerMove={handlePointerMove}
      onClick={handleClick}
    />
  );
}

export function FpsMonitor() {
  const setFps = useViewerStore((s) => s.setFps);
  const frames = useRef(0);
  const last = useRef(performance.now());

  useFrame(() => {
    frames.current += 1;
    const now = performance.now();
    if (now - last.current >= 1000) {
      setFps(frames.current);
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
