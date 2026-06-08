"use client";

import { useState, type ReactNode } from "react";
import { useViewerStore } from "@/stores/viewer-store";
import { COLOR_MODES, STREETS } from "@/lib/types";
import type { Street } from "@geometry-of-poker/shared";
import { resetCameraView } from "@/features/scene/SceneShell";
import { CardPickerPanel } from "@/features/card-picker/CardPickerPanel";
import { ColorLegend } from "@/components/ColorLegend";

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
        <select
          value={colorMode}
          onChange={(e) => setColorMode(e.target.value as typeof colorMode)}
          aria-label="Color mode"
          className="mb-2 w-full rounded border border-[var(--border-default)] bg-black/40 px-2 py-1.5 text-xs text-zinc-200 focus:border-cyan-300/50 focus:outline-none"
        >
          {COLOR_MODES.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
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
