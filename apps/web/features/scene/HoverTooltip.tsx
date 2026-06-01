"use client";

import { Html } from "@react-three/drei";
import { useViewerStore } from "@/stores/viewer-store";
import { CardDisplay } from "@/components/CardDisplay";

export function HoverTooltip() {
  const hoverIndex = useViewerStore((s) => s.hoverIndex);
  const selection = useViewerStore((s) => s.selection);
  const dataset = useViewerStore((s) => s.dataset);

  const index = selection?.locked ? selection.index : hoverIndex;
  if (index === null || !dataset) return null;

  const point = dataset.metadata[index]!;
  const locked = selection?.locked && selection.index === index;

  return (
    <Html
      position={[point.x, point.y + 0.4, point.z]}
      center
      distanceFactor={10}
      style={{ pointerEvents: "none", transform: "translateY(-24px)" }}
    >
      <div
        className={`min-w-[180px] rounded border px-3 py-2 text-xs shadow-lg backdrop-blur ${
          locked
            ? "border-emerald-400/40 bg-emerald-950/80"
            : "border-white/15 bg-black/75"
        }`}
      >
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="font-medium text-zinc-100">{point.category}</span>
          <span className="tabular-nums text-zinc-400">
            {(point.equityVsRandom * 100).toFixed(1)}%
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          <CardDisplay cards={point.hero} label="Hero" compact />
          {point.board.length > 0 && <CardDisplay cards={point.board} label="Board" compact />}
        </div>
        {locked && (
          <p className="mt-1 text-[10px] uppercase tracking-wider text-emerald-300/80">Selected</p>
        )}
      </div>
    </Html>
  );
}
