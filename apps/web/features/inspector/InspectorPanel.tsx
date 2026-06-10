"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useViewerStore } from "@/stores/viewer-store";
import { CardDisplay } from "@/components/CardDisplay";
import { MethodologyPanel } from "@/components/MethodologyPanel";
import {
  compareManualToPoint,
  countBlockerCollisions,
  summarizeBlockerNeighbors,
} from "@/lib/inspector/state-comparison";
import {
  computeClusterProfile,
  formatDelta,
  type ClusterProfile,
} from "@/lib/inspector/cluster-profile";
import {
  computePopulationStanding,
  formatPercentile,
  type PopulationStanding,
} from "@/lib/inspector/population-standing";
import { computeRemovalPressure } from "@/lib/inspector/removal-pressure";
import { computeCategoryTransitionSummary } from "@/lib/inspector/category-transition";
import { computeRunoutDistribution } from "@/lib/inspector/runout-distribution";
import {
  enrichSummaryFromChannels,
  isEquityVarianceDefined,
  isFeatureAvailable,
  isVulnerabilityDefined,
  mergeExactRunoutMetrics,
} from "@/lib/inspector/resolve-summary";
import { useExactRunoutMetrics } from "@/lib/inspector/use-exact-runout-metrics";
import { computeDrawPressure } from "@/lib/inspector/draw-pressure";
import {
  computeStateCombinatorics,
  formatBigInt,
} from "@/lib/poker/combinatorics";
import type {
  BrowserPointMeta,
  ManualMarker,
  PointSummary,
  StreetDataset,
} from "@/lib/types";
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

      {point && dataset ? (
        <SelectedStateCard
          point={point}
          index={selectedIndex!}
          dataset={dataset}
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
  const dataset = useViewerStore((s) => s.dataset);
  const equity = numberMetric(marker.features.equityVsRandom);
  const category = stringMetric(marker.features.category);
  const math = computeStateCombinatorics({
    hero: marker.hero,
    board: marker.board,
    deadCards: marker.deadCards,
  });
  const nearestDistance = marker.neighborDistances[0];
  const distanceLabel =
    marker.method === "pca-knn-interpolation" ? "Nearest PCA d" : "Nearest 3D d";
  const locality = summarizeProjectionLocality(marker.method, marker.neighborDistances);
  const blockerNeighborSummary = computeBlockerNeighborSummary(marker, dataset);
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
        {marker.deadCards.length > 0 && (
          <CardDisplay cards={marker.deadCards} label="Dead" />
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
        {marker.deadCards.length > 0 && (
          <Row label="Dead cards" value={String(marker.deadCards.length)} mono />
        )}
        <Row label="Live deck" value={String(math.remainingCards)} mono />
        <Row
          label="Villain hands"
          value={formatBigInt(math.legalVillainHands)}
          mono
          title="C(52 - hero - board - dead, 2)"
        />
        <Row
          label="Terminal leaves"
          value={formatBigInt(math.terminalLeaves)}
          mono
          title="Villain hand choices multiplied by public-board completions"
        />
        {marker.deadCards.length > 0 && math.terminalLeafFractionOfNoDead !== null && (
          <Row
            label="Leaf fraction"
            value={formatPercent(math.terminalLeafFractionOfNoDead)}
            mono
            title="Dead-card-conditioned leaves divided by the no-dead leaf count"
          />
        )}
        {marker.deadCards.length > 0 && (
          <Row
            label="Removed leaves"
            value={formatBigInt(math.removedTerminalLeavesByDeadCards)}
            mono
            title="No-dead terminal leaves minus dead-card-conditioned terminal leaves"
          />
        )}
        {marker.deadCards.length > 0 && (
          <Row
            label="Removed states"
            value={formatBigInt(math.removedStreetStatesByDeadCards)}
            mono
            title="No-dead street states minus dead-card-conditioned street states"
          />
        )}
        {blockerNeighborSummary && (
          <Row
            label="Compatible NN"
            value={`${blockerNeighborSummary.compatible}/${blockerNeighborSummary.total}`}
            mono
            title="Nearest reference points that do not use a manual dead card"
          />
        )}
        {blockerNeighborSummary?.compatibleWeightShare !== null &&
          blockerNeighborSummary?.compatibleWeightShare !== undefined && (
            <Row
              label="Compatible w"
              value={formatPercent(blockerNeighborSummary.compatibleWeightShare)}
              mono
              title="Inverse-distance projection weight share from blocker-compatible references"
            />
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
        {marker.deadCards.length > 0
          ? " Dead cards constrain the live deck before villain hands and runouts are counted."
          : ""}
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
        const blockerCollisions =
          point && marker.deadCards.length > 0
            ? countBlockerCollisions(marker.deadCards, [...point.hero, ...point.board])
            : null;
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
                  {blockerCollisions !== null && (
                    <span
                      className={
                        blockerCollisions === 0
                          ? "ml-1 text-emerald-300/70"
                          : "ml-1 text-rose-300/80"
                      }
                    >
                      {blockerCollisions === 0
                        ? "compatible"
                        : `blocked x${blockerCollisions}`}
                    </span>
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
  dataset,
  manualMarker,
  neighborFocusActive,
  onToggleNeighborFocus,
}: {
  point: BrowserPointMeta;
  index: number;
  dataset: StreetDataset;
  manualMarker: ManualMarker | null;
  neighborFocusActive: boolean;
  onToggleNeighborFocus: () => void;
}) {
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const standing = useMemo(
    () => computePopulationStanding(dataset, index),
    [dataset, index],
  );
  const clusterProfile = useMemo(
    () => computeClusterProfile(dataset, index),
    [dataset, index],
  );
  const baseSummary = useMemo(
    () => enrichSummaryFromChannels(point.summary, index, dataset.channels),
    [point.summary, index, dataset.channels],
  );
  const { exact, loading: exactLoading, error: exactError } = useExactRunoutMetrics(
    point,
    dataset.street,
    baseSummary,
  );
  const resolvedSummary = useMemo(
    () => mergeExactRunoutMetrics(baseSummary, exact),
    [baseSummary, exact],
  );

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

      <KeyMetrics
        point={point}
        summary={resolvedSummary}
        exactLoading={exactLoading}
        exactError={exactError}
      />

      <RunoutDistributionSection summary={resolvedSummary} />

      {standing && <PopulationStandingSection standing={standing} />}

      {clusterProfile && <ClusterProfileSection profile={clusterProfile} />}

      <CombinatoricsSection point={point} dataset={dataset} />

      {manualMarker && (
        <ManualComparisonCard marker={manualMarker} point={point} />
      )}

      <BoardTextureSection point={point} />

      <DrawsSection point={point} />

      <RemovalPressureSection point={point} />

      <CategoryTransitionSection point={point} />

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

function ClusterProfileSection({ profile }: { profile: ClusterProfile }) {
  return (
    <div className="rounded border border-sky-300/20 bg-sky-500/[0.035] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-[0.18em] text-sky-200/80">
          Cluster profile
        </p>
        <span className="gop-mono text-[10px] tabular-nums text-sky-300/70">
          {profile.label} {formatShare(profile.share)}
        </span>
      </div>

      <div className="space-y-1.5">
        {profile.metrics.map((metric) => (
          <div
            key={metric.id}
            className="rounded border border-white/[0.06] bg-black/10 px-2 py-1.5"
            title={`Cluster mean ${metric.clusterMean.toFixed(4)} vs street mean ${metric.streetMean.toFixed(4)}`}
          >
            <div className="flex items-center justify-between gap-2 text-[10px]">
              <span className="text-zinc-500">{metric.label}</span>
              <span
                className={`gop-mono tabular-nums ${
                  metric.delta >= 0 ? "text-emerald-300/80" : "text-rose-300/80"
                }`}
              >
                {formatDelta(metric.delta, metric.format)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-2 text-[9px] text-zinc-600">
              <span className="gop-mono tabular-nums">
                cluster {formatClusterMetric(metric.clusterMean, metric.format)}
              </span>
              <span className="gop-mono tabular-nums">
                street {formatClusterMetric(metric.streetMean, metric.format)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {profile.categories.length > 0 && (
        <div className="mt-3 border-t border-sky-300/15 pt-2">
          <p className="mb-1 text-[10px] uppercase tracking-wider text-sky-200/70">
            Category mix
          </p>
          <div className="space-y-1">
            {profile.categories.slice(0, 4).map((category) => (
              <div key={category.label}>
                <div className="mb-0.5 flex items-center justify-between text-[10px]">
                  <span className="truncate text-zinc-400">
                    {humanCategory(category.label)}
                  </span>
                  <span className="gop-mono tabular-nums text-zinc-500">
                    {formatShare(category.share)}
                  </span>
                </div>
                <div className="h-1 overflow-hidden rounded bg-white/[0.06]">
                  <div
                    className="h-full rounded bg-sky-300/60"
                    style={{ width: `${Math.max(3, category.share * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function computeBlockerNeighborSummary(
  marker: ManualMarker,
  dataset: StreetDataset | null,
): ReturnType<typeof summarizeBlockerNeighbors> {
  if (!dataset || marker.deadCards.length === 0) return null;
  const references = marker.neighborIds.flatMap((id, i) => {
    const idx = dataset.idToIndex.get(id);
    const point = idx !== undefined ? dataset.metadata[idx] : undefined;
    if (!point) return [];
    return [
      {
        cards: [...point.hero, ...point.board],
        distance: marker.neighborDistances[i] ?? null,
      },
    ];
  });
  return summarizeBlockerNeighbors(marker.deadCards, references);
}

function PopulationStandingSection({
  standing,
}: {
  standing: PopulationStanding;
}) {
  return (
    <div className="rounded border border-violet-300/20 bg-violet-500/[0.035] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-[0.18em] text-violet-200/80">
          Population standing
        </p>
        <span className="gop-mono text-[10px] tabular-nums text-violet-300/70">
          n={standing.streetCount.toLocaleString()}
        </span>
      </div>

      <div className="space-y-2">
        {standing.metrics.map((metric) => (
          <div key={metric.id} title={metric.detail}>
            <div className="mb-0.5 flex items-center justify-between gap-2 text-[10px]">
              <span className="text-zinc-500">{metric.label}</span>
              <span className="gop-mono tabular-nums text-zinc-300">
                {formatPercentile(metric.percentile)}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded bg-white/[0.06]">
              <div
                className="h-full rounded bg-violet-300/70"
                style={{ width: `${Math.max(3, metric.percentile * 100)}%` }}
              />
            </div>
            <div className="mt-0.5 text-right gop-mono text-[9px] tabular-nums text-zinc-600">
              {formatStandingValue(metric.value, metric.format)}
            </div>
          </div>
        ))}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-0.5 border-t border-violet-300/15 pt-2 text-[10px]">
        <Row
          label="Category share"
          value={`${humanCategory(standing.category.label)} ${formatShare(standing.category.share)}`}
        />
        <Row
          label="Category n"
          value={standing.category.count.toLocaleString()}
          mono
        />
        <Row
          label="Cluster share"
          value={`${standing.cluster.label} ${formatShare(standing.cluster.share)}`}
        />
        <Row
          label="Cluster n"
          value={standing.cluster.count.toLocaleString()}
          mono
        />
      </dl>
    </div>
  );
}

function CombinatoricsSection({
  point,
  dataset,
}: {
  point: BrowserPointMeta;
  dataset: StreetDataset;
}) {
  const math = computeStateCombinatorics({
    hero: point.hero,
    board: point.board,
    equityVsRandom: point.equityVsRandom,
    summary: point.summary,
  });

  return (
    <div className="rounded border border-emerald-300/20 bg-emerald-500/[0.035] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-200/80">
          Exact combinatorics
        </p>
        <Link
          href="/research/combinatorial-proofs"
          className="text-[10px] text-emerald-300/70 transition hover:text-emerald-200"
        >
          Proof notes
        </Link>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
        <Row label="Known cards" value={`${math.knownCards}/52`} mono />
        <Row label="Remaining deck" value={String(math.remainingCards)} mono />
        <Row
          label="Street universe"
          value={formatBigInt(math.streetStateUniverse)}
          mono
          title="C(52, 2) * C(50, board cards)"
        />
        <Row
          label="Sample coverage"
          value={formatCoverage(dataset.count, math.streetStateUniverse)}
          mono
          title="Loaded point count divided by the exact hero-centric street universe"
        />
        <Row
          label="Hero-fixed boards"
          value={formatBigInt(math.heroFixedPublicBoards)}
          mono
          title="C(50, board cards), holding this two-card hero hand fixed"
        />
        <Row
          label="Board-fixed heroes"
          value={formatBigInt(math.boardFixedHeroHands)}
          mono
          title="C(52 - board cards, 2), holding this public board fixed"
        />
        <Row
          label="Villain hands"
          value={formatBigInt(math.legalVillainHands)}
          mono
          title="C(52 - known cards, 2)"
        />
        <Row
          label="Runout cards"
          value={String(math.runoutCardsToRiver)}
          mono
          title="Cards still needed to reach the river"
        />
        {math.nextStreetCardsToDeal !== null &&
          math.nextStreetPublicContinuations !== null && (
            <Row
              label="Next-street branches"
              value={formatBigInt(math.nextStreetPublicContinuations)}
              mono
              title={`C(remaining deck, ${math.nextStreetCardsToDeal})`}
            />
          )}
        <Row
          label="Runouts/villain"
          value={formatBigInt(math.publicRunoutsAfterVillain)}
          mono
          title="C(remaining cards after villain, cards to river)"
        />
        <Row
          label="Terminal leaves"
          value={formatBigInt(math.terminalLeaves)}
          mono
          title="Villain hand choices multiplied by public-board completions"
        />
        {math.improvementProbability !== null && (
          <Row
            label="Improve next"
            value={formatPercent(math.improvementProbability)}
            mono
            title="Exact one-card odds from enumerated improvement outs"
          />
        )}
        {math.cleanImprovementProbability !== null && (
          <Row
            label="Clean improve"
            value={formatPercent(math.cleanImprovementProbability)}
            mono
            title="Improvement odds excluding known villain leapfrog cards when available"
          />
        )}
        {math.flushOutCount !== null && math.flushOutCount > 0 && (
          <Row label="Flush outs" value={String(math.flushOutCount)} mono />
        )}
        {math.straightOutCount !== null && math.straightOutCount > 0 && (
          <Row label="Straight outs" value={String(math.straightOutCount)} mono />
        )}
        {math.equityLeafStandardError !== null && (
          <Row
            label="Leaf-scale SE"
            value={`${(math.equityLeafStandardError * 100).toFixed(3)} pp`}
            mono
            title="Binomial-equivalent standard error over terminal leaves; exact engine equity is not a Monte Carlo estimate"
          />
        )}
      </dl>
      <p className="mt-2 border-t border-emerald-300/15 pt-2 text-[10px] leading-relaxed text-emerald-100/65">
        These counts are pure deck combinatorics. The street universe measures
        sampling coverage; the villain/runout leaves define the exact equity
        enumeration under the documented uniform-villain assumption.
      </p>
    </div>
  );
}

function formatMetricValue(
  value: number | undefined,
  loading: boolean,
  available: boolean,
  format: (n: number) => string,
): string {
  if (loading && !available) return "…";
  if (typeof value === "number" && Number.isFinite(value) && available) {
    return format(value);
  }
  return "—";
}

function KeyMetrics({
  point,
  summary,
  exactLoading,
  exactError,
}: {
  point: BrowserPointMeta;
  summary: PointSummary;
  exactLoading: boolean;
  exactError: string | null;
}) {
  const eq = point.equityVsRandom;
  const boardLength = point.board.length;
  const showEquityVariance = isEquityVarianceDefined(boardLength);
  const showVulnerability = isVulnerabilityDefined(boardLength);
  const runoutReady = isFeatureAvailable(summary.equityRunoutAvailable);
  const vulnerabilityReady = isFeatureAvailable(summary.runoutVulnerabilityAvailable);

  return (
    <div className="space-y-2">
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
        {showEquityVariance && (
          <Metric
            label="Equity variance"
            value={formatMetricValue(
              summary.equityVariance,
              exactLoading,
              runoutReady,
              (n) => n.toFixed(4),
            )}
            mono
            title="Spread of equity across hypothetical runouts"
          />
        )}
        {showVulnerability && (
          <>
            <Metric
              label="pNuts"
              value={formatMetricValue(
                summary.pNuts,
                exactLoading,
                vulnerabilityReady,
                (n) => n.toFixed(3),
              )}
              mono
              title="Probability of being the nuts"
            />
            <Metric
              label="pDominated"
              value={formatMetricValue(
                summary.pDominated,
                exactLoading,
                vulnerabilityReady,
                (n) => n.toFixed(3),
              )}
              mono
              title="Probability of being dominated"
            />
          </>
        )}
      </div>
      {exactError && (showEquityVariance || showVulnerability) && (
        <p className="text-[10px] leading-relaxed text-rose-300/80" title={exactError}>
          Exact runout metrics unavailable: {exactError}
        </p>
      )}
    </div>
  );
}

function RunoutDistributionSection({ summary }: { summary: PointSummary }) {
  const runout = computeRunoutDistribution(summary);
  if (!runout) return null;

  return (
    <div className="rounded border border-amber-300/20 bg-amber-500/[0.035] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-[0.18em] text-amber-200/80">
          Runout distribution
        </p>
        <span className="gop-mono text-[10px] tabular-nums text-amber-300/70">
          exact
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
        {runout.hasRunoutQuantiles && (
          <>
            <Row label="Mean" value={formatPercent(runout.mean)} mono />
            <Row label="Median" value={formatPercent(runout.median)} mono />
            <Row label="P05" value={formatPercent(runout.p05)} mono />
            <Row label="P95" value={formatPercent(runout.p95)} mono />
            <Row
              label="P05-P95 width"
              value={`${(runout.intervalWidth * 100).toFixed(2)} pp`}
              mono
              title="equityP95 - equityP05"
            />
            <Row
              label="Tail skew"
              value={`${formatSignedPercent(runout.tailSkew)} pp`}
              mono
              title="(equityP95 - equityP50) - (equityP50 - equityP05)"
            />
          </>
        )}
        {runout.vulnerability && (
          <>
            <Row label="pNuts" value={formatPercent(runout.vulnerability.pNuts)} mono />
            <Row
              label="pDominated"
              value={formatPercent(runout.vulnerability.pDominated)}
              mono
            />
            <Row
              label="Nuts edge"
              value={`${formatSignedPercent(runout.vulnerability.edge)} pp`}
              mono
              title="pNuts - pDominated"
            />
          </>
        )}
      </dl>
      <p className="mt-2 border-t border-amber-300/15 pt-2 text-[10px] leading-relaxed text-amber-100/65">
        Exact runout quantiles come from the engine. The viewer derives width =
        P95 - P05, tail skew = (P95 - P50) - (P50 - P05), and nuts edge =
        pNuts - pDominated.
      </p>
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
  const math = computeStateCombinatorics({
    hero: point.hero,
    board: point.board,
    summary: point.summary,
  });
  const pressure =
    math.nextCardUniverse === null
      ? null
      : computeDrawPressure(point.summary, math.nextCardUniverse);
  if (!pressure) return null;

  return (
    <div className="rounded border border-[var(--border-subtle)] bg-white/[0.02] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          Draw pressure
        </p>
        {pressure.drawClass && (
          <span className="gop-mono text-[10px] text-zinc-400">
            {pressure.drawClass}
          </span>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
        <Row
          label="Improve outs"
          value={`${pressure.improvementOuts}/${pressure.unseenCardCount}`}
          mono
          title="Exact count of next cards that strictly improve hand strength"
        />
        <Row
          label="Improve next"
          value={formatPercent(pressure.improvementProbability)}
          mono
          title="improvementOutCount divided by the unseen next-card deck"
        />
        <Row
          label="Clean outs"
          value={`${pressure.cleanImprovementOuts}/${pressure.unseenCardCount}`}
          mono
          title="Improvement outs that do not trigger a known villain leapfrog"
        />
        <Row
          label="Clean next"
          value={formatPercent(pressure.cleanImprovementProbability)}
          mono
          title="cleanImprovementOutCount divided by the unseen next-card deck"
        />
        {pressure.dirtyImprovementOuts > 0 && (
          <Row
            label="Dirty outs"
            value={`${pressure.dirtyImprovementOuts}/${pressure.unseenCardCount}`}
            mono
            title="Improvement outs minus clean improvement outs"
          />
        )}
        {pressure.dirtyImprovementOuts > 0 && (
          <Row
            label="Dirty next"
            value={formatPercent(pressure.dirtyImprovementProbability)}
            mono
            title="Dirty improvement outs divided by the unseen next-card deck"
          />
        )}
        <Row
          label="Blank cards"
          value={`${pressure.blankCards}/${pressure.unseenCardCount}`}
          mono
          title="Unseen next cards that are not improvement outs"
        />
        <Row
          label="Miss next"
          value={formatPercent(pressure.blankProbability)}
          mono
          title="1 minus the exact next-card improvement probability"
        />
        {pressure.flushOuts > 0 && (
          <Row label="Flush outs" value={String(pressure.flushOuts)} mono />
        )}
        {pressure.straightOuts > 0 && (
          <Row label="Straight outs" value={String(pressure.straightOuts)} mono />
        )}
        {pressure.comboDraw && (
          <Row
            label="Combo draw"
            value="yes"
            title="Both flush and straight pressure are present in the exact draw summary"
          />
        )}
      </dl>
      <p className="mt-2 border-t border-[var(--border-subtle)] pt-2 text-[10px] leading-relaxed text-zinc-500">
        Exact one-card odds use P = outs / r over the unseen next-card deck.
        Dirty outs are improvement outs outside the clean subset; blanks are the
        complement r - improvementOutCount.
      </p>
    </div>
  );
}

function RemovalPressureSection({ point }: { point: BrowserPointMeta }) {
  const math = computeStateCombinatorics({
    hero: point.hero,
    board: point.board,
  });
  const pressure = computeRemovalPressure(point.summary, math.remainingCards);
  if (!pressure) return null;

  return (
    <div className="rounded border border-rose-300/20 bg-rose-500/[0.035] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-[0.18em] text-rose-200/80">
          Card-removal pressure
        </p>
        <span className="gop-mono text-[10px] tabular-nums text-rose-300/70">
          n={pressure.activeCardCount ?? "-"}
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
        <Row label="L1 mass" value={pressure.l1.toFixed(4)} mono title="sum |g_c|" />
        <Row label="L2 norm" value={pressure.l2.toFixed(4)} mono title="sqrt(sum g_c^2)" />
        <Row
          label="Concentration"
          value={pressure.concentration.toFixed(3)}
          mono
          title="L2 / L1, bounded above by 1 for nonzero gradients"
        />
        {pressure.uniformConcentrationFloor !== null && (
          <Row
            label="Uniform floor"
            value={pressure.uniformConcentrationFloor.toFixed(3)}
            mono
            title="1 / sqrt(active unseen cards)"
          />
        )}
        <Row
          label="Signed mass"
          value={formatSignedDecimal(pressure.signedMass)}
          mono
          title="positive mass minus negative mass"
        />
        <Row label="Positive" value={pressure.positiveMass.toFixed(4)} mono />
        <Row label="Negative" value={pressure.negativeMass.toFixed(4)} mono />
        <Row label="Mean" value={pressure.mean.toFixed(4)} mono />
        <Row label="Std dev" value={pressure.stdDev.toFixed(4)} mono />
        <Row label="Min / max" value={`${pressure.min.toFixed(4)} / ${pressure.max.toFixed(4)}`} mono />
      </dl>
      <p className="mt-2 border-t border-rose-300/15 pt-2 text-[10px] leading-relaxed text-rose-100/65">
        Engine gradient vector g is summarized over active unseen cards:
        ||g||1 = sum |g_c|, ||g||2 = sqrt(sum g_c^2), and signed mass =
        sum(g_c &gt; 0) - sum(|g_c| for g_c &lt; 0). Cauchy gives
        1/sqrt(n) &lt;= ||g||2 / ||g||1 &lt;= 1 when ||g||1 &gt; 0.
      </p>
    </div>
  );
}

function CategoryTransitionSection({ point }: { point: BrowserPointMeta }) {
  const transition = computeCategoryTransitionSummary(point.summary);
  if (!transition) return null;

  return (
    <div className="rounded border border-cyan-300/20 bg-cyan-500/[0.035] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-200/80">
          Category transition
        </p>
        <span className="gop-mono text-[10px] tabular-nums text-cyan-300/70">
          9x9 exact
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
        <Row label="Entropy H" value={transition.entropy.toFixed(3)} mono />
        <Row
          label="H / log 81"
          value={formatPercent(transition.normalizedEntropy)}
          mono
          title="Normalized entropy over the 9 by 9 turn-river category matrix"
        />
        <Row label="Max cell" value={formatPercent(transition.maxProbability)} mono />
        <Row label="Stay same" value={formatPercent(transition.diagonalMass)} mono />
        <Row label="Upgrade" value={formatPercent(transition.upgradeMass)} mono />
        <Row label="Downgrade" value={formatPercent(transition.downgradeMass)} mono />
        <Row
          label="Upgrade edge"
          value={`${formatSignedPercent(transition.directionalMass)} pp`}
          mono
          title="Upgrade mass minus downgrade mass"
        />
        <Row
          label="River pair+"
          value={formatPercent(transition.riverPairOrBetterMass)}
          mono
        />
        <Row
          label="River flush+"
          value={formatPercent(transition.riverFlushOrBetterMass)}
          mono
        />
      </dl>
      <p className="mt-2 border-t border-cyan-300/15 pt-2 text-[10px] leading-relaxed text-cyan-100/65">
        The engine supplies a probability matrix p_ij for turn category i and
        river category j. H = -sum p_ij log(p_ij), H/log(81) lies in [0, 1],
        and upgrade edge = sum(j &gt; i)p_ij - sum(j &lt; i)p_ij.
      </p>
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

function formatSignedDecimal(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(4)}`;
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function formatShare(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatCoverage(sampleCount: number, universe: bigint) {
  const total = Number(universe);
  if (!Number.isFinite(total) || total <= 0) return "-";
  const pct = (sampleCount / total) * 100;
  if (pct > 0 && pct < 0.001) return "<0.001%";
  return `${pct.toFixed(3)}%`;
}

function formatStandingValue(value: number, format: "percent" | "decimal") {
  if (format === "percent") return `${(value * 100).toFixed(2)}%`;
  return value.toFixed(4);
}

function formatClusterMetric(value: number, format: "percent" | "decimal") {
  if (format === "percent") return `${(value * 100).toFixed(1)}%`;
  return value.toFixed(3);
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
        {comparison.blockerCompatible !== null && (
          <Row
            label="Blockers"
            value={
              comparison.blockerCompatible
                ? "compatible"
                : `${comparison.deadCardCollisions} collision${comparison.deadCardCollisions === 1 ? "" : "s"}`
            }
            title="A blocker collision means this reference point uses a manual dead card"
          />
        )}
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
