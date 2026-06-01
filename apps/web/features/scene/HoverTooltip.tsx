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

  const point = dataset.metadata[index];
  if (!point) return null;
  const locked = !!(selection?.locked && selection.index === index);

  return (
    <Html
      position={[point.x, point.y + 0.4, point.z]}
      center
      distanceFactor={10}
      style={{ pointerEvents: "none", transform: "translateY(-24px)" }}
    >
      <div
        role="status"
        aria-live="polite"
        className={`min-w-[180px] max-w-[240px] rounded-md border px-3 py-2 text-xs shadow-2xl backdrop-blur-md gop-fade-in ${
          locked
            ? "border-amber-300/40 bg-amber-500/5"
            : "border-[var(--border-default)] bg-[var(--surface-glass-strong)]"
        }`}
      >
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="text-zinc-100">{humanCategory(point.category)}</span>
          <span className="gop-mono tabular-nums text-zinc-400">
            {(point.equityVsRandom * 100).toFixed(1)}%
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          <CardDisplay cards={point.hero} label="Hero" compact />
          {point.board.length > 0 && (
            <CardDisplay cards={point.board} label="Board" compact />
          )}
        </div>
        {locked && (
          <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-amber-300/80">
            Selected
          </p>
        )}
      </div>
    </Html>
  );
}

function humanCategory(name: string): string {
  return name.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}
