"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Points } from "three";

/**
 * Placeholder GPU point cloud — random unit-sphere samples.
 * Replaced in Phase 3 with artifact-loaded Float32Array positions.
 */
export function PointCloudPlaceholder() {
  const ref = useRef<Points>(null);

  const geometry = useMemo(() => {
    const count = 2_000;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2 + Math.random() * 0.5;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    return { positions, count };
  }, []);

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.05;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry attach="geometry">
        <bufferAttribute
          attach="attributes-position"
          args={[geometry.positions, 3]}
          count={geometry.count}
        />
      </bufferGeometry>
      <pointsMaterial attach="material" size={0.03} color="#6ee7b7" sizeAttenuation />
    </points>
  );
}
