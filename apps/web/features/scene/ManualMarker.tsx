"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useViewerStore } from "@/stores/viewer-store";
import { PlayingCard } from "@/components/ui/PlayingCard";
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
      <Html
        position={[0, 0.46, 0]}
        center
        style={{ pointerEvents: "none" }}
        zIndexRange={[12, 0]}
      >
        {/* Hidden on phones, where the selection peek card shows the same cards. */}
        <div className="hidden -translate-y-[calc(50%+14px)] items-center gap-2 whitespace-nowrap rounded-[12px] border border-amber-200/40 bg-[rgba(30,24,10,0.85)] px-2.5 py-2 shadow-2xl backdrop-blur-xl md:flex">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-amber-200/90">
            Your hand
          </span>
          <span className="flex gap-[3px]">
            {marker.hero.map((c) => (
              <PlayingCard key={c} card={c} size="xs" />
            ))}
          </span>
          {marker.board.length > 0 && (
            <>
              <span className="h-5 w-px bg-white/15" aria-hidden="true" />
              <span className="flex gap-[3px]">
                {marker.board.map((c) => (
                  <PlayingCard key={c} card={c} size="xs" />
                ))}
              </span>
            </>
          )}
        </div>
      </Html>
    </group>
  );
}
