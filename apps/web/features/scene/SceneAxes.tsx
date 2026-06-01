"use client";

import { Html } from "@react-three/drei";
import { useViewerStore } from "@/stores/viewer-store";
import { AXIS_COLORS } from "@/lib/visualization-theme";

/**
 * Subtle world-space coordinate cue. Anchored to the dataset bounds center
 * with axis lines roughly equal to bounding sphere radius. Labels render in
 * HTML so they always read clearly regardless of camera distance.
 */
export function SceneAxes() {
  const bounds = useViewerStore((s) => s.bounds);
  if (!bounds) return null;
  const r = Math.max(2, bounds.radius * 1.05);
  const [cx, cy, cz] = bounds.center;
  const start: [number, number, number] = [cx - r, cy - r, cz - r];

  return (
    <group position={start}>
      <AxisLine color={AXIS_COLORS.x} end={[r * 1.1, 0, 0]} />
      <AxisLine color={AXIS_COLORS.y} end={[0, r * 1.1, 0]} />
      <AxisLine color={AXIS_COLORS.z} end={[0, 0, r * 1.1]} />
      <AxisLabel position={[r * 1.18, 0, 0]} color={AXIS_COLORS.x} text="x" />
      <AxisLabel position={[0, r * 1.18, 0]} color={AXIS_COLORS.y} text="y" />
      <AxisLabel position={[0, 0, r * 1.18]} color={AXIS_COLORS.z} text="z" />
    </group>
  );
}

function AxisLine({
  color,
  end,
}: {
  color: string;
  end: [number, number, number];
}) {
  const positions = new Float32Array([0, 0, 0, ...end]);
  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={2}
        />
      </bufferGeometry>
      <lineBasicMaterial color={color} transparent opacity={0.35} />
    </lineSegments>
  );
}

function AxisLabel({
  position,
  color,
  text,
}: {
  position: [number, number, number];
  color: string;
  text: string;
}) {
  return (
    <Html
      position={position}
      center
      distanceFactor={14}
      style={{ pointerEvents: "none" }}
    >
      <span
        className="gop-mono text-[10px] font-semibold tracking-wider"
        style={{ color, textShadow: "0 0 4px rgba(0,0,0,0.6)" }}
      >
        {text}
      </span>
    </Html>
  );
}
