import type { StreetDataset } from "@/lib/types";

export interface AtlasMetric {
  id: string;
  label: string;
  min: number;
  q25: number;
  median: number;
  q75: number;
  max: number;
  format: "percent" | "decimal";
}

export interface AtlasSlice {
  id: string;
  label: string;
  count: number;
  share: number;
}

export interface StreetAtlas {
  count: number;
  metrics: AtlasMetric[];
  categories: AtlasSlice[];
  clusters: AtlasSlice[];
}

export function computeStreetAtlas(dataset: StreetDataset): StreetAtlas {
  const categories = new Map<string, number>();
  const clusters = new Map<number, number>();

  for (const point of dataset.metadata) {
    categories.set(point.category, (categories.get(point.category) ?? 0) + 1);
    clusters.set(point.clusterId, (clusters.get(point.clusterId) ?? 0) + 1);
  }

  return {
    count: dataset.count,
    metrics: [
      metricFromChannel("equity", "Equity", dataset.channels.equity, "percent"),
      metricFromChannel("pNuts", "pNuts", dataset.channels.pNuts, "decimal"),
      metricFromChannel("equityVariance", "Volatility", dataset.channels.equityVariance, "decimal"),
      metricFromChannel("boardConnectivity", "Connectivity", dataset.channels.boardConnectivity, "decimal"),
    ].filter((metric): metric is AtlasMetric => metric !== null),
    categories: slicesFromMap(categories, dataset.count, humanCategory),
    clusters: slicesFromMap(clusters, dataset.count, (id) => (id >= 0 ? `C${id}` : "noise")),
  };
}

export function quantile(sortedValues: readonly number[], q: number): number {
  if (sortedValues.length === 0) return 0;
  if (sortedValues.length === 1) return sortedValues[0]!;
  const clamped = Math.max(0, Math.min(1, q));
  const position = (sortedValues.length - 1) * clamped;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sortedValues[lower]!;
  const weight = position - lower;
  return sortedValues[lower]! * (1 - weight) + sortedValues[upper]! * weight;
}

export function formatAtlasValue(value: number, format: AtlasMetric["format"]): string {
  if (format === "percent") return `${(value * 100).toFixed(1)}%`;
  return value.toFixed(3);
}

function metricFromChannel(
  id: string,
  label: string,
  channel: ArrayLike<number>,
  format: AtlasMetric["format"],
): AtlasMetric | null {
  const values: number[] = [];
  for (let i = 0; i < channel.length; i++) {
    const value = channel[i];
    if (typeof value === "number" && Number.isFinite(value)) values.push(value);
  }
  if (values.length === 0 || values.every((value) => value === 0)) return null;
  values.sort((a, b) => a - b);
  return {
    id,
    label,
    min: values[0]!,
    q25: quantile(values, 0.25),
    median: quantile(values, 0.5),
    q75: quantile(values, 0.75),
    max: values[values.length - 1]!,
    format,
  };
}

function slicesFromMap<T>(
  counts: Map<T, number>,
  total: number,
  labelFor: (id: T) => string,
): AtlasSlice[] {
  return [...counts.entries()]
    .map(([id, count]) => ({
      id: String(id),
      label: labelFor(id),
      count,
      share: total > 0 ? count / total : 0,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function humanCategory(name: string): string {
  return name.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}
