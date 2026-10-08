"use client";

import { useState } from "react";
import Link from "next/link";
import { useViewerStore } from "@/stores/viewer-store";
import { useHealth } from "@/lib/hooks/use-health";
import { Modal } from "@/components/Modal";
import { AboutResearchContent } from "@/components/research/AboutResearchContent";
import { STATUS } from "@/lib/visualization-theme";
import { STREETS, type Street } from "@/lib/types";

const STREET_LABEL: Record<Street, string> = {
  preflop: "Preflop",
  flop: "Flop",
  turn: "Turn",
  river: "River",
};

const STREET_BOARD: Record<Street, number> = {
  preflop: 0,
  flop: 3,
  turn: 4,
  river: 5,
};

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
        style={{ background: color, boxShadow: `0 0 8px ${color}` }}
      />
    </span>
  );
}

function BrandMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
      <defs>
        <linearGradient id="gop-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5eead4" />
          <stop offset="1" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width="27" height="27" rx="8" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" />
      <path
        d="M7 18c2.5-6 5.5-9 7-9s3 3 7 9"
        fill="none"
        stroke="url(#gop-mark)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="7" cy="18" r="1.8" fill="#5eead4" />
      <circle cx="14" cy="9" r="1.8" fill="#9bd5f0" />
      <circle cx="21" cy="18" r="1.8" fill="#a78bfa" />
    </svg>
  );
}

/** Mini glyph showing how many board cards a street has. */
function BoardGlyph({ count, active }: { count: number; active: boolean }) {
  return (
    <span className="flex items-center gap-[2px]" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={`h-[9px] w-[6px] rounded-[1.5px] transition ${
            i < count
              ? active
                ? "bg-[var(--accent)]"
                : "bg-zinc-500"
              : "bg-white/[0.08]"
          }`}
        />
      ))}
    </span>
  );
}

export function StreetSwitcher() {
  const street = useViewerStore((s) => s.street);
  const setStreet = useViewerStore((s) => s.setStreet);
  return (
    <div role="radiogroup" aria-label="Street" className="gop-seg">
      {STREETS.map((s, i) => {
        const active = street === s;
        return (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => !active && setStreet(s)}
            title={`${STREET_LABEL[s]} · press ${i + 1}`}
            className="flex items-center gap-2"
          >
            <BoardGlyph count={STREET_BOARD[s]} active={active} />
            <span>{STREET_LABEL[s]}</span>
          </button>
        );
      })}
    </div>
  );
}

const NAV_LINKS = [
  { href: "/research", label: "Research" },
  { href: "/map", label: "Map" },
  { href: "/release", label: "Release" },
  { href: "/api-docs", label: "API" },
];

export function TopNav() {
  const fps = useViewerStore((s) => s.fps);
  const targetFps = useViewerStore((s) => s.targetFps);
  const renderQuality = useViewerStore((s) => s.renderQuality);
  const dataset = useViewerStore((s) => s.dataset);
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
      ? "Connecting"
      : health.status === "error"
        ? "Offline"
        : health.payload.status === "misconfigured"
          ? "Misconfigured"
          : health.payload.pokerCalculations.available
            ? "Engine ready"
            : "Degraded";
  const statusTitle =
    health.status === "ok"
      ? `Status: ${health.payload.status} · Artifacts: ${health.payload.artifactMode} · NAPI ${health.payload.pokerCalculations.napi}`
      : health.status === "error"
        ? health.error
        : "Probing /api/health…";

  return (
    <>
      <header className="gop-float pointer-events-auto absolute inset-x-3 top-3 z-20 flex h-14 items-center gap-4 px-3">
        <div className="flex min-w-0 items-center gap-3">
          <BrandMark />
          <div className="min-w-0 leading-tight">
            <h1 className="truncate text-[14px] font-semibold tracking-tight text-[var(--text-primary)]">
              Geometry of Poker
            </h1>
            <p className="truncate text-[11.5px] text-[var(--text-tertiary)]">
              {dataset ? (
                <>
                  <span className="gop-mono tabular-nums text-[var(--text-secondary)]">
                    {dataset.count.toLocaleString()}
                  </span>{" "}
                  states
                  {dataset.manifest.version && (
                    <span className="gop-mono"> · v{dataset.manifest.version}</span>
                  )}
                </>
              ) : (
                "Hold'em state-space manifold"
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-1 justify-center">
          <StreetSwitcher />
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <span
            title={statusTitle ?? undefined}
            className="mr-1 hidden items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-black/30 px-3 py-1.5 text-[11.5px] text-[var(--text-secondary)] lg:flex"
          >
            <StatusDot
              color={statusColor}
              pulsing={health.status === "loading" || isLoading}
            />
            <span>{engineLabel}</span>
            {!isLoading && fps > 0 && (
              <span
                className="gop-mono border-l border-[var(--border-subtle)] pl-2 tabular-nums text-[var(--text-tertiary)]"
                title={`Render rate; target floor ${targetFps} fps; quality ${renderQuality.tier}`}
              >
                {fps} fps
              </span>
            )}
          </span>

          <nav aria-label="Pages" className="hidden items-center xl:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="gop-btn gop-btn-ghost h-8 px-2.5 text-[12.5px]"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <button
            type="button"
            onClick={() => setAboutOpen(true)}
            className="gop-btn h-8"
            aria-haspopup="dialog"
            aria-expanded={aboutOpen}
            title="About this research"
          >
            About
          </button>
        </div>
      </header>

      <Modal
        open={aboutOpen}
        onClose={() => setAboutOpen(false)}
        title="About this research"
        widthClass="max-w-3xl"
      >
        <AboutResearchContent embed />
        <div className="mt-6 flex flex-wrap gap-2 border-t border-[var(--border-subtle)] pt-4 xl:hidden">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="gop-btn">
              {link.label}
            </Link>
          ))}
        </div>
      </Modal>
    </>
  );
}
