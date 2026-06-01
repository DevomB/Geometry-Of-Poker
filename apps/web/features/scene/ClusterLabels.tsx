"use client";

import { Html } from "@react-three/drei";
import { useViewerStore } from "@/stores/viewer-store";

export function ClusterLabels() {
  const show = useViewerStore((s) => s.showClusterLabels);
  const manifest = useViewerStore((s) => s.dataset?.manifest);

  if (!show || !manifest?.clusters?.length) return null;

  return (
    <>
      {manifest.clusters.map((c) => (
        <Html
          key={c.id}
          position={c.centroid}
          center
          distanceFactor={12}
          style={{ pointerEvents: "none" }}
        >
          <div className="rounded border border-white/10 bg-black/70 px-2 py-0.5 text-[10px] font-medium tracking-wide text-zinc-200">
            C{c.id} · {c.size}
          </div>
        </Html>
      ))}
    </>
  );
}
