"use client";

import { Html } from "@react-three/drei";
import { useViewerStore } from "@/stores/viewer-store";
import { PlayingCard } from "@/components/ui/PlayingCard";
import { humanCategory } from "@/lib/poker/human-category";

export function HoverTooltip() {
  const hoverIndex = useViewerStore((s) => s.hoverIndex);
  const selection = useViewerStore((s) => s.selection);
  const dataset = useViewerStore((s) => s.dataset);

  const index = selection?.locked ? selection.index : hoverIndex;
  if (index === null || !dataset) return null;

  const point = dataset.metadata[index];
  if (!point) return null;
  const locked = !!(selection?.locked && selection.index === index);
  const eq = Math.max(0, Math.min(1, point.equityVsRandom));

  return (
    <Html
      position={[point.x, point.y + 0.4, point.z]}
      center
      style={{ pointerEvents: "none" }}
      zIndexRange={[15, 13]}
    >
      {/* Offset on an inner node: a transform on Html's own style replaces its centring. */}
      <div
        role="status"
        aria-live="polite"
        className={`gop-fade-in hidden w-max min-w-[200px] max-w-[280px] -translate-y-[calc(50%+18px)] rounded-[12px] md:block border px-3 py-2.5 shadow-2xl backdrop-blur-xl ${
          locked
            ? "border-amber-200/40 bg-[rgba(30,24,10,0.85)]"
            : "border-[var(--border-strong)] bg-[rgba(12,14,20,0.88)]"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="flex gap-[3px]">
            {point.hero.map((c) => (
              <PlayingCard key={c} card={c} size="xs" />
            ))}
          </span>
          {point.board.length > 0 && (
            <>
              <span className="h-5 w-px bg-white/15" aria-hidden="true" />
              <span className="flex gap-[3px]">
                {point.board.map((c) => (
                  <PlayingCard key={c} card={c} size="xs" />
                ))}
              </span>
            </>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="truncate text-[12.5px] font-medium text-[var(--text-primary)]">
            {humanCategory(point.category)}
          </span>
          <span className="gop-mono text-[12.5px] tabular-nums text-[var(--text-primary)]">
            {(eq * 100).toFixed(1)}%
          </span>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.08]" aria-hidden="true">
          <div
            className="h-full rounded-full"
            style={{
              width: `${eq * 100}%`,
              background: "linear-gradient(90deg, #385f9e, #cf8b6f, #e64a3f)",
            }}
          />
        </div>
        {locked && (
          <p className="mt-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-amber-200/90">
            Selected
          </p>
        )}
      </div>
    </Html>
  );
}
