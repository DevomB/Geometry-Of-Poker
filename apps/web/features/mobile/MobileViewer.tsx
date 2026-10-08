"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useViewerStore } from "@/stores/viewer-store";
import { SceneShell } from "@/features/scene/SceneShell";
import { resetCameraView } from "@/features/scene/camera-actions";
import {
  AtlasTab,
  FilterTab,
  TAB_TITLE,
  ViewTab,
  useFiltersActiveCount,
  type DockTab,
} from "@/features/controls/ControlPanel";
import { CardPickerPanel } from "@/features/card-picker/CardPickerPanel";
import {
  InspectorActions,
  InspectorBody,
  useInspectorSubtitle,
} from "@/features/inspector/InspectorPanel";
import { BrandMark, NAV_LINKS, StreetSwitcher } from "@/components/TopNav";
import { Modal } from "@/components/Modal";
import { AboutResearchContent } from "@/components/research/AboutResearchContent";
import { PlayingCard } from "@/components/ui/PlayingCard";
import {
  IconCards,
  IconChart,
  IconClose,
  IconFilter,
  IconLink,
  IconPalette,
  IconReset,
  IconTag,
  IconTarget,
} from "@/components/ui/Icons";
import { humanCategory } from "@/lib/poker/human-category";

type MobileTab = DockTab | "inspect";

const MOBILE_TABS: { id: MobileTab; label: string; icon: ReactNode }[] = [
  { id: "view", label: "View", icon: <IconPalette size={20} /> },
  { id: "filter", label: "Filter", icon: <IconFilter size={20} /> },
  { id: "hand", label: "Project", icon: <IconCards size={20} /> },
  { id: "data", label: "Atlas", icon: <IconChart size={20} /> },
  { id: "inspect", label: "Inspect", icon: <IconTarget size={20} /> },
];

/** Phone layout: full-bleed manifold, bottom tab bar, and sliding sheets. */
export function MobileViewer() {
  const [tab, setTab] = useState<MobileTab | null>(null);
  const manualMarkerId = useViewerStore((s) => s.manualMarker?.id ?? null);
  const lastMarkerId = useRef<string | null>(null);

  // After projecting a hand, close the sheet so the camera flight is visible.
  useEffect(() => {
    if (manualMarkerId && manualMarkerId !== lastMarkerId.current) setTab(null);
    lastMarkerId.current = manualMarkerId;
  }, [manualMarkerId]);

  const toggle = (next: MobileTab) => setTab((current) => (current === next ? null : next));

  return (
    <>
      <SceneShell />
      <MobileTopBar />
      <div className="pointer-events-auto absolute inset-x-2 top-[64px] z-20">
        <StreetSwitcher compact />
      </div>
      <LowMemoryNotice />
      {tab === null && <MobileTools />}
      {tab === null && <SelectionPeek onOpen={() => setTab("inspect")} />}
      {tab !== null && <MobileSheet tab={tab} onClose={() => setTab(null)} />}
      <MobileTabBar active={tab} onSelect={toggle} />
    </>
  );
}

function MobileTopBar() {
  const dataset = useViewerStore((s) => s.dataset);
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <>
      <header className="gop-float pointer-events-auto absolute inset-x-2 top-2 z-20 flex h-12 items-center gap-2.5 px-2.5">
        <BrandMark />
        <div className="min-w-0 flex-1 leading-tight">
          <h1 className="truncate text-[14px] font-semibold tracking-tight text-[var(--text-primary)]">
            Geometry of Poker
          </h1>
          <p className="truncate text-[11px] text-[var(--text-tertiary)]">
            {dataset ? (
              <>
                <span className="gop-mono tabular-nums">{dataset.count.toLocaleString()}</span>{" "}
                states
              </>
            ) : (
              "Hold'em state-space manifold"
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          className="gop-btn h-9 px-3"
        >
          Menu
        </button>
      </header>
      <Modal open={menuOpen} onClose={() => setMenuOpen(false)} title="Geometry of Poker">
        <nav aria-label="Pages" className="mb-6 grid grid-cols-2 gap-2">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="gop-btn h-11 justify-start px-4">
              {link.label}
            </Link>
          ))}
        </nav>
        <AboutResearchContent embed />
      </Modal>
    </>
  );
}

function MobileTabBar({
  active,
  onSelect,
}: {
  active: MobileTab | null;
  onSelect: (tab: MobileTab) => void;
}) {
  const activeFilters = useFiltersActiveCount();
  const hasInspection = useViewerStore((s) => s.selection !== null || s.manualMarker !== null);
  return (
    <nav
      aria-label="Viewer panels"
      className="gop-float pointer-events-auto absolute inset-x-2 bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-30 flex p-1"
    >
      {MOBILE_TABS.map((t) => {
        const isActive = active === t.id;
        const badge =
          t.id === "filter" && activeFilters > 0
            ? String(activeFilters)
            : t.id === "inspect" && hasInspection
              ? "•"
              : null;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t.id)}
            aria-pressed={isActive}
            className={`relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-[10px] text-[10.5px] font-medium transition ${
              isActive
                ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                : "text-[var(--text-tertiary)] active:bg-white/[0.06]"
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
            {badge && (
              <span className="gop-mono absolute right-[calc(50%-20px)] top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[9.5px] font-semibold text-[#032a25]">
                {badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

const INSPECT_TITLE = { title: "Inspector", subtitle: "" };

function MobileSheet({ tab, onClose }: { tab: MobileTab; onClose: () => void }) {
  const inspectSubtitle = useInspectorSubtitle();
  const meta = tab === "inspect" ? { ...INSPECT_TITLE, subtitle: inspectSubtitle } : TAB_TITLE[tab];

  return (
    <section
      aria-label={meta.title}
      className="gop-float gop-slide-in-up pointer-events-auto absolute inset-x-2 bottom-[calc(max(0.5rem,env(safe-area-inset-bottom))+68px)] z-30 flex max-h-[calc(100dvh-196px)] flex-col overflow-hidden"
    >
      <header className="flex items-center gap-2 border-b border-[var(--border-subtle)] py-3 pl-5 pr-2">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15px] font-semibold tracking-tight text-[var(--text-primary)]">
            {meta.title}
          </h2>
          <p className="truncate text-[12px] text-[var(--text-tertiary)]">{meta.subtitle}</p>
        </div>
        {tab === "inspect" && <InspectorActions showShortcut={false} />}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)] active:bg-white/[0.08]"
        >
          <IconClose size={18} />
        </button>
      </header>
      <div key={tab} className="gop-fade-in min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4">
        {tab === "view" && <ViewTab />}
        {tab === "filter" && <FilterTab />}
        {tab === "hand" && <CardPickerPanel />}
        {tab === "data" && <AtlasTab />}
        {tab === "inspect" && <InspectorBody showShortcuts={false} />}
      </div>
    </section>
  );
}

/** Floating camera / layer buttons on the right edge. */
function MobileTools() {
  const showNnLinks = useViewerStore((s) => s.showNnLinks);
  const showClusterLabels = useViewerStore((s) => s.showClusterLabels);
  const toggleNnLinks = useViewerStore((s) => s.toggleNnLinks);
  const toggleClusterLabels = useViewerStore((s) => s.toggleClusterLabels);
  const tools = [
    { label: "Reset camera", icon: <IconReset size={18} />, onClick: resetCameraView, active: false },
    { label: "Neighbour links", icon: <IconLink size={18} />, onClick: toggleNnLinks, active: showNnLinks },
    { label: "Cluster labels", icon: <IconTag size={18} />, onClick: toggleClusterLabels, active: showClusterLabels },
  ];
  return (
    <div className="gop-float pointer-events-auto absolute right-2 top-[116px] z-20 flex flex-col gap-1 p-1">
      {tools.map((tool) => (
        <button
          key={tool.label}
          type="button"
          onClick={tool.onClick}
          aria-label={tool.label}
          aria-pressed={tool.label === "Reset camera" ? undefined : tool.active}
          className={`flex h-10 w-10 items-center justify-center rounded-[10px] transition ${
            tool.active
              ? "bg-[var(--accent-soft)] text-[var(--accent)]"
              : "text-[var(--text-secondary)] active:bg-white/[0.08]"
          }`}
        >
          {tool.icon}
        </button>
      ))}
    </div>
  );
}

/** Compact summary of the locked point or projected hand, above the tab bar. */
function SelectionPeek({ onOpen }: { onOpen: () => void }) {
  const dataset = useViewerStore((s) => s.dataset);
  const selection = useViewerStore((s) => s.selection);
  const marker = useViewerStore((s) => s.manualMarker);
  const clearSelection = useViewerStore((s) => s.clearSelection);
  const setManualMarker = useViewerStore((s) => s.setManualMarker);

  const point = selection && dataset ? dataset.metadata[selection.index] : null;
  let summary: { hero: string[]; board: string[]; category: string | null; equity: number | null; tag: string } | null =
    null;
  if (point) {
    summary = {
      hero: point.hero,
      board: point.board,
      category: point.category,
      equity: point.equityVsRandom,
      tag: point.clusterId >= 0 ? `C${point.clusterId}` : "noise",
    };
  } else if (marker) {
    const equity = marker.features.equityVsRandom;
    const category = marker.features.category;
    summary = {
      hero: marker.hero,
      board: marker.board,
      category: typeof category === "string" ? category : null,
      equity: typeof equity === "number" ? equity : null,
      tag: "Your hand",
    };
  }
  if (!summary) return null;

  const dismiss = () => (point ? clearSelection() : setManualMarker(null));

  return (
    <div
      className={`gop-float gop-slide-in-up pointer-events-auto absolute inset-x-2 bottom-[calc(max(0.5rem,env(safe-area-inset-bottom))+68px)] z-20 flex items-center gap-3 p-3 ${
        point ? "" : "!border-amber-200/30"
      }`}
    >
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <span className="flex shrink-0 items-center">
          {summary.hero.map((c, i) => (
            <span key={c} className={i > 0 ? "-ml-2" : ""}>
              <PlayingCard card={c} size="sm" />
            </span>
          ))}
          {summary.board.map((c, i) => (
            <span key={c} className={i === 0 ? "ml-2" : "-ml-1.5"}>
              <PlayingCard card={c} size="xs" />
            </span>
          ))}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-semibold text-[var(--text-primary)]">
            {summary.category ? humanCategory(summary.category) : "Projected hand"}
          </span>
          <span className="mt-0.5 flex items-center gap-2 text-[11.5px] text-[var(--text-tertiary)]">
            <span className={point ? "gop-mono" : "text-amber-200/90"}>{summary.tag}</span>
            <span className="text-[var(--accent)]">Details ›</span>
          </span>
        </span>
        {summary.equity !== null && (
          <span className="gop-mono shrink-0 text-[18px] font-semibold tabular-nums text-[var(--text-primary)]">
            {(Math.max(0, Math.min(1, summary.equity)) * 100).toFixed(1)}
            <span className="text-[12px] text-[var(--text-tertiary)]">%</span>
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label={point ? "Deselect" : "Clear projection"}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--text-tertiary)] active:bg-white/[0.08]"
      >
        <IconClose size={16} />
      </button>
    </div>
  );
}

function LowMemoryNotice() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    setVisible(typeof memory === "number" && memory < 4);
  }, []);
  if (!visible) return null;
  return (
    <div
      role="status"
      className="gop-float pointer-events-auto absolute inset-x-2 top-[116px] z-30 flex items-start gap-3 p-3 text-[12.5px] leading-relaxed text-[var(--text-secondary)]"
    >
      <p className="flex-1">
        Your device reports limited memory. The viewer lowers point density automatically, but
        large streets may still be slow.
      </p>
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Dismiss"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full active:bg-white/[0.08]"
      >
        <IconClose size={14} />
      </button>
    </div>
  );
}
