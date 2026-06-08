import type { StreetDataset } from "@/lib/types";

export interface ClusterMetricDelta {
  id: string;
  label: string;
  clusterMean: number;
  streetMean: number;
  delta: number;
  format: "percent" | "decimal";
}

export interface ClusterCategoryShare {
  label: string;
  count: number;
  share: number;
}

export interface ClusterProfile {
  label: string;
  count: number;
  share: number;
  metrics: ClusterMetricDelta[];
  categories: ClusterCategoryShare[];
}

export function computeClusterProfile(
  dataset: StreetDataset,
  selectedIndex: number,
): ClusterProfile | null {
  const point = dataset.metadata[selectedIndex];
  if (!point) return null;

  const indices: number[] = [];
  for (let i = 0; i < dataset.metadata.length; i++) {
    if (dataset.metadata[i]!.clusterId === point.clusterId) indices.push(i);
  }
  if (indices.length === 0) return null;

  const categoryCounts = new Map<string, number>();
  for (const i of indices) {
    const category = dataset.metadata[i]!.category;
    categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
  }

  return {
    label: point.clusterId >= 0 ? `C${point.clusterId}` : "noise",
    count: indices.length,
    share: safeShare(indices.length, dataset.count),
    metrics: [
      metricDelta("equity", "Equity", dataset.channels.equity, indices, "percent"),
      metricDelta("pNuts", "pNuts", dataset.channels.pNuts, indices, "decimal"),
      metricDelta("equityVariance", "Volatility", dataset.channels.equityVariance, indices, "decimal"),
      metricDelta("boardConnectivity", "Connectivity", dataset.channels.boardConnectivity, indices, "decimal"),
    ].filter((metric): metric is ClusterMetricDelta => metric !== null),
    categories: [...categoryCounts.entries()]
      .map(([label, count]) => ({
        label,
        count,
        share: safeShare(count, indices.length),
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
  };
}

export function mean(values: ArrayLike<number>, indices?: readonly number[]): number | null {
  let sum = 0;
  let count = 0;
  const source = indices ?? Array.from({ length: values.length }, (_, i) => i);

  for (const i of source) {
    const value = values[i];
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    sum += value;
    count++;
  }

  return count > 0 ? sum / count : null;
}

export function formatDelta(value: number, format: ClusterMetricDelta["format"]): string {
  const sign = value >= 0 ? "+" : "";
  if (format === "percent") return `${sign}${(value * 100).toFixed(1)} pp`;
  return `${sign}${value.toFixed(3)}`;
}

function metricDelta(
  id: string,
  label: string,
  channel: ArrayLike<number>,
  indices: readonly number[],
  format: ClusterMetricDelta["format"],
): ClusterMetricDelta | null {
  if (isAllZero(channel)) return null;
  const clusterMean = mean(channel, indices);
  const streetMean = mean(channel);
  if (clusterMean === null || streetMean === null) return null;
  return {
    id,
    label,
    clusterMean,
    streetMean,
    delta: clusterMean - streetMean,
    format,
  };
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

function safeShare(count: number, total: number) {
  return total > 0 ? count / total : 0;
}
