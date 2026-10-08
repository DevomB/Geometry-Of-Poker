"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useViewerStore } from "@/stores/viewer-store";
import { COLOR_MODES, CATEGORY_PALETTE, CLUSTER_PALETTE } from "@/lib/types";
import type { ColorMode, StreetDataset } from "@/lib/types";
import { CardPickerPanel } from "@/features/card-picker/CardPickerPanel";
import { humanCategory } from "@/lib/poker/human-category";
import { COLOR_MODE_META, rgbCss } from "@/lib/visualization-theme";
import {
  computeStreetAtlas,
  formatAtlasValue,
  type AtlasSlice,
} from "@/lib/atlas/street-atlas";
import {
  IconCards,
  IconChart,
  IconFilter,
  IconPalette,
  IconSidebar,
} from "@/components/ui/Icons";

type DockTab = "view" | "filter" | "hand" | "data";

const TABS: { id: DockTab; label: string; icon: ReactNode }[] = [
  { id: "view", label: "View", icon: <IconPalette size={18} /> },
  { id: "filter", label: "Filter", icon: <IconFilter size={18} /> },
  { id: "hand", label: "Project", icon: <IconCards size={18} /> },
  { id: "data", label: "Atlas", icon: <IconChart size={18} /> },
];

const TAB_TITLE: Record<DockTab, { title: string; subtitle: string }> = {
  view: { title: "Appearance", subtitle: "How states are coloured and drawn" },
  filter: { title: "Filters", subtitle: "Narrow the manifold to a slice" },
  hand: { title: "Project a hand", subtitle: "Place your own cards on the map" },
  data: { title: "Street atlas", subtitle: "Distribution and embedding quality" },
};

function useFiltersActiveCount() {
  const filters = useViewerStore((s) => s.filters);
  let n = 0;
  if (filters.equityMin > 0 || filters.equityMax < 1) n++;
  if (filters.categories.length > 0) n++;
  if (filters.clusters.length > 0) n++;
  if (filters.boardRainbow !== null) n++;
  if (filters.boardTwoTone !== null) n++;
  if (filters.boardMonotone !== null) n++;
  if (filters.searchNeighborOf !== null) n++;
  return n;
}

export function ControlPanel() {
  const [tab, setTab] = useState<DockTab>("view");
  const [open, setOpen] = useState(true);
  const activeFilters = useFiltersActiveCount();
  const manualMarker = useViewerStore((s) => s.manualMarker);

  const selectTab = (next: DockTab) => {
    if (next === tab) {
      setOpen((o) => !o);
      return;
    }
    setTab(next);
    setOpen(true);
  };

  return (
    <div className="pointer-events-none absolute bottom-3 left-3 top-[76px] z-20 flex items-start gap-2">
      <nav
        aria-label="Control panels"
        className="gop-float gop-slide-in-left pointer-events-auto flex h-fit flex-col items-center gap-1 p-1.5"
      >
        {TABS.map((t) => {
          const active = open && tab === t.id;
          const badge =
            t.id === "filter" && activeFilters > 0
              ? activeFilters
              : t.id === "hand" && manualMarker
                ? "•"
                : null;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => selectTab(t.id)}
              aria-pressed={active}
              title={t.label}
              className={`relative flex w-14 flex-col items-center gap-1 rounded-[10px] py-2 text-[10.5px] font-medium transition ${
                active
                  ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "text-[var(--text-tertiary)] hover:bg-white/[0.06] hover:text-[var(--text-primary)]"
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
              {badge !== null && (
                <span className="gop-mono absolute right-1.5 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[9.5px] font-semibold text-[#032a25]">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
        <span className="my-1 h-px w-8 bg-[var(--border-default)]" aria-hidden="true" />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          title={open ? "Collapse panel" : "Expand panel"}
          aria-label={open ? "Collapse panel" : "Expand panel"}
          className="flex h-9 w-14 items-center justify-center rounded-[10px] text-[var(--text-tertiary)] transition hover:bg-white/[0.06] hover:text-[var(--text-primary)]"
        >
          <IconSidebar size={17} />
        </button>
      </nav>

      {open && (
        <aside
          aria-label={TAB_TITLE[tab].title}
          className="gop-float gop-slide-in-left pointer-events-auto flex max-h-full w-[340px] flex-col overflow-hidden"
        >
          <header className="border-b border-[var(--border-subtle)] px-5 pb-3.5 pt-4">
            <h2 className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)]">
              {TAB_TITLE[tab].title}
            </h2>
            <p className="mt-0.5 text-[12px] text-[var(--text-tertiary)]">
              {TAB_TITLE[tab].subtitle}
            </p>
          </header>
          <div key={tab} className="gop-fade-in min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {tab === "view" && <ViewTab />}
            {tab === "filter" && <FilterTab />}
            {tab === "hand" && <CardPickerPanel />}
            {tab === "data" && <AtlasTab />}
          </div>
        </aside>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* View                                                               */
/* ------------------------------------------------------------------ */

function ViewTab() {
  const colorMode = useViewerStore((s) => s.colorMode);
  const setColorMode = useViewerStore((s) => s.setColorMode);
  const dataset = useViewerStore((s) => s.dataset);
  const showNnLinks = useViewerStore((s) => s.showNnLinks);
  const showClusterLabels = useViewerStore((s) => s.showClusterLabels);
  const toggleNnLinks = useViewerStore((s) => s.toggleNnLinks);
  const toggleClusterLabels = useViewerStore((s) => s.toggleClusterLabels);
  const lodSampleRate = useViewerStore((s) => s.lodSampleRate);
  const setLodSampleRate = useViewerStore((s) => s.setLodSampleRate);
  const fps = useViewerStore((s) => s.fps);
  const targetFps = useViewerStore((s) => s.targetFps);
  const renderQuality = useViewerStore((s) => s.renderQuality);
  const meta = COLOR_MODE_META[colorMode];

  return (
    <div className="space-y-6">
      <Group label="Colour by">
        <div role="radiogroup" aria-label="Color mode" className="grid grid-cols-2 gap-2">
          {COLOR_MODES.map((mode) => (
            <ColorModeTile
              key={mode.id}
              mode={mode.id}
              label={mode.label}
              active={mode.id === colorMode}
              onSelect={() => setColorMode(mode.id)}
            />
          ))}
        </div>
        <div className="gop-card mt-3 p-3.5">
          <p className="text-[12.5px] leading-relaxed text-[var(--text-secondary)]">
            {meta.description}
          </p>
          <LegendBody mode={colorMode} dataset={dataset} />
        </div>
      </Group>

      <Group label="Layers">
        <div className="gop-card divide-y divide-[var(--border-subtle)]">
          <Switch
            label="Nearest-neighbour links"
            hint="Draw edges to embedding neighbours"
            shortcut="L"
            checked={showNnLinks}
            onChange={toggleNnLinks}
          />
          <Switch
            label="Cluster labels"
            hint="Show HDBSCAN centroid tags"
            shortcut="C"
            checked={showClusterLabels}
            onChange={toggleClusterLabels}
          />
        </div>
      </Group>

      <Group
        label="Point density"
        trailing={
          <span className="gop-mono text-[12px] tabular-nums text-[var(--text-secondary)]">
            {Math.round(lodSampleRate * 100)}%
          </span>
        }
      >
        <input
          type="range"
          min={10}
          max={100}
          value={Math.round(lodSampleRate * 100)}
          onChange={(e) => setLodSampleRate(Number(e.target.value) / 100)}
          aria-label="Point density"
          className="gop-range"
          style={{ ["--gop-fill" as string]: `${((lodSampleRate * 100 - 10) / 90) * 100}%` }}
        />
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Stat label="Target" value={`${targetFps}+ fps`} />
          <Stat label="Measured" value={fps > 0 ? `${fps} fps` : "—"} />
          <Stat label="Quality" value={QUALITY_LABEL[renderQuality.tier]} />
        </div>
        <p className="mt-2 text-[11.5px] leading-relaxed text-[var(--text-tertiary)]">
          Density adapts automatically to hold the frame-rate floor.
        </p>
      </Group>
    </div>
  );
}

function ColorModeTile({
  mode,
  label,
  active,
  onSelect,
}: {
  mode: ColorMode;
  label: string;
  active: boolean;
  onSelect: () => void;
}) {
  const meta = COLOR_MODE_META[mode];
  const preview =
    meta.legendKind === "continuous" || meta.legendKind === "diverging"
      ? `linear-gradient(90deg, ${meta.legend.stops.join(", ")})`
      : meta.legendKind === "categorical"
        ? `linear-gradient(90deg, ${Object.values(CATEGORY_PALETTE)
            .slice(0, 6)
            .map((rgb, i, arr) => `${rgbCss(rgb)} ${(i / arr.length) * 100}% ${((i + 1) / arr.length) * 100}%`)
            .join(", ")})`
        : `linear-gradient(90deg, ${CLUSTER_PALETTE.slice(0, 6)
            .map((rgb, i, arr) => `${rgbCss(rgb)} ${(i / arr.length) * 100}% ${((i + 1) / arr.length) * 100}%`)
            .join(", ")})`;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onSelect}
      className={`rounded-[12px] border p-2.5 text-left transition ${
        active
          ? "border-[var(--accent-ring)] bg-[var(--accent-soft)]"
          : "border-[var(--border-subtle)] bg-white/[0.02] hover:border-[var(--border-strong)] hover:bg-white/[0.04]"
      }`}
    >
      <span className="block h-1.5 w-full rounded-full" style={{ background: preview }} aria-hidden="true" />
      <span
        className={`mt-2 block truncate text-[12.5px] font-medium ${
          active ? "text-[#ccfbf1]" : "text-[var(--text-secondary)]"
        }`}
      >
        {label}
      </span>
    </button>
  );
}

function LegendBody({ mode, dataset }: { mode: ColorMode; dataset: StreetDataset | null }) {
  const meta = COLOR_MODE_META[mode];
  if (meta.legendKind === "continuous" || meta.legendKind === "diverging") {
    return (
      <div className="mt-3">
        <div
          className="h-2.5 w-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${meta.legend.stops.join(", ")})` }}
          aria-hidden="true"
        />
        <div className="gop-mono mt-1.5 flex justify-between text-[11px] text-[var(--text-tertiary)]">
          <span>{meta.legend.labels[0]}</span>
          <span>{meta.legend.labels[1]}</span>
        </div>
      </div>
    );
  }
  if (meta.legendKind === "categorical") {
    const present = new Set(dataset?.manifest.categories ?? []);
    const entries = Object.entries(CATEGORY_PALETTE).filter(([name]) =>
      present.size === 0 ? true : present.has(name),
    );
    return (
      <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
        {entries.map(([name, rgb]) => (
          <li key={name} className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: rgbCss(rgb) }} aria-hidden="true" />
            <span className="truncate">{humanCategory(name)}</span>
          </li>
        ))}
      </ul>
    );
  }
  const clusters = dataset?.manifest.clusters ?? [];
  if (clusters.length === 0) {
    return (
      <p className="mt-3 text-[12px] text-[var(--text-tertiary)]">
        No HDBSCAN clusters available for this street.
      </p>
    );
  }
  return (
    <ul className="mt-3 grid grid-cols-3 gap-x-3 gap-y-1.5">
      {clusters.map((c) => (
        <li key={c.id} className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: rgbCss(CLUSTER_PALETTE[c.id % CLUSTER_PALETTE.length]!) }}
            aria-hidden="true"
          />
          <span className="gop-mono">C{c.id}</span>
        </li>
      ))}
      <li className="flex items-center gap-2 text-[12px] text-[var(--text-tertiary)]">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[rgb(64,64,72)]" aria-hidden="true" />
        noise
      </li>
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Filter                                                             */
/* ------------------------------------------------------------------ */

function FilterTab() {
  const filters = useViewerStore((s) => s.filters);
  const setFilters = useViewerStore((s) => s.setFilters);
  const resetFilters = useViewerStore((s) => s.resetFilters);
  const dataset = useViewerStore((s) => s.dataset);
  useViewerStore((s) => s.visualizationRevision);
  const activeCount = useFiltersActiveCount();

  const categories = dataset?.manifest.categories ?? [];
  const clusters = dataset?.manifest.clusters ?? [];
  let visibleCount = 0;
  if (dataset) {
    for (let i = 0; i < dataset.visible.length; i++) {
      if (dataset.visible[i]) visibleCount++;
    }
  }
  const share = dataset && dataset.count > 0 ? visibleCount / dataset.count : 0;

  const toggleCategory = (category: string) =>
    setFilters({
      categories: filters.categories.includes(category)
        ? filters.categories.filter((c) => c !== category)
        : [...filters.categories, category],
    });

  const toggleCluster = (cluster: number) =>
    setFilters({
      clusters: filters.clusters.includes(cluster)
        ? filters.clusters.filter((c) => c !== cluster)
        : [...filters.clusters, cluster],
    });

  const minPct = Math.round(filters.equityMin * 100);
  const maxPct = Math.round(filters.equityMax * 100);

  return (
    <div className="space-y-6">
      {dataset && (
        <div className="gop-card p-3.5">
          <div className="flex items-baseline justify-between">
            <span className="text-[12px] text-[var(--text-tertiary)]">Visible states</span>
            <span className="gop-mono text-[13px] tabular-nums text-[var(--text-primary)]">
              {visibleCount.toLocaleString()}
              <span className="text-[var(--text-tertiary)]"> / {dataset.count.toLocaleString()}</span>
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300"
              style={{ width: `${share * 100}%` }}
            />
          </div>
          {filters.searchNeighborOf && (
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-3 text-[12px]">
              <span className="text-[var(--text-secondary)]">Focused on 25 nearest neighbours</span>
              <button
                type="button"
                onClick={() => setFilters({ searchNeighborOf: null })}
                className="font-medium text-[var(--accent)] hover:underline"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}

      <Group
        label="Equity vs random"
        trailing={
          <span className="gop-mono text-[12px] tabular-nums text-[var(--text-secondary)]">
            {minPct}% – {maxPct}%
          </span>
        }
      >
        <div className="relative">
          <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/[0.1]" aria-hidden="true" />
          <div
            className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full"
            style={{
              left: `${minPct}%`,
              right: `${100 - maxPct}%`,
              background: `linear-gradient(90deg, ${COLOR_MODE_META.equity.legend.stops.join(", ")})`,
            }}
            aria-hidden="true"
          />
          <div className="gop-dual-range">
            <input
              type="range"
              min={0}
              max={100}
              value={minPct}
              onChange={(e) =>
                setFilters({ equityMin: Math.min(Number(e.target.value) / 100, filters.equityMax) })
              }
              aria-label="Minimum equity"
            />
            <input
              type="range"
              min={0}
              max={100}
              value={maxPct}
              onChange={(e) =>
                setFilters({ equityMax: Math.max(Number(e.target.value) / 100, filters.equityMin) })
              }
              aria-label="Maximum equity"
            />
          </div>
        </div>
      </Group>

      {categories.length > 0 && (
        <Group
          label="Hand category"
          trailing={
            filters.categories.length > 0 ? (
              <ClearButton onClick={() => setFilters({ categories: [] })} />
            ) : null
          }
        >
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                className="gop-chip"
                aria-pressed={filters.categories.includes(c)}
                onClick={() => toggleCategory(c)}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: rgbCss(CATEGORY_PALETTE[c] ?? [0.5, 0.5, 0.5]) }}
                  aria-hidden="true"
                />
                {humanCategory(c)}
              </button>
            ))}
          </div>
        </Group>
      )}

      {clusters.length > 0 && (
        <Group
          label="Cluster"
          trailing={
            filters.clusters.length > 0 ? (
              <ClearButton onClick={() => setFilters({ clusters: [] })} />
            ) : null
          }
        >
          <div className="flex flex-wrap gap-1.5">
            {clusters.slice(0, 24).map((c) => (
              <button
                key={c.id}
                type="button"
                className="gop-chip gop-mono"
                aria-pressed={filters.clusters.includes(c.id)}
                onClick={() => toggleCluster(c.id)}
                title={`${c.size.toLocaleString()} states`}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: rgbCss(CLUSTER_PALETTE[c.id % CLUSTER_PALETTE.length]!) }}
                  aria-hidden="true"
                />
                C{c.id}
              </button>
            ))}
            <button
              type="button"
              className="gop-chip"
              aria-pressed={filters.clusters.includes(-1)}
              onClick={() => toggleCluster(-1)}
            >
              <span className="h-2 w-2 rounded-full bg-[rgb(64,64,72)]" aria-hidden="true" />
              noise
            </button>
          </div>
          {clusters.length > 24 && (
            <p className="mt-2 text-[11.5px] text-[var(--text-tertiary)]">
              Showing the first 24 manifest clusters.
            </p>
          )}
        </Group>
      )}

      <Group label="Board texture">
        <div className="gop-card divide-y divide-[var(--border-subtle)]">
          <Switch
            label="Rainbow"
            hint="Every board card a different suit"
            checked={filters.boardRainbow === true}
            onChange={() => setFilters({ boardRainbow: filters.boardRainbow ? null : true })}
          />
          <Switch
            label="Two-tone"
            hint="At most two cards share a suit"
            checked={filters.boardTwoTone === true}
            onChange={() => setFilters({ boardTwoTone: filters.boardTwoTone ? null : true })}
          />
          <Switch
            label="Monotone"
            hint="All board cards one suit"
            checked={filters.boardMonotone === true}
            onChange={() => setFilters({ boardMonotone: filters.boardMonotone ? null : true })}
          />
        </div>
      </Group>

      <button
        type="button"
        onClick={resetFilters}
        disabled={activeCount === 0}
        className="gop-btn w-full"
      >
        Reset all filters
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Atlas                                                              */
/* ------------------------------------------------------------------ */

function AtlasTab() {
  const dataset = useViewerStore((s) => s.dataset);
  const filters = useViewerStore((s) => s.filters);
  const setFilters = useViewerStore((s) => s.setFilters);
  const atlas = useMemo(
    () => (dataset && dataset.metadata.length > 0 ? computeStreetAtlas(dataset) : null),
    [dataset],
  );

  if (!dataset) {
    return <p className="text-[13px] text-[var(--text-tertiary)]">Waiting for the street to load…</p>;
  }
  const m = dataset.manifest;

  return (
    <div className="space-y-6">
      <Group label="Embedding">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Points" value={dataset.count.toLocaleString()} large />
          <Stat
            label="Feature dims"
            value={`${m.retainedDimension ?? m.retainedFeatures.length}/${m.originalDimension ?? "?"}`}
            large
            title="Retained dimensions after preprocessing compared with original feature dimensions"
          />
          {m.trustworthiness != null && (
            <Stat
              label="Trustworthiness"
              value={formatUnitInterval(m.trustworthiness)}
              large
              title="How often embedding neighbours remain neighbours in source feature space"
            />
          )}
          {m.knnOverlap != null && (
            <Stat
              label="kNN overlap"
              value={formatUnitInterval(m.knnOverlap)}
              large
              title="Shared-neighbour overlap between feature space and 3D embedding"
            />
          )}
          {m.pcaDimensions != null && <Stat label="PCA dims" value={String(m.pcaDimensions)} />}
          {m.pcaVariance != null && <Stat label="PCA variance" value={formatUnitInterval(m.pcaVariance)} />}
          {m.hdbscan && <Stat label="Clusters" value={String(m.hdbscan.clusters ?? "—")} />}
          {m.hdbscan?.noiseFraction != null && (
            <Stat label="Noise" value={formatUnitInterval(m.hdbscan.noiseFraction)} />
          )}
        </div>
        <p className="gop-mono mt-3 text-[11px] leading-relaxed text-[var(--text-tertiary)]">
          {m.embeddingMethod || "unknown pipeline"}
        </p>
      </Group>

      {atlas && (
        <>
          <Group label="Distribution">
            <div className="space-y-3">
              {atlas.metrics.map((metric) => (
                <QuantileBar key={metric.id} metric={metric} />
              ))}
            </div>
          </Group>

          <AtlasSliceList
            title="Top categories"
            slices={atlas.categories.slice(0, 6)}
            activeIds={filters.categories}
            onSelect={(id) => setFilters({ categories: [id] })}
            onClear={() => setFilters({ categories: [] })}
          />

          <AtlasSliceList
            title="Largest clusters"
            slices={atlas.clusters.slice(0, 6)}
            activeIds={filters.clusters.map(String)}
            onSelect={(id) => setFilters({ clusters: [Number(id)] })}
            onClear={() => setFilters({ clusters: [] })}
          />
        </>
      )}
    </div>
  );
}

function QuantileBar({
  metric,
}: {
  metric: ReturnType<typeof computeStreetAtlas>["metrics"][number];
}) {
  const span = metric.max - metric.min;
  const pos = (v: number) => (span > 0 ? ((v - metric.min) / span) * 100 : 50);
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-[12px]">
        <span className="text-[var(--text-secondary)]">{metric.label}</span>
        <span className="gop-mono tabular-nums text-[var(--text-primary)]">
          {formatAtlasValue(metric.median, metric.format)}
          <span className="text-[var(--text-tertiary)]"> median</span>
        </span>
      </div>
      <div className="relative h-2 rounded-full bg-white/[0.06]" aria-hidden="true">
        <div
          className="absolute inset-y-0 rounded-full bg-[var(--accent)]/40"
          style={{ left: `${pos(metric.q25)}%`, right: `${100 - pos(metric.q75)}%` }}
        />
        <div
          className="absolute -top-0.5 h-3 w-0.5 rounded-full bg-[var(--accent)]"
          style={{ left: `calc(${pos(metric.median)}% - 1px)` }}
        />
      </div>
      <div className="gop-mono mt-1 flex justify-between text-[10.5px] tabular-nums text-[var(--text-tertiary)]">
        <span>{formatAtlasValue(metric.min, metric.format)}</span>
        <span>
          IQR {formatAtlasValue(metric.q25, metric.format)}–{formatAtlasValue(metric.q75, metric.format)}
        </span>
        <span>{formatAtlasValue(metric.max, metric.format)}</span>
      </div>
    </div>
  );
}

function AtlasSliceList({
  title,
  slices,
  activeIds,
  onSelect,
  onClear,
}: {
  title: string;
  slices: AtlasSlice[];
  activeIds: string[];
  onSelect: (id: string) => void;
  onClear: () => void;
}) {
  return (
    <Group
      label={title}
      trailing={activeIds.length > 0 ? <ClearButton onClick={onClear} /> : null}
    >
      <div className="space-y-1">
        {slices.map((slice) => {
          const active = activeIds.includes(slice.id);
          return (
            <button
              key={slice.id}
              type="button"
              onClick={() => onSelect(slice.id)}
              className={`w-full rounded-[10px] px-2.5 py-2 text-left transition ${
                active ? "bg-[var(--accent-soft)]" : "hover:bg-white/[0.04]"
              }`}
              title={`${slice.count.toLocaleString()} states · click to filter`}
            >
              <div className="flex items-center justify-between gap-2 text-[12.5px]">
                <span className={`truncate ${active ? "text-[#ccfbf1]" : "text-[var(--text-secondary)]"}`}>
                  {slice.label}
                </span>
                <span className="gop-mono tabular-nums text-[var(--text-tertiary)]">
                  {(slice.share * 100).toFixed(1)}%
                </span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-[var(--accent)]/70"
                  style={{ width: `${Math.max(2, slice.share * 100)}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </Group>
  );
}

/* ------------------------------------------------------------------ */
/* Primitives                                                         */
/* ------------------------------------------------------------------ */

function Group({
  label,
  trailing,
  children,
}: {
  label: string;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="gop-eyebrow">{label}</h3>
        {trailing}
      </div>
      {children}
    </section>
  );
}

function ClearButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[12px] font-medium text-[var(--accent)] hover:underline"
    >
      Clear
    </button>
  );
}

function Switch({
  label,
  hint,
  shortcut,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  shortcut?: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 px-3.5 py-3">
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-[13px] text-[var(--text-primary)]">
          {label}
          {shortcut && <kbd className="gop-kbd">{shortcut}</kbd>}
        </span>
        {hint && <span className="block text-[11.5px] text-[var(--text-tertiary)]">{hint}</span>}
      </span>
      <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
      <span
        aria-hidden="true"
        className={`relative h-5 w-9 shrink-0 rounded-full transition peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--accent-ring)] ${
          checked ? "bg-[var(--accent-strong)]" : "bg-white/[0.12]"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
            checked ? "left-[18px]" : "left-0.5"
          }`}
        />
      </span>
    </label>
  );
}

function Stat({
  label,
  value,
  large,
  title,
}: {
  label: string;
  value: string;
  large?: boolean;
  title?: string;
}) {
  return (
    <div className="gop-card px-3 py-2.5" title={title}>
      <p className="truncate text-[11px] text-[var(--text-tertiary)]">{label}</p>
      <p
        className={`gop-mono mt-0.5 truncate tabular-nums text-[var(--text-primary)] ${
          large ? "text-[15px]" : "text-[13px]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

const QUALITY_LABEL = { high: "High", balanced: "Balanced", performance: "Reduced" } as const;

function formatUnitInterval(value: number) {
  const clamped = Math.max(0, Math.min(1, value));
  return `${(clamped * 100).toFixed(1)}%`;
}
