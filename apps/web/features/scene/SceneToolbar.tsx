"use client";

import type { ReactNode } from "react";
import { useViewerStore } from "@/stores/viewer-store";
import { resetCameraView } from "@/features/scene/camera-actions";
import { COLOR_MODE_META } from "@/lib/visualization-theme";
import { IconLink, IconReset, IconTag } from "@/components/ui/Icons";

function ToolButton({
  label,
  shortcut,
  active,
  onClick,
  children,
}: {
  label: string;
  shortcut: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={`${label} (${shortcut})`}
      aria-label={label}
      className={`group relative flex h-9 w-9 items-center justify-center rounded-[10px] transition ${
        active
          ? "bg-[var(--accent-soft)] text-[var(--accent)]"
          : "text-[var(--text-secondary)] hover:bg-white/[0.07] hover:text-[var(--text-primary)]"
      }`}
    >
      {children}
    </button>
  );
}

/** Floating bottom-centre toolbar: camera + layer toggles and a live legend. */
export function SceneToolbar() {
  const dataset = useViewerStore((s) => s.dataset);
  const colorMode = useViewerStore((s) => s.colorMode);
  const showNnLinks = useViewerStore((s) => s.showNnLinks);
  const showClusterLabels = useViewerStore((s) => s.showClusterLabels);
  const toggleNnLinks = useViewerStore((s) => s.toggleNnLinks);
  const toggleClusterLabels = useViewerStore((s) => s.toggleClusterLabels);
  // Subscribe to revision so the visible count refreshes after filter changes.
  useViewerStore((s) => s.visualizationRevision);

  const meta = COLOR_MODE_META[colorMode];
  let visibleCount = 0;
  if (dataset) {
    for (let i = 0; i < dataset.visible.length; i++) {
      if (dataset.visible[i]) visibleCount++;
    }
  }
  const showGradient = meta.legendKind === "continuous" || meta.legendKind === "diverging";

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center">
      <div className="gop-float gop-slide-in-up pointer-events-auto flex items-center gap-1 p-1.5">
        <ToolButton label="Reset camera" shortcut="R" onClick={resetCameraView}>
          <IconReset size={17} />
        </ToolButton>
        <ToolButton
          label="Nearest-neighbor links"
          shortcut="L"
          active={showNnLinks}
          onClick={toggleNnLinks}
        >
          <IconLink size={17} />
        </ToolButton>
        <ToolButton
          label="Cluster labels"
          shortcut="C"
          active={showClusterLabels}
          onClick={toggleClusterLabels}
        >
          <IconTag size={17} />
        </ToolButton>

        <span className="mx-1.5 hidden h-6 w-px bg-[var(--border-default)] 2xl:block" aria-hidden="true" />

        <div className="hidden items-center gap-3 pl-1 pr-3 2xl:flex">
          <div className="leading-tight">
            <p className="text-[11px] text-[var(--text-tertiary)]">Colour</p>
            <p className="text-[12.5px] font-medium text-[var(--text-primary)]">{meta.label}</p>
          </div>
          {showGradient && (
            <div className="w-36">
              <div
                className="h-2 w-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${meta.legend.stops.join(", ")})` }}
                aria-hidden="true"
              />
              <div className="gop-mono mt-1 flex justify-between text-[10px] text-[var(--text-tertiary)]">
                <span>{meta.legend.labels[0]}</span>
                <span>{meta.legend.labels[1]}</span>
              </div>
            </div>
          )}
        </div>

        {dataset && (
          <>
            <span className="mx-1 hidden h-6 w-px bg-[var(--border-default)] lg:block" aria-hidden="true" />
            <div className="hidden px-3 leading-tight lg:block">
              <p className="text-[11px] text-[var(--text-tertiary)]">Visible</p>
              <p className="gop-mono text-[12.5px] tabular-nums text-[var(--text-primary)]">
                {visibleCount.toLocaleString()}
                <span className="text-[var(--text-tertiary)]"> / {dataset.count.toLocaleString()}</span>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
