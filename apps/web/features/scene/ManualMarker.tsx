"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useViewerStore } from "@/stores/viewer-store";

export function ManualMarkerMesh() {
  const marker = useViewerStore((s) => s.manualMarker);
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const s = 1 + Math.sin(clock.elapsedTime * 3) * 0.15;
    ref.current.scale.setScalar(s);
  });

  if (!marker) return null;

  return (
    <group position={marker.position}>
      <mesh ref={ref}>
        <octahedronGeometry args={[0.35, 0]} />
        <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.6} wireframe />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#fef3c7" emissive="#fde68a" emissiveIntensity={1.2} />
      </mesh>
    </group>
  );
}
