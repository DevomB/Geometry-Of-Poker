"use client";

import { useState } from "react";
import Link from "next/link";
import { useViewerStore } from "@/stores/viewer-store";
import { useHealth } from "@/lib/hooks/use-health";
import { Modal } from "@/components/Modal";
import { AboutResearchContent } from "@/components/research/AboutResearchContent";
import { STATUS } from "@/lib/visualization-theme";

function StatusDot({ color, pulsing }: { color: string; pulsing: boolean }) {
  return (
    <span className="relative flex h-2 w-2" aria-hidden="true">
      {pulsing && (
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-50"
          style={{ background: color }}
        />
      )}
      <span
        className="relative inline-flex h-2 w-2 rounded-full"
        style={{ background: color, boxShadow: `0 0 6px ${color}` }}
      />
    </span>
  );
}

export function TopNav() {
  const fps = useViewerStore((s) => s.fps);
  const targetFps = useViewerStore((s) => s.targetFps);
  const renderQuality = useViewerStore((s) => s.renderQuality);
  const dataset = useViewerStore((s) => s.dataset);
  const street = useViewerStore((s) => s.street);
  const isLoading = useViewerStore((s) => s.isLoading);
  const health = useHealth();
  const [aboutOpen, setAboutOpen] = useState(false);

  const statusColor =
    health.status === "ok" && health.payload.ok
      ? STATUS.ok
      : health.status === "error"
        ? STATUS.error
        : STATUS.warn;
  const engineLabel =
    health.status === "loading"
      ? "Connecting…"
      : health.status === "error"
        ? "Backend unreachable"
        : health.payload.status === "misconfigured"
          ? "Misconfigured"
          : health.payload.pokerCalculations.available
            ? "Engine ready"
            : "Engine degraded";
  const statusTitle =
    health.status === "ok"
      ? `Status: ${health.payload.status} · Artifacts: ${health.payload.artifactMode} · NAPI ${health.payload.pokerCalculations.napi}`
      : health.status === "error"
        ? health.error
        : "Probing /api/health…";

  return (
    <>
      <header className="pointer-events-auto absolute left-72 right-80 top-0 z-10 flex h-14 items-center justify-between border-b border-[var(--border-default)] bg-[var(--surface-glass-strong)] px-5 backdrop-blur-md">
        <div className="flex flex-col">
          <h1 className="text-sm font-semibold tracking-tight text-zinc-100">
            Geometry of Poker{" "}
            <span className="ml-1 text-[10px] font-normal uppercase tracking-[0.2em] text-zinc-500">
              research
            </span>
          </h1>
          <p className="gop-mono text-[10px] text-zinc-500">
            Texas Hold&apos;em state-space manifold
            <span className="mx-2 text-zinc-700">·</span>
            <span className="text-zinc-400">{street}</span>
            {dataset && (
              <>
                <span className="mx-2 text-zinc-700">·</span>
                <span className="tabular-nums text-zinc-400">
                  {dataset.count.toLocaleString()} states
                </span>
                <span className="mx-2 text-zinc-700">·</span>
                <span className="text-zinc-500">
                  {dataset.manifest.embeddingMethod.split(" ").pop() ?? "—"}
                </span>
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-4 gop-mono text-[11px] text-zinc-400">
          {dataset?.manifest.version && (
            <span
              title="Active artifact version"
              className="hidden rounded border border-[var(--border-subtle)] bg-white/[0.02] px-2 py-0.5 tabular-nums text-zinc-400 lg:inline-block"
            >
              v{dataset.manifest.version}
            </span>
          )}

          <span
            title={statusTitle ?? undefined}
            className="flex items-center gap-2"
          >
            <StatusDot
              color={statusColor}
              pulsing={health.status === "loading" || isLoading}
            />
            <span className="text-zinc-400">{engineLabel}</span>
          </span>

          {!isLoading && fps > 0 && (
            <span
              title={`Render rate; target floor ${targetFps} fps; quality ${renderQuality.tier}`}
              className="hidden tabular-nums text-zinc-500 md:inline-block"
            >
              {fps} fps / {renderQuality.tier}
            </span>
          )}

          <button
            type="button"
            onClick={() => setAboutOpen(true)}
            className="rounded border border-[var(--border-default)] bg-white/[0.03] px-2.5 py-1 text-zinc-200 transition hover:border-[var(--border-strong)] hover:bg-white/[0.06]"
            aria-haspopup="dialog"
            aria-expanded={aboutOpen}
          >
            About research
          </button>

          <Link
            href="/map"
            className="rounded border border-[var(--border-default)] bg-white/[0.03] px-2.5 py-1 text-zinc-200 transition hover:border-[var(--border-strong)] hover:bg-white/[0.06]"
            title="Open research map"
          >
            Map
          </Link>

          <Link
            href="/release"
            className="hidden rounded border border-[var(--border-default)] bg-white/[0.03] px-2.5 py-1 text-zinc-200 transition hover:border-[var(--border-strong)] hover:bg-white/[0.06] lg:inline-block"
            title="Open release dashboard"
          >
            Release
          </Link>

          <Link
            href="/research"
            className="hidden text-zinc-500 transition hover:text-zinc-200 md:inline-block"
            title="Open full research page"
          >
            ↗
          </Link>
        </div>
      </header>

      <Modal
        open={aboutOpen}
        onClose={() => setAboutOpen(false)}
        title="About this research"
        widthClass="max-w-3xl"
      >
        <AboutResearchContent embed />
      </Modal>
    </>
  );
}
