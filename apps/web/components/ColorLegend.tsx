"use client";

import type { ColorMode, StreetDataset } from "@/lib/types";
import { CATEGORY_PALETTE, CLUSTER_PALETTE } from "@/lib/types";
import { COLOR_MODE_META, rgbCss } from "@/lib/visualization-theme";

interface ColorLegendProps {
  mode: ColorMode;
  dataset: StreetDataset | null;
}

export function ColorLegend({ mode, dataset }: ColorLegendProps) {
  const meta = COLOR_MODE_META[mode];

  return (
    <div className="rounded border border-[var(--border-subtle)] bg-white/[0.02] p-2.5">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-300">
          {meta.label}
        </p>
        <span className="gop-mono text-[9px] uppercase tracking-wider text-zinc-500">
          {meta.legendKind}
        </span>
      </div>
      <p className="mb-2 text-[10px] leading-relaxed text-zinc-400">
        {meta.description}
      </p>
      {meta.legendKind === "continuous" || meta.legendKind === "diverging" ? (
        <ContinuousBar meta={meta} />
      ) : meta.legendKind === "categorical" ? (
        <CategoricalSwatches dataset={dataset} />
      ) : (
        <ClusterSwatches dataset={dataset} />
      )}
    </div>
  );
}

function ContinuousBar({
  meta,
}: {
  meta: (typeof COLOR_MODE_META)[ColorMode];
}) {
  const gradient = `linear-gradient(90deg, ${meta.legend.stops.join(", ")})`;
  return (
    <div>
      <div
        className="h-2 w-full rounded-sm"
        style={{ background: gradient }}
        aria-hidden="true"
      />
      <div className="mt-1 flex justify-between gop-mono text-[9px] tabular-nums text-zinc-500">
        <span>{meta.legend.labels[0]}</span>
        <span>{meta.legend.labels[1]}</span>
      </div>
    </div>
  );
}

function CategoricalSwatches({ dataset }: { dataset: StreetDataset | null }) {
  const present = new Set(dataset?.manifest.categories ?? []);
  const entries = Object.entries(CATEGORY_PALETTE).filter(([name]) =>
    present.size === 0 ? true : present.has(name),
  );
  if (entries.length === 0) {
    return <p className="text-[10px] text-zinc-500">No categories present.</p>;
  }
  return (
    <ul className="grid grid-cols-2 gap-x-2 gap-y-0.5">
      {entries.map(([name, rgb]) => (
        <li
          key={name}
          className="flex items-center gap-1.5 text-[10px] text-zinc-400"
        >
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: rgbCss(rgb) }}
            aria-hidden="true"
          />
          <span className="truncate">{humanCategory(name)}</span>
        </li>
      ))}
    </ul>
  );
}

function ClusterSwatches({ dataset }: { dataset: StreetDataset | null }) {
  const clusters = dataset?.manifest.clusters ?? [];
  if (clusters.length === 0) {
    return (
      <p className="text-[10px] text-zinc-500">
        No HDBSCAN clusters available for this street.
      </p>
    );
  }
  return (
    <ul className="grid grid-cols-2 gap-x-2 gap-y-0.5">
      {clusters.map((c) => {
        const color = rgbCss(CLUSTER_PALETTE[c.id % CLUSTER_PALETTE.length]!);
        return (
          <li
            key={c.id}
            className="flex items-center gap-1.5 text-[10px] text-zinc-400"
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: color }}
              aria-hidden="true"
            />
            <span className="gop-mono">
              C{c.id} · {c.size}
            </span>
          </li>
        );
      })}
      <li className="flex items-center gap-1.5 text-[10px] text-zinc-500">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: "rgb(64,64,72)" }}
          aria-hidden="true"
        />
        noise
      </li>
    </ul>
  );
}

function humanCategory(name: string): string {
  return name.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}
