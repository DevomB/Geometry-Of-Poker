import type { BrowserPointMeta, StreetDataset } from "@/lib/types";

export interface PercentileStanding {
  id: string;
  label: string;
  value: number;
  percentile: number;
  detail: string;
  format: "percent" | "decimal";
}

export interface PopulationStanding {
  point: BrowserPointMeta;
  streetCount: number;
  metrics: PercentileStanding[];
  category: {
    label: string;
    count: number;
    share: number;
  };
  cluster: {
    label: string;
    count: number;
    share: number;
  };
}

export function computePopulationStanding(
  dataset: StreetDataset,
  index: number,
): PopulationStanding | null {
  const point = dataset.metadata[index];
  if (!point) return null;

  const metrics = [
    metricFromChannel(
      "equity",
      "Equity",
      dataset.channels.equity,
      index,
      "Higher than other sampled states on this street",
      "percent",
    ),
    metricFromChannel(
      "pNuts",
      "pNuts",
      dataset.channels.pNuts,
      index,
      "Probability-of-nuts rank in this street sample",
      "decimal",
    ),
    metricFromChannel(
      "equityVariance",
      "Volatility",
      dataset.channels.equityVariance,
      index,
      "Runout equity variance rank in this street sample",
      "decimal",
    ),
    metricFromChannel(
      "boardConnectivity",
      "Connectivity",
      dataset.channels.boardConnectivity,
      index,
      "Board connectivity rank in this street sample",
      "decimal",
    ),
  ].filter((metric): metric is PercentileStanding => metric !== null);

  const categoryCount = dataset.metadata.reduce(
    (count, p) => count + (p.category === point.category ? 1 : 0),
    0,
  );
  const clusterCount = dataset.metadata.reduce(
    (count, p) => count + (p.clusterId === point.clusterId ? 1 : 0),
    0,
  );

  return {
    point,
    streetCount: dataset.count,
    metrics,
    category: {
      label: point.category,
      count: categoryCount,
      share: safeShare(categoryCount, dataset.count),
    },
    cluster: {
      label: point.clusterId >= 0 ? `C${point.clusterId}` : "noise",
      count: clusterCount,
      share: safeShare(clusterCount, dataset.count),
    },
  };
}

export function percentileRank(values: ArrayLike<number>, index: number): number | null {
  const value = values[index];
  if (typeof value !== "number" || !Number.isFinite(value)) return null;

  let less = 0;
  let equal = 0;
  let finite = 0;

  for (let i = 0; i < values.length; i++) {
    const current = values[i];
    if (typeof current !== "number" || !Number.isFinite(current)) continue;
    finite++;
    if (current < value) less++;
    else if (current === value) equal++;
  }

  if (finite === 0) return null;
  return (less + equal * 0.5) / finite;
}

export function formatPercentile(percentile: number): string {
  const whole = Math.max(0, Math.min(100, Math.round(percentile * 100)));
  const suffix =
    whole % 100 >= 11 && whole % 100 <= 13
      ? "th"
      : whole % 10 === 1
        ? "st"
        : whole % 10 === 2
          ? "nd"
          : whole % 10 === 3
            ? "rd"
            : "th";
  return `${whole}${suffix}`;
}

function metricFromChannel(
  id: string,
  label: string,
  values: ArrayLike<number>,
  index: number,
  detail: string,
  format: PercentileStanding["format"],
): PercentileStanding | null {
  const value = values[index];
  const percentile = percentileRank(values, index);
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    percentile === null ||
    isAllZero(values)
  ) {
    return null;
  }
  return { id, label, value, percentile, detail, format };
}

function isAllZero(values: ArrayLike<number>): boolean {
  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    if (typeof value === "number" && Number.isFinite(value) && value !== 0) {
      return false;
    }
  }
  return true;
}

function safeShare(count: number, total: number): number {
  return total > 0 ? count / total : 0;
}
