"use client";

import { Html } from "@react-three/drei";
import { useViewerStore } from "@/stores/viewer-store";
import { CLUSTER_PALETTE } from "@/lib/types";
import { rgbCss } from "@/lib/visualization-theme";

export function ClusterLabels() {
  const show = useViewerStore((s) => s.showClusterLabels);
  const manifest = useViewerStore((s) => s.dataset?.manifest);
  const renderQuality = useViewerStore((s) => s.renderQuality);

  if (!show || renderQuality.tier === "performance" || !manifest?.clusters?.length) {
    return null;
  }

  return (
    <>
      {manifest.clusters.map((c) => (
        <Html
          key={c.id}
          position={c.centroid}
          center
          style={{ pointerEvents: "none" }}
          zIndexRange={[10, 0]}
        >
          <div className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-white/10 bg-[rgba(10,12,17,0.82)] px-2.5 py-1 text-[11px] font-medium text-zinc-100 shadow-lg backdrop-blur">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: rgbCss(CLUSTER_PALETTE[c.id % CLUSTER_PALETTE.length]!) }}
              aria-hidden="true"
            />
            <span className="gop-mono">C{c.id}</span>
            <span className="gop-mono text-zinc-400">{c.size.toLocaleString()}</span>
          </div>
        </Html>
      ))}
    </>
  );
}
