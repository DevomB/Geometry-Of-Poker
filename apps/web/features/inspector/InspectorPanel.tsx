"use client";

import { useMemo, useState } from "react";
import { useViewerStore } from "@/stores/viewer-store";
import { CardDisplay } from "@/components/CardDisplay";
import { MethodologyPanel } from "@/components/MethodologyPanel";
import { compareManualToPoint } from "@/lib/inspector/state-comparison";
import type { BrowserPointMeta, ManualMarker } from "@/lib/types";
import {
  describeProjectionMethod,
  summarizeProjectionLocality,
} from "@/lib/visualization-theme";

export function InspectorPanel() {
  const dataset = useViewerStore((s) => s.dataset);
  const selection = useViewerStore((s) => s.selection);
  const manualMarker = useViewerStore((s) => s.manualMarker);
  const clearSelection = useViewerStore((s) => s.clearSelection);
  const setManualMarker = useViewerStore((s) => s.setManualMarker);
  const filters = useViewerStore((s) => s.filters);
  const setFilters = useViewerStore((s) => s.setFilters);

  const selectedIndex = selection?.index;
  const point =
    selectedIndex !== undefined && dataset ? dataset.metadata[selectedIndex] : null;

  return (
    <aside
      aria-label="State inspector"
      className="gop-slide-in-right pointer-events-auto flex max-h-screen w-80 flex-col gap-4 overflow-y-auto border-l border-[var(--border-default)] bg-[var(--surface-glass)] p-4 backdrop-blur-md"
    >
      <header className="flex items-center justify-between">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-300">
          Inspector
        </h2>
        <div className="flex gap-3 text-[10px]">
          {manualMarker && (
            <button
              type="button"
              onClick={() => setManualMarker(null)}
              className="text-amber-300/70 transition hover:text-amber-200"
            >
              Clear projection
            </button>
          )}
          {selection && (
            <button
              type="button"
              onClick={clearSelection}
              className="text-zinc-500 transition hover:text-zinc-200"
            >
              Clear selection
            </button>
          )}
        </div>
      </header>

      {manualMarker && <ManualProjectionCard />}

      {point ? (
        <SelectedStateCard
          point={point}
          index={selectedIndex!}
          manualMarker={manualMarker}
          neighborFocusActive={filters.searchNeighborOf === point.id}
          onToggleNeighborFocus={() =>
            setFilters({
              searchNeighborOf:
                filters.searchNeighborOf === point.id ? null : point.id,
            })
          }
        />
      ) : (
        <EmptySelection hasManual={!!manualMarker} />
      )}

      {dataset && <MethodologyPanel />}
    </aside>
  );
}

function EmptySelection({ hasManual }: { hasManual: boolean }) {
  return (
    <section className="rounded border border-dashed border-[var(--border-subtle)] bg-white/[0.01] p-4 text-[11px] leading-relaxed text-zinc-500">
      <p className="mb-1 text-zinc-400">No state selected.</p>
      <p>
        Hover the manifold for tooltips. Click a point to lock selection and
        view its full feature breakdown.
      </p>
      {hasManual && (
        <p className="mt-2 text-amber-300/70">
          A manually projected hand is active. Its card and metric summary is
          shown above; neighbors are reference points from the manifold.
        </p>
      )}
    </section>
  );
}

function ManualProjectionCard() {
  const marker = useViewerStore((s) => s.manualMarker)!;
  const equity = numberMetric(marker.features.equityVsRandom);
  const category = stringMetric(marker.features.category);
  const nearestDistance = marker.neighborDistances[0];
  const distanceLabel =
    marker.method === "pca-knn-interpolation" ? "Nearest PCA d" : "Nearest 3D d";
  const locality = summarizeProjectionLocality(marker.method, marker.neighborDistances);
  return (
    <section
      aria-label="Manual projection"
      className="gop-fade-in rounded border border-amber-300/30 bg-amber-500/5 p-3"
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-amber-200">
          Manual projection
        </p>
        <span className="gop-mono text-[10px] tabular-nums text-amber-300/70">
          {describeProjectionMethod(marker.method)}
        </span>
      </div>
      <div className="space-y-1.5">
        <CardDisplay cards={marker.hero} label="Hero" />
        {marker.board.length > 0 && (
          <CardDisplay cards={marker.board} label="Board" />
        )}
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
        {category && <Row label="Category" value={humanCategory(category)} />}
        {equity !== null && (
          <Row label="Equity" value={`${(equity * 100).toFixed(2)}%`} mono />
        )}
        <Row
          label="Position"
          value={marker.position.map((v) => v.toFixed(2)).join(", ")}
          mono
        />
        {nearestDistance !== undefined && (
          <Row label={distanceLabel} value={nearestDistance.toFixed(3)} mono />
        )}
        {marker.clusterId !== null && (
          <Row label="Cluster" value={`C${marker.clusterId}`} mono />
        )}
        <Row label="Locality" value={locality.label} title={locality.detail} />
        {locality.effectiveNeighbors !== null && (
          <Row
            label="Effective k"
            value={locality.effectiveNeighbors.toFixed(1)}
            mono
            title="Inverse-distance effective neighbor count for the projection blend"
          />
        )}
      </dl>
      <p className="mt-2 rounded border border-amber-300/20 bg-black/20 px-2 py-1.5 text-[10px] leading-relaxed text-amber-100/70">
        {locality.detail}
      </p>
      {marker.warnings && marker.warnings.length > 0 && (
        <ul className="mt-2 space-y-1 rounded border border-rose-400/30 bg-rose-950/20 p-2 text-[10px] leading-relaxed text-rose-100/80">
          {marker.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
      <p className="mt-2 border-t border-amber-300/20 pt-2 text-[10px] leading-relaxed text-amber-100/70">
        This marker is the projected custom hand. Neighbor rows are manifold
        references used to place it, not replacements for the input cards.
      </p>
      {marker.neighborIds.length > 0 && (
        <div className="mt-2 border-t border-amber-300/20 pt-2">
          <p className="mb-1 text-[10px] uppercase tracking-wider text-amber-300/70">
            Nearest manifold neighbors
          </p>
          <ManualNeighborsList />
        </div>
      )}
    </section>
  );
}

function ManualNeighborsList() {
  const marker = useViewerStore((s) => s.manualMarker)!;
  const dataset = useViewerStore((s) => s.dataset);
  const selectPoint = useViewerStore((s) => s.selectPoint);
  if (!dataset) return null;

  return (
    <ul className="space-y-0.5">
      {marker.neighborIds.map((id, i) => {
        const idx = dataset.idToIndex.get(id);
        const point = idx !== undefined ? dataset.metadata[idx] : undefined;
        return (
          <li key={id}>
            <button
              type="button"
              onClick={() => idx !== undefined && selectPoint(idx, true)}
              disabled={idx === undefined}
              className="w-full rounded px-1 py-0.5 text-left text-[11px] transition hover:bg-white/5 disabled:opacity-30"
            >
              <span className="gop-mono tabular-nums text-amber-300/70">
                d={marker.neighborDistances[i]?.toFixed(3) ?? "-"}
              </span>{" "}
              {point ? (
                <>
                  <span className="text-zinc-200">{point.hero.join(" ")}</span>
                  {point.board.length > 0 && (
                    <span className="text-zinc-500"> | {point.board.join(" ")}</span>
                  )}
                </>
              ) : (
                <span className="font-mono text-zinc-500">{id}</span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function SelectedStateCard({
  point,
  index,
  manualMarker,
  neighborFocusActive,
  onToggleNeighborFocus,
}: {
  point: BrowserPointMeta;
  index: number;
  manualMarker: ManualMarker | null;
  neighborFocusActive: boolean;
  onToggleNeighborFocus: () => void;
}) {
  const [showAllFeatures, setShowAllFeatures] = useState(false);

  return (
    <section className="gop-fade-in space-y-3">
      <div className="rounded border border-[var(--border-subtle)] bg-white/[0.02] p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            Selected state
          </p>
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={onToggleNeighborFocus}
              className={`rounded border px-1.5 py-0.5 text-[10px] transition ${
                neighborFocusActive
                  ? "border-cyan-300/50 bg-cyan-500/15 text-cyan-100"
                  : "border-[var(--border-subtle)] text-zinc-500 hover:border-[var(--border-default)] hover:text-zinc-200"
              }`}
              title="Filter the cloud to this point and its nearest embedding neighbors"
            >
              {neighborFocusActive ? "Clear 25-NN" : "Focus 25-NN"}
            </button>
            <span className="gop-mono truncate text-[10px] text-zinc-500">
              {point.id}
            </span>
          </div>
        </div>
        <div className="space-y-1.5">
          <CardDisplay cards={point.hero} label="Hero" />
          {point.board.length > 0 && (
            <CardDisplay cards={point.board} label="Board" />
          )}
        </div>
      </div>

      <KeyMetrics point={point} />

      {manualMarker && (
        <ManualComparisonCard marker={manualMarker} point={point} />
      )}

      <BoardTextureSection point={point} />

      <DrawsSection point={point} />

      <details
        open={showAllFeatures}
        onToggle={(e) => setShowAllFeatures((e.target as HTMLDetailsElement).open)}
        className="rounded border border-[var(--border-subtle)] bg-white/[0.02] p-3"
      >
        <summary className="cursor-pointer text-[10px] uppercase tracking-[0.18em] text-zinc-400 outline-none transition hover:text-zinc-200">
          Feature breakdown
        </summary>
        <dl className="mt-2 max-h-56 space-y-0.5 overflow-y-auto pr-1 text-[11px]">
          {Object.entries({ ...point.summary, equityVsRandom: point.equityVsRandom })
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => (
              <div key={key} className="flex justify-between gap-2">
                <dt className="truncate text-zinc-500">{key}</dt>
                <dd className="gop-mono tabular-nums text-zinc-300">
                  {typeof value === "number"
                    ? Number.isInteger(value)
                      ? value
                      : value.toFixed(4)
                    : String(value)}
                </dd>
              </div>
            ))}
        </dl>
      </details>

      <NearestNeighbors index={index} />
    </section>
  );
}

function KeyMetrics({ point }: { point: BrowserPointMeta }) {
  const eq = point.equityVsRandom;
  const equityVar = point.summary.equityVariance ?? 0;
  return (
    <div className="grid grid-cols-2 gap-2">
      <Metric label="Category" value={humanCategory(point.category)} />
      <Metric
        label="Cluster"
        value={point.clusterId >= 0 ? `C${point.clusterId}` : "noise"}
      />
      <Metric
        label="Equity vs random"
        value={`${(eq * 100).toFixed(2)}%`}
        sub={equityBarFromValue(eq)}
        mono
      />
      <Metric
        label="Equity variance"
        value={equityVar.toFixed(4)}
        mono
        title="Spread of equity across hypothetical runouts"
      />
      {point.summary.pNuts != null && (
        <Metric
          label="pNuts"
          value={point.summary.pNuts.toFixed(3)}
          mono
          title="Probability of being the nuts"
        />
      )}
      {point.summary.pDominated != null && (
        <Metric
          label="pDominated"
          value={point.summary.pDominated.toFixed(3)}
          mono
          title="Probability of being dominated"
        />
      )}
    </div>
  );
}

function BoardTextureSection({ point }: { point: BrowserPointMeta }) {
  if (point.board.length === 0) return null;
  const s = point.summary;
  const texture: string[] = [];
  if ((s.boardMonotoneFlag ?? 0) > 0.5) texture.push("Monotone");
  else if ((s.boardTwoToneFlag ?? 0) > 0.5) texture.push("Two-tone");
  else if ((s.boardRainbowFlag ?? 0) > 0.5) texture.push("Rainbow");
  if ((s.boardPairednessScore ?? 0) > 0) texture.push("Paired");
  if ((s.boardConnectivityScore ?? 0) > 0.5) texture.push("Connected");

  return (
    <div className="rounded border border-[var(--border-subtle)] bg-white/[0.02] p-3">
      <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-zinc-500">
        Board texture
      </p>
      <div className="mb-1 flex flex-wrap gap-1">
        {texture.length === 0 ? (
          <span className="text-[10px] text-zinc-500">-</span>
        ) : (
          texture.map((t) => (
            <span
              key={t}
              className="rounded border border-[var(--border-subtle)] bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-zinc-300"
            >
              {t}
            </span>
          ))
        )}
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
        {s.boardConnectivityScore != null && (
          <Row
            label="Connectivity"
            value={s.boardConnectivityScore.toFixed(2)}
            mono
          />
        )}
        {s.boardPairednessScore != null && (
          <Row label="Pairedness" value={s.boardPairednessScore.toFixed(2)} mono />
        )}
      </dl>
    </div>
  );
}

function DrawsSection({ point }: { point: BrowserPointMeta }) {
  const s = point.summary;
  const flushOuts = s.flushOutCount ?? 0;
  const straightOuts = s.straightOutCount ?? 0;
  if (flushOuts === 0 && straightOuts === 0) return null;
  return (
    <div className="rounded border border-[var(--border-subtle)] bg-white/[0.02] p-3">
      <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-zinc-500">
        Draws
      </p>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
        {flushOuts > 0 && <Row label="Flush outs" value={String(flushOuts)} mono />}
        {straightOuts > 0 && (
          <Row label="Straight outs" value={String(straightOuts)} mono />
        )}
      </dl>
    </div>
  );
}

function NearestNeighbors({ index }: { index: number }) {
  const dataset = useViewerStore((s) => s.dataset);
  const spatialIndex = useViewerStore((s) => s.spatialIndex);
  const selectPoint = useViewerStore((s) => s.selectPoint);
  const top = useMemo(() => {
    if (!dataset || !spatialIndex) return [];
    const px = dataset.positions[index * 3]!;
    const py = dataset.positions[index * 3 + 1]!;
    const pz = dataset.positions[index * 3 + 2]!;
    return spatialIndex.nearestK(px, py, pz, 6, index);
  }, [dataset, index, spatialIndex]);

  if (!dataset || top.length === 0) return null;

  return (
    <div className="rounded border border-[var(--border-subtle)] bg-white/[0.02] p-3">
      <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-zinc-500">
        Nearest neighbors
      </p>
      <ul className="space-y-0.5 text-[11px]">
        {top.map(({ index: neighborIndex, distance }) => {
          const p = dataset.metadata[neighborIndex]!;
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => selectPoint(neighborIndex, true)}
                className="w-full rounded px-1 py-0.5 text-left transition hover:bg-white/5"
              >
                <span className="gop-mono tabular-nums text-zinc-500">
                  {distance.toFixed(3)}
                </span>{" "}
                <span className="text-zinc-300">{p.hero.join(" ")}</span>
                {p.board.length > 0 && (
                  <span className="text-zinc-500"> | {p.board.join(" ")}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Metric({
  label,
  value,
  sub,
  mono,
  title,
}: {
  label: string;
  value: string;
  sub?: React.ReactNode;
  mono?: boolean;
  title?: string;
}) {
  return (
    <div
      title={title}
      className="rounded border border-[var(--border-subtle)] bg-white/[0.02] px-2 py-1.5"
    >
      <p className="text-[9px] uppercase tracking-wider text-zinc-500">{label}</p>
      <p
        className={`text-[12px] text-zinc-200 ${
          mono ? "gop-mono tabular-nums" : ""
        }`}
      >
        {value}
      </p>
      {sub}
    </div>
  );
}

function Row({
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
    <>
      <dt className="text-zinc-500" title={title}>
        {label}
      </dt>
      <dd className={`text-right text-zinc-300 ${mono ? "gop-mono tabular-nums" : ""}`}>
        {value}
      </dd>
    </>
  );
}

function equityBarFromValue(eq: number) {
  const pct = Math.max(0, Math.min(1, eq)) * 100;
  return (
    <div
      className="mt-1 h-0.5 w-full overflow-hidden rounded bg-white/[0.05]"
      aria-hidden="true"
    >
      <div
        className="h-full"
        style={{
          width: `${pct}%`,
          background: "linear-gradient(90deg, #385f9e, #cf8b6f, #e64a3f)",
        }}
      />
    </div>
  );
}

function humanCategory(name: string): string {
  return name.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

function formatSignedPercent(value: number) {
  const pct = value * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}`;
}

function ManualComparisonCard({
  marker,
  point,
}: {
  marker: ManualMarker;
  point: BrowserPointMeta;
}) {
  const comparison = compareManualToPoint(marker, point);
  return (
    <div className="rounded border border-cyan-300/20 bg-cyan-500/[0.04] p-3">
      <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-cyan-200/80">
        Compared with manual hand
      </p>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
        <Row
          label="Reference"
          value={
            comparison.neighborRank !== null
              ? `neighbor #${comparison.neighborRank}`
              : "outside top-k"
          }
        />
        {comparison.neighborDistance !== null && (
          <Row
            label="Neighbor d"
            value={comparison.neighborDistance.toFixed(3)}
            mono
          />
        )}
        {comparison.equityDelta !== null && (
          <Row
            label="Equity delta"
            value={`${formatSignedPercent(comparison.equityDelta)} pp`}
            mono
          />
        )}
        {comparison.categoryMatch !== null && (
          <Row
            label="Category"
            value={comparison.categoryMatch ? "same" : "different"}
          />
        )}
        {comparison.clusterMatch !== null && (
          <Row
            label="Cluster"
            value={comparison.clusterMatch ? "same" : "different"}
          />
        )}
        <Row
          label="Shared cards"
          value={`${comparison.sharedCards}/${comparison.totalManualCards}`}
          mono
        />
      </dl>
    </div>
  );
}

function numberMetric(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringMetric(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}
