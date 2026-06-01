"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useViewerStore } from "@/stores/viewer-store";
import {
  MANUAL_MARKER_COLOR,
  MANUAL_MARKER_CORE,
} from "@/lib/visualization-theme";

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mql.matches);
    update();
    mql.addEventListener?.("change", update);
    return () => mql.removeEventListener?.("change", update);
  }, []);
  return reduced;
}

export function ManualMarkerMesh() {
  const marker = useViewerStore((s) => s.manualMarker);
  const ringRef = useRef<THREE.Mesh>(null);
  const reducedMotion = useReducedMotion();

  useFrame(({ clock }) => {
    if (!ringRef.current || reducedMotion) return;
    const t = clock.elapsedTime;
    const s = 1 + Math.sin(t * 2.4) * 0.08;
    ringRef.current.scale.setScalar(s);
    ringRef.current.rotation.y = t * 0.4;
  });

  if (!marker) return null;

  return (
    <group position={marker.position}>
      <mesh ref={ringRef}>
        <octahedronGeometry args={[0.34, 0]} />
        <meshStandardMaterial
          color={MANUAL_MARKER_COLOR}
          emissive={MANUAL_MARKER_COLOR}
          emissiveIntensity={0.55}
          wireframe
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.11, 16, 16]} />
        <meshStandardMaterial
          color={MANUAL_MARKER_CORE}
          emissive={MANUAL_MARKER_CORE}
          emissiveIntensity={1.1}
        />
      </mesh>
    </group>
  );
}
