"use client";

import { useViewerStore } from "@/stores/viewer-store";
import { CardDisplay } from "@/components/CardDisplay";
import { CATEGORY_PALETTE, CLUSTER_PALETTE, type StreetManifest } from "@/lib/types";

export function InspectorPanel() {
  const dataset = useViewerStore((s) => s.dataset);
  const selection = useViewerStore((s) => s.selection);
  const manualMarker = useViewerStore((s) => s.manualMarker);
  const clearSelection = useViewerStore((s) => s.clearSelection);
  const manifest = dataset?.manifest;

  const selectedIndex = selection?.index;
  const point =
    selectedIndex !== undefined && dataset ? dataset.metadata[selectedIndex] : null;

  return (
    <aside className="pointer-events-auto flex max-h-[calc(100vh-4rem)] w-80 flex-col gap-4 overflow-y-auto border-l border-white/10 bg-black/70 p-4 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
          Inspector
        </h2>
        {selection && (
          <button
            type="button"
            onClick={clearSelection}
            className="text-[10px] text-zinc-400 hover:text-zinc-200"
          >
            Clear
          </button>
        )}
      </div>

      {manualMarker && (
        <section className="rounded border border-amber-400/30 bg-amber-950/20 p-3">
          <h3 className="mb-2 text-xs font-medium text-amber-200">Manual projection</h3>
          <CardDisplay cards={manualMarker.hero} label="Hero" />
          {manualMarker.board.length > 0 && (
            <CardDisplay cards={manualMarker.board} label="Board" />
          )}
          <p className="mt-2 text-[10px] text-zinc-400">Method: {manualMarker.method}</p>
          <p className="text-[10px] text-zinc-400">
            Position: {manualMarker.position.map((v) => v.toFixed(2)).join(", ")}
          </p>
          {manualMarker.clusterId !== null && (
            <p className="text-[10px] text-zinc-400">Cluster: {manualMarker.clusterId}</p>
          )}
          <div className="mt-2">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Nearest neighbors</p>
            <ul className="mt-1 space-y-1 text-[11px] text-zinc-300">
              {manualMarker.neighborIds.map((id, i) => (
                <li key={id} className="font-mono">
                  {id}{" "}
                  <span className="text-zinc-500">
                    d={manualMarker.neighborDistances[i]?.toFixed(3)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {point ? (
        <section className="space-y-3">
          <div>
            <p className="text-xs text-zinc-500">State ID</p>
            <p className="font-mono text-xs text-zinc-200">{point.id}</p>
          </div>
          <CardDisplay cards={point.hero} label="Hero" />
          {point.board.length > 0 && <CardDisplay cards={point.board} label="Board" />}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-zinc-500">Category</p>
              <p className="text-zinc-200">{point.category}</p>
            </div>
            <div>
              <p className="text-zinc-500">Equity vs random</p>
              <p className="tabular-nums text-zinc-200">
                {(point.equityVsRandom * 100).toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-zinc-500">Cluster</p>
              <p className="text-zinc-200">
                {point.clusterId >= 0 ? point.clusterId : "noise"}
              </p>
            </div>
            <div>
              <p className="text-zinc-500">Embedding</p>
              <p className="font-mono text-[10px] text-zinc-300">
                {point.x.toFixed(2)}, {point.y.toFixed(2)}, {point.z.toFixed(2)}
              </p>
            </div>
          </div>

          <div>
            <p className="mb-1 text-[10px] uppercase tracking-wider text-zinc-500">
              Feature values
            </p>
            <dl className="max-h-48 space-y-1 overflow-y-auto text-[11px]">
              {Object.entries({ ...point.summary, equityVsRandom: point.equityVsRandom }).map(
                ([key, value]) => (
                  <div key={key} className="flex justify-between gap-2">
                    <dt className="truncate text-zinc-500">{key}</dt>
                    <dd className="tabular-nums text-zinc-300">
                      {typeof value === "number" ? value.toFixed(4) : String(value)}
                    </dd>
                  </div>
                ),
              )}
            </dl>
          </div>

          <NearestNeighbors index={selectedIndex!} />
        </section>
      ) : (
        <p className="text-xs text-zinc-500">
          Hover a point for a tooltip, or click to inspect full feature values and neighbors.
        </p>
      )}

      {manifest && <ResearchMetadata manifest={manifest} />}
    </aside>
  );
}

function NearestNeighbors({ index }: { index: number }) {
  const dataset = useViewerStore((s) => s.dataset);
  const selectPoint = useViewerStore((s) => s.selectPoint);
  if (!dataset) return null;

  const px = dataset.positions[index * 3]!;
  const py = dataset.positions[index * 3 + 1]!;
  const pz = dataset.positions[index * 3 + 2]!;
  const scored: { i: number; d: number }[] = [];
  for (let i = 0; i < dataset.count; i++) {
    if (i === index) continue;
    const d = Math.sqrt(
      (dataset.positions[i * 3]! - px) ** 2 +
        (dataset.positions[i * 3 + 1]! - py) ** 2 +
        (dataset.positions[i * 3 + 2]! - pz) ** 2,
    );
    scored.push({ i, d });
  }
  scored.sort((a, b) => a.d - b.d);
  const top = scored.slice(0, 6);

  return (
    <div>
      <p className="mb-1 text-[10px] uppercase tracking-wider text-zinc-500">
        Nearest neighbors
      </p>
      <ul className="space-y-1 text-[11px]">
        {top.map(({ i, d }) => {
          const p = dataset.metadata[i]!;
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => selectPoint(i, true)}
                className="w-full rounded px-1 py-0.5 text-left hover:bg-white/5"
              >
                <span className="font-mono text-zinc-400">{d.toFixed(3)}</span>{" "}
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

function ResearchMetadata({ manifest }: { manifest: StreetManifest }) {
  return (
    <section className="mt-auto border-t border-white/10 pt-4">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
        Embedding metadata
      </h3>
      <dl className="space-y-1 text-[11px]">
        <div className="flex justify-between gap-2">
          <dt className="text-zinc-500">Method</dt>
          <dd className="text-right text-zinc-300">{manifest.embeddingMethod}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-zinc-500">Points</dt>
          <dd className="tabular-nums text-zinc-300">
            {manifest.pointCount.toLocaleString()}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-zinc-500">Vector dims</dt>
          <dd className="tabular-nums text-zinc-300">
            {manifest.retainedDimension ?? "—"} retained / {manifest.originalDimension ?? "—"}{" "}
            original
          </dd>
        </div>
        {manifest.pcaDimensions != null && (
          <div className="flex justify-between gap-2">
            <dt className="text-zinc-500">PCA</dt>
            <dd className="text-zinc-300">
              {manifest.pcaDimensions}D
              {manifest.pcaVariance != null &&
                ` (${(manifest.pcaVariance * 100).toFixed(1)}% var)`}
            </dd>
          </div>
        )}
        {manifest.umap && Object.keys(manifest.umap).length > 0 && (
          <div>
            <dt className="text-zinc-500">UMAP</dt>
            <dd className="mt-0.5 font-mono text-[10px] text-zinc-400">
              {Object.entries(manifest.umap)
                .map(([k, v]) => `${k}=${v}`)
                .join(", ")}
            </dd>
          </div>
        )}
        {manifest.hdbscan?.clusters != null && (
          <div className="flex justify-between gap-2">
            <dt className="text-zinc-500">Clusters</dt>
            <dd className="text-zinc-300">
              {manifest.hdbscan.clusters}
              {manifest.hdbscan.noiseFraction != null &&
                ` (${(manifest.hdbscan.noiseFraction * 100).toFixed(0)}% noise)`}
            </dd>
          </div>
        )}
      </dl>

      <ClusterLegend clusters={manifest.clusters} />
      <FeatureLegend />
    </section>
  );
}

function ClusterLegend({ clusters }: { clusters: { id: number; size: number }[] }) {
  if (!clusters.length) return null;
  return (
    <div className="mt-3">
      <p className="mb-1 text-[10px] uppercase tracking-wider text-zinc-500">Cluster legend</p>
      <ul className="space-y-0.5">
        {clusters.map((c) => {
          const [r, g, b] = CLUSTER_PALETTE[c.id % CLUSTER_PALETTE.length]!;
          return (
            <li key={c.id} className="flex items-center gap-2 text-[10px] text-zinc-400">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: `rgb(${r * 255}, ${g * 255}, ${b * 255})` }}
              />
              C{c.id} · {c.size}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function FeatureLegend() {
  return (
    <div className="mt-3">
      <p className="mb-1 text-[10px] uppercase tracking-wider text-zinc-500">Category colors</p>
      <ul className="space-y-0.5">
        {Object.entries(CATEGORY_PALETTE).map(([name, [r, g, b]]) => (
          <li key={name} className="flex items-center gap-2 text-[10px] text-zinc-400">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: `rgb(${r * 255}, ${g * 255}, ${b * 255})` }}
            />
            {name}
          </li>
        ))}
      </ul>
    </div>
  );
}
