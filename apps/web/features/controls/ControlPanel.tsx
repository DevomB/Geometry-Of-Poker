"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useViewerStore } from "@/stores/viewer-store";
import { COLOR_MODES, STREETS } from "@/lib/types";
import type { Street } from "@geometry-of-poker/shared";
import { resetCameraView } from "@/features/scene/SceneShell";
import { CardPickerPanel } from "@/features/card-picker/CardPickerPanel";
import { ColorLegend } from "@/components/ColorLegend";
import {
  computeStreetAtlas,
  formatAtlasValue,
  type AtlasSlice,
} from "@/lib/atlas/street-atlas";

export function ControlPanel() {
  const street = useViewerStore((s) => s.street);
  const setStreet = useViewerStore((s) => s.setStreet);
  const colorMode = useViewerStore((s) => s.colorMode);
  const setColorMode = useViewerStore((s) => s.setColorMode);
  const filters = useViewerStore((s) => s.filters);
  const setFilters = useViewerStore((s) => s.setFilters);
  const resetFilters = useViewerStore((s) => s.resetFilters);
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
  const atlas = useMemo(
    () => (dataset && dataset.metadata.length > 0 ? computeStreetAtlas(dataset) : null),
    [dataset],
  );

  const categories = dataset?.manifest.categories ?? [];
  const clusters = dataset?.manifest.clusters ?? [];
  let visibleCount = 0;
  if (dataset) {
    for (let i = 0; i < dataset.visible.length; i++) {
      if (dataset.visible[i]) visibleCount++;
    }
  }
  const filtersActive =
    filters.equityMin > 0 ||
    filters.equityMax < 1 ||
    filters.categories.length > 0 ||
    filters.clusters.length > 0 ||
    filters.boardRainbow !== null ||
    filters.boardTwoTone !== null ||
    filters.boardMonotone !== null ||
    filters.searchNeighborOf !== null;

  const toggleCategory = (category: string) => {
    setFilters({
      categories: filters.categories.includes(category)
        ? filters.categories.filter((c) => c !== category)
        : [...filters.categories, category],
    });
  };

  const toggleCluster = (cluster: number) => {
    setFilters({
      clusters: filters.clusters.includes(cluster)
        ? filters.clusters.filter((c) => c !== cluster)
        : [...filters.clusters, cluster],
    });
  };

  return (
    <aside
      aria-label="Visualization controls"
      className="gop-slide-in-left pointer-events-auto flex max-h-screen w-72 flex-col gap-3 overflow-y-auto border-r border-[var(--border-default)] bg-[var(--surface-glass)] p-4 backdrop-blur-md"
    >
      <Section title="Street" defaultOpen>
        <div
          role="radiogroup"
          aria-label="Street selector"
          className="grid grid-cols-2 gap-1"
        >
          {STREETS.map((s) => {
            const active = street === s;
            return (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setStreet(s as Street)}
                className={`gop-mono rounded border px-2 py-1.5 text-[11px] uppercase tracking-wider transition ${
                  active
                    ? "border-cyan-300/40 bg-cyan-500/15 text-cyan-100"
                    : "border-[var(--border-subtle)] bg-white/[0.02] text-zinc-400 hover:border-[var(--border-default)] hover:text-zinc-200"
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Color mode" defaultOpen>
        <ColorModePicker value={colorMode} onChange={setColorMode} />
        <ColorLegend mode={colorMode} dataset={dataset} />
      </Section>

      <Section title="Filters" defaultOpen>
        <fieldset className="space-y-2">
          <legend className="sr-only">Filters</legend>
          {dataset && (
            <div className="rounded border border-[var(--border-subtle)] bg-white/[0.02] px-2 py-1.5 text-[10px] text-zinc-400">
              <div className="flex items-center justify-between">
                <span>Visible states</span>
                <span className="gop-mono tabular-nums text-zinc-300">
                  {visibleCount.toLocaleString()}/{dataset.count.toLocaleString()}
                </span>
              </div>
              {filters.searchNeighborOf && (
                <div className="mt-1 flex items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-1">
                  <span className="truncate">Focused on 25-NN</span>
                  <button
                    type="button"
                    onClick={() => setFilters({ searchNeighborOf: null })}
                    className="text-cyan-300/80 transition hover:text-cyan-200"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          )}
          <label className="block text-[11px] text-zinc-400">
            <span className="flex justify-between">
              <span>Equity range</span>
              <span className="gop-mono tabular-nums text-zinc-500">
                {Math.round(filters.equityMin * 100)}-{Math.round(filters.equityMax * 100)}%
              </span>
            </span>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(filters.equityMin * 100)}
                onChange={(e) =>
                  setFilters({
                    equityMin: Math.min(
                      Number(e.target.value) / 100,
                      filters.equityMax,
                    ),
                  })
                }
                className="w-full accent-cyan-400"
                aria-label="Minimum equity"
              />
            </div>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(filters.equityMax * 100)}
                onChange={(e) =>
                  setFilters({
                    equityMax: Math.max(
                      Number(e.target.value) / 100,
                      filters.equityMin,
                    ),
                  })
                }
                className="w-full accent-cyan-400"
                aria-label="Maximum equity"
              />
            </div>
          </label>

          {categories.length > 0 && (
            <div className="text-[11px] text-zinc-400">
              <div className="mb-1 flex items-center justify-between">
                <span>Hand category</span>
                {filters.categories.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilters({ categories: [] })}
                    className="text-[10px] text-zinc-500 transition hover:text-zinc-300"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {categories.map((c) => (
                  <FilterChip
                    key={c}
                    label={humanCategory(c)}
                    active={filters.categories.includes(c)}
                    onClick={() => toggleCategory(c)}
                  />
                ))}
              </div>
            </div>
          )}

          {clusters.length > 0 && (
            <div className="text-[11px] text-zinc-400">
              <div className="mb-1 flex items-center justify-between">
                <span>Cluster</span>
                {filters.clusters.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilters({ clusters: [] })}
                    className="text-[10px] text-zinc-500 transition hover:text-zinc-300"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-1">
                {clusters.slice(0, 12).map((c) => (
                  <FilterChip
                    key={c.id}
                    label={`C${c.id}`}
                    active={filters.clusters.includes(c.id)}
                    onClick={() => toggleCluster(c.id)}
                    title={`${c.size.toLocaleString()} states`}
                  />
                ))}
                <FilterChip
                  label="noise"
                  active={filters.clusters.includes(-1)}
                  onClick={() => toggleCluster(-1)}
                />
              </div>
              {clusters.length > 12 && (
                <p className="mt-1 text-[10px] text-zinc-600">
                  Showing the first 12 manifest clusters.
                </p>
              )}
            </div>
          )}

          <div className="space-y-1 text-[11px] text-zinc-300">
            <BoardFlagToggle
              label="Rainbow board"
              value={filters.boardRainbow}
              onChange={(v) => setFilters({ boardRainbow: v })}
            />
            <BoardFlagToggle
              label="Two-tone board"
              value={filters.boardTwoTone}
              onChange={(v) => setFilters({ boardTwoTone: v })}
            />
            <BoardFlagToggle
              label="Monotone board"
              value={filters.boardMonotone}
              onChange={(v) => setFilters({ boardMonotone: v })}
            />
          </div>

          <button
            type="button"
            onClick={resetFilters}
            disabled={!filtersActive}
            className="mt-1 w-full rounded border border-[var(--border-subtle)] px-2 py-1 text-[11px] text-zinc-400 transition hover:border-[var(--border-default)] hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-30"
          >
            Reset filters
          </button>
        </fieldset>
      </Section>

      <Section title="Layers">
        <Toggle
          label="Nearest-neighbor links"
          checked={showNnLinks}
          onChange={toggleNnLinks}
        />
        <Toggle
          label="Cluster centroid labels"
          checked={showClusterLabels}
          onChange={toggleClusterLabels}
        />
      </Section>

      <Section title="Density">
        <label className="block text-[11px] text-zinc-400">
          <span className="flex justify-between">
            <span>Sample rate</span>
            <span className="gop-mono tabular-nums text-zinc-500">
              {Math.round(lodSampleRate * 100)}%
            </span>
          </span>
          <input
            type="range"
            min={10}
            max={100}
            value={Math.round(lodSampleRate * 100)}
            onChange={(e) => setLodSampleRate(Number(e.target.value) / 100)}
            aria-label="Point density"
            className="mt-1 w-full accent-cyan-400"
          />
        </label>
        <div className="mt-2 grid grid-cols-2 gap-1 text-[10px] text-zinc-500">
          <span>Target</span>
          <span className="gop-mono text-right tabular-nums">{targetFps}+ fps</span>
          <span>Measured</span>
          <span className="gop-mono text-right tabular-nums">
            {fps > 0 ? `${fps} fps` : "pending"}
          </span>
          <span>Quality</span>
          <span className="gop-mono text-right uppercase tracking-wider">
            {renderQuality.tier}
          </span>
        </div>
      </Section>

      {dataset && (
        <Section title="Diagnostics">
          <div className="space-y-2 rounded border border-[var(--border-subtle)] bg-white/[0.02] p-2 text-[10px] text-zinc-500">
            <MetricRow
              label="Embedding"
              value={dataset.manifest.embeddingMethod || "unknown"}
            />
            <MetricRow
              label="Points"
              value={dataset.count.toLocaleString()}
              mono
            />
            <MetricRow
              label="Feature dims"
              value={`${dataset.manifest.retainedDimension ?? dataset.manifest.retainedFeatures.length}/${dataset.manifest.originalDimension ?? "?"}`}
              mono
              title="Retained dimensions after preprocessing compared with original feature dimensions"
            />
            {dataset.manifest.pcaDimensions != null && (
              <MetricRow
                label="PCA dims"
                value={String(dataset.manifest.pcaDimensions)}
                mono
              />
            )}
            {dataset.manifest.pcaVariance != null && (
              <MetricRow
                label="PCA variance"
                value={formatUnitInterval(dataset.manifest.pcaVariance)}
                mono
              />
            )}
            {dataset.manifest.trustworthiness != null && (
              <MetricRow
                label="Trustworthiness"
                value={formatUnitInterval(dataset.manifest.trustworthiness)}
                mono
                title="How often embedding neighbors remain neighbors in source feature space"
              />
            )}
            {dataset.manifest.knnOverlap != null && (
              <MetricRow
                label="kNN overlap"
                value={formatUnitInterval(dataset.manifest.knnOverlap)}
                mono
                title="Shared-neighbor overlap between feature space and 3D embedding"
              />
            )}
            {dataset.manifest.hdbscan && (
              <>
                <MetricRow
                  label="Clusters"
                  value={String(dataset.manifest.hdbscan.clusters ?? "unknown")}
                  mono
                />
                {dataset.manifest.hdbscan.noiseFraction != null && (
                  <MetricRow
                    label="Noise"
                    value={formatUnitInterval(dataset.manifest.hdbscan.noiseFraction)}
                    mono
                  />
                )}
              </>
            )}
          </div>
        </Section>
      )}

      {atlas && (
        <Section title="Street atlas">
          <div className="space-y-3">
            <div className="space-y-2 rounded border border-[var(--border-subtle)] bg-white/[0.02] p-2">
              {atlas.metrics.map((metric) => (
                <div key={metric.id}>
                  <div className="mb-1 flex items-center justify-between text-[10px]">
                    <span className="text-zinc-500">{metric.label}</span>
                    <span className="gop-mono tabular-nums text-zinc-300">
                      med {formatAtlasValue(metric.median, metric.format)}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-[9px] text-zinc-600">
                    <span className="gop-mono tabular-nums">
                      min {formatAtlasValue(metric.min, metric.format)}
                    </span>
                    <span className="gop-mono text-center tabular-nums">
                      iqr {formatAtlasValue(metric.q25, metric.format)}-
                      {formatAtlasValue(metric.q75, metric.format)}
                    </span>
                    <span className="gop-mono text-right tabular-nums">
                      max {formatAtlasValue(metric.max, metric.format)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <AtlasSliceList
              title="Categories"
              slices={atlas.categories.slice(0, 5)}
              activeIds={filters.categories}
              onSelect={(id) => setFilters({ categories: [id] })}
              onClear={() => setFilters({ categories: [] })}
            />

            <AtlasSliceList
              title="Clusters"
              slices={atlas.clusters.slice(0, 6)}
              activeIds={filters.clusters.map(String)}
              onSelect={(id) => setFilters({ clusters: [Number(id)] })}
              onClear={() => setFilters({ clusters: [] })}
            />
          </div>
        </Section>
      )}

      <Section title="Camera">
        <button
          type="button"
          onClick={resetCameraView}
          className="w-full rounded border border-[var(--border-default)] bg-white/[0.04] px-2 py-1.5 text-[11px] text-zinc-200 transition hover:bg-white/[0.08]"
        >
          Reset view
        </button>
      </Section>

      <CardPickerPanel />
    </aside>
  );
}

function ColorModePicker({
  value,
  onChange,
}: {
  value: (typeof COLOR_MODES)[number]["id"];
  onChange: (mode: (typeof COLOR_MODES)[number]["id"]) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const activeMode = COLOR_MODES.find((mode) => mode.id === value) ?? COLOR_MODES[0]!;

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative mb-2">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Color mode"
        onClick={() => setOpen((next) => !next)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
        className="flex min-h-9 w-full items-center justify-between rounded border border-[var(--border-default)] bg-black/50 px-2.5 py-1.5 text-left text-xs text-zinc-100 shadow-[0_0_0_1px_rgba(0,0,0,0.3)] transition hover:border-[var(--border-strong)] hover:bg-black/60 focus:border-cyan-300/50 focus:outline-none"
      >
        <span className="truncate">{activeMode.label}</span>
        <span className="gop-mono pl-2 text-[10px] text-zinc-500" aria-hidden="true">
          {open ? "^" : "v"}
        </span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 overflow-hidden rounded border border-cyan-300/25 bg-[#101018] shadow-2xl shadow-black/60">
          <ul role="listbox" aria-label="Color mode options" className="py-1">
            {COLOR_MODES.map((mode) => {
              const active = mode.id === value;
              return (
                <li key={mode.id} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(mode.id);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs transition ${
                      active
                        ? "bg-cyan-500/15 text-cyan-100"
                        : "text-zinc-300 hover:bg-white/[0.06] hover:text-zinc-100"
                    }`}
                  >
                    <span>{mode.label}</span>
                    {active && (
                      <span className="gop-mono text-[10px] text-cyan-200" aria-hidden="true">
                        on
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="mb-1.5 flex w-full items-center justify-between text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 transition hover:text-zinc-300"
      >
        <span>{title}</span>
        <span aria-hidden="true" className="text-zinc-600">
          {open ? "-" : "+"}
        </span>
      </button>
      {open && <div className="gop-fade-in">{children}</div>}
    </section>
  );
}

function FilterChip({
  label,
  active,
  onClick,
  title,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`min-h-6 rounded border px-1.5 py-0.5 text-[10px] transition ${
        active
          ? "border-cyan-300/50 bg-cyan-500/15 text-cyan-100"
          : "border-[var(--border-subtle)] bg-white/[0.02] text-zinc-400 hover:border-[var(--border-default)] hover:text-zinc-200"
      }`}
    >
      {label}
    </button>
  );
}

function humanCategory(name: string): string {
  return name.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="mb-1 flex cursor-pointer items-center gap-2 text-[11px] text-zinc-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="accent-cyan-400"
      />
      {label}
    </label>
  );
}

function MetricRow({
  label,
  value,
  mono,
  title,
}: {
  label: string;
  value: string;
  mono?: boolean;
  title?: string;
}) {
  return (
    <div className="flex justify-between gap-2" title={title}>
      <span>{label}</span>
      <span
        className={`max-w-[9rem] truncate text-right text-zinc-300 ${
          mono ? "gop-mono tabular-nums" : ""
        }`}
      >
        {value}
      </span>
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
  const hasActive = activeIds.length > 0;
  return (
    <div className="rounded border border-[var(--border-subtle)] bg-white/[0.02] p-2">
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wider text-zinc-500">{title}</p>
        {hasActive && (
          <button
            type="button"
            onClick={onClear}
            className="text-[10px] text-zinc-500 transition hover:text-zinc-300"
          >
            Clear
          </button>
        )}
      </div>
      <div className="space-y-1">
        {slices.map((slice) => {
          const active = activeIds.includes(slice.id);
          return (
            <button
              key={slice.id}
              type="button"
              onClick={() => onSelect(slice.id)}
              className={`w-full rounded px-1.5 py-1 text-left transition ${
                active
                  ? "bg-cyan-500/15 text-cyan-100"
                  : "hover:bg-white/[0.05]"
              }`}
              title={`${slice.count.toLocaleString()} states`}
            >
              <div className="flex items-center justify-between gap-2 text-[10px]">
                <span className="truncate text-zinc-300">{slice.label}</span>
                <span className="gop-mono tabular-nums text-zinc-500">
                  {(slice.share * 100).toFixed(1)}%
                </span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded bg-white/[0.06]">
                <div
                  className="h-full rounded bg-cyan-300/55"
                  style={{ width: `${Math.max(2, slice.share * 100)}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function formatUnitInterval(value: number) {
  const clamped = Math.max(0, Math.min(1, value));
  return `${(clamped * 100).toFixed(1)}%`;
}

function BoardFlagToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean | null) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        checked={value === true}
        onChange={(e) => onChange(e.target.checked ? true : null)}
        className="accent-cyan-400"
      />
      {label}
    </label>
  );
}
