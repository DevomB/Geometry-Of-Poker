"use client";

import { useViewerStore } from "@/stores/viewer-store";

const STREET_LABEL: Record<string, string> = {
  preflop: "Preflop",
  flop: "Flop",
  turn: "Turn",
  river: "River",
};

export function MethodologyPanel() {
  const dataset = useViewerStore((s) => s.dataset);
  const street = useViewerStore((s) => s.street);
  if (!dataset) return null;
  const m = dataset.manifest;

  return (
    <section
      aria-label="Methodology"
      className="rounded border border-[var(--border-subtle)] bg-white/[0.02] p-2.5"
    >
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-300">
        Methodology
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[10px]">
        <Row label="Street" value={STREET_LABEL[street] ?? street} />
        <Row label="Points" value={m.pointCount.toLocaleString()} mono />
        <Row
          label="Features"
          value={`${m.retainedDimension ?? "-"} retained / ${m.originalDimension ?? "-"} total`}
          mono
        />
        <Row
          label="Embedding"
          value={m.embeddingMethod}
          title={m.embeddingMethod}
          truncate
        />
        {m.pcaDimensions != null && (
          <Row
            label="PCA"
            value={`${m.pcaDimensions}D / ${
              m.pcaVariance != null
                ? `${(m.pcaVariance * 100).toFixed(1)}% var`
                : "-"
            }`}
            mono
          />
        )}
        {m.hdbscan?.clusters != null && (
          <Row
            label="Clusters"
            value={`${m.hdbscan.clusters} / ${
              m.hdbscan.noiseFraction != null
                ? `${(m.hdbscan.noiseFraction * 100).toFixed(0)}% noise`
                : "-"
            }`}
            mono
          />
        )}
        {m.trustworthiness != null && (
          <Row
            label="Trust"
            value={m.trustworthiness.toFixed(3)}
            mono
            title="Trustworthiness - neighborhood preservation, higher is better"
          />
        )}
        <Row label="Version" value={`v${m.version}`} mono />
      </dl>
      {m.dimensionProfile && (
        <div className="mt-2 border-t border-[var(--border-subtle)] pt-2">
          <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            Geometry interpretation
          </p>
          {m.dimensionProfile.topFeatureGroups.length > 0 && (
            <p className="text-[10px] leading-relaxed text-zinc-400">
              Drivers:{" "}
              {m.dimensionProfile.topFeatureGroups
                .slice(0, 3)
                .map((group) => `${labelGroup(group.group)} ${(group.share * 100).toFixed(0)}%`)
                .join(" / ")}
            </p>
          )}
          {m.dimensionProfile.topPcaLoadings.length > 0 && (
            <p className="mt-1 text-[10px] leading-relaxed text-zinc-500">
              PC1:{" "}
              {m.dimensionProfile.topPcaLoadings
                .slice(0, 3)
                .map((loading) => loading.feature)
                .join(" / ")}
            </p>
          )}
          {m.dimensionProfile.axisCaveat && (
            <p className="mt-1 text-[10px] leading-relaxed text-zinc-600">
              {m.dimensionProfile.axisCaveat}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function labelGroup(group: string) {
  return group.replace(/^\w/, (c) => c.toUpperCase());
}

function Row({
  label,
  value,
  mono,
  truncate,
  title,
}: {
  label: string;
  value: string;
  mono?: boolean;
  truncate?: boolean;
  title?: string;
}) {
  return (
    <>
      <dt className="text-zinc-500">{label}</dt>
      <dd
        title={title}
        className={`text-right text-zinc-300 ${mono ? "gop-mono tabular-nums" : ""} ${
          truncate ? "max-w-[160px] truncate" : ""
        }`}
      >
        {value}
      </dd>
    </>
  );
}
