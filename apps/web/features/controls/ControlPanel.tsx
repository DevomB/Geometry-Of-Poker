"use client";

import { useViewerStore } from "@/stores/viewer-store";
import { COLOR_MODES, STREETS } from "@/lib/types";
import type { Street } from "@geometry-of-poker/shared";
import { resetCameraView } from "@/features/scene/SceneShell";
import { CardPickerPanel } from "@/features/card-picker/CardPickerPanel";

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

  const categories = dataset?.manifest.categories ?? [];

  return (
    <aside className="pointer-events-auto flex max-h-[calc(100vh-4rem)] w-72 flex-col gap-4 overflow-y-auto border-r border-white/10 bg-black/70 p-4 backdrop-blur-md">
      <section>
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
          Street
        </h2>
        <div className="grid grid-cols-2 gap-1">
          {STREETS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStreet(s as Street)}
              className={`rounded px-2 py-1.5 text-xs capitalize transition ${
                street === s
                  ? "bg-zinc-100 text-zinc-900"
                  : "bg-white/5 text-zinc-300 hover:bg-white/10"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
          Color mode
        </h2>
        <select
          value={colorMode}
          onChange={(e) => setColorMode(e.target.value as typeof colorMode)}
          className="w-full rounded border border-white/10 bg-black/50 px-2 py-1.5 text-xs text-zinc-200"
        >
          {COLOR_MODES.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </section>

      <section>
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
          Filters
        </h2>
        <label className="mb-2 block text-xs text-zinc-400">
          Equity range
          <div className="mt-1 flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(filters.equityMin * 100)}
              onChange={(e) =>
                setFilters({ equityMin: Number(e.target.value) / 100 })
              }
              className="w-full"
            />
            <span className="w-10 tabular-nums text-right text-[10px]">
              {Math.round(filters.equityMin * 100)}%
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(filters.equityMax * 100)}
              onChange={(e) =>
                setFilters({ equityMax: Number(e.target.value) / 100 })
              }
              className="w-full"
            />
            <span className="w-10 tabular-nums text-right text-[10px]">
              {Math.round(filters.equityMax * 100)}%
            </span>
          </div>
        </label>

        {categories.length > 0 && (
          <label className="mb-2 block text-xs text-zinc-400">
            Hand category
            <select
              multiple
              value={filters.categories}
              onChange={(e) => {
                const selected = [...e.target.selectedOptions].map((o) => o.value);
                setFilters({ categories: selected });
              }}
              className="mt-1 h-20 w-full rounded border border-white/10 bg-black/50 px-2 py-1 text-xs"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="space-y-1 text-xs text-zinc-400">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filters.boardRainbow === true}
              onChange={(e) =>
                setFilters({ boardRainbow: e.target.checked ? true : null })
              }
            />
            Rainbow board
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filters.boardTwoTone === true}
              onChange={(e) =>
                setFilters({ boardTwoTone: e.target.checked ? true : null })
              }
            />
            Two-tone board
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filters.boardMonotone === true}
              onChange={(e) =>
                setFilters({ boardMonotone: e.target.checked ? true : null })
              }
            />
            Monotone board
          </label>
        </div>

        <button
          type="button"
          onClick={resetFilters}
          className="mt-2 w-full rounded border border-white/10 px-2 py-1 text-xs text-zinc-300 hover:bg-white/5"
        >
          Reset filters
        </button>
      </section>

      <section>
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
          Camera
        </h2>
        <button
          type="button"
          onClick={resetCameraView}
          className="w-full rounded bg-white/10 px-2 py-1.5 text-xs hover:bg-white/15"
        >
          Reset view
        </button>
      </section>

      <section>
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
          Overlays
        </h2>
        <label className="mb-1 flex items-center gap-2 text-xs text-zinc-300">
          <input type="checkbox" checked={showNnLinks} onChange={toggleNnLinks} />
          Nearest-neighbor links
        </label>
        <label className="flex items-center gap-2 text-xs text-zinc-300">
          <input type="checkbox" checked={showClusterLabels} onChange={toggleClusterLabels} />
          Cluster centroid labels
        </label>
      </section>

      <section>
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
          Level of detail
        </h2>
        <input
          type="range"
          min={10}
          max={100}
          value={Math.round(lodSampleRate * 100)}
          onChange={(e) => setLodSampleRate(Number(e.target.value) / 100)}
          className="w-full"
        />
        <p className="mt-1 text-[10px] text-zinc-500">
          Sample {Math.round(lodSampleRate * 100)}% of points
        </p>
      </section>

      <CardPickerPanel />
    </aside>
  );
}
