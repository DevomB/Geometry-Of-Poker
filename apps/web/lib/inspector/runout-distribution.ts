import type { PointSummary } from "@/lib/types";

export interface RunoutDistribution {
  hasRunoutQuantiles: boolean;
  mean: number;
  median: number;
  p05: number;
  p95: number;
  intervalWidth: number;
  lowerTailGap: number;
  upperTailGap: number;
  tailSkew: number;
  vulnerability: {
    pNuts: number;
    pDominated: number;
    edge: number;
  } | null;
}

export function computeRunoutDistribution(
  summary: PointSummary,
): RunoutDistribution | null {
  const hasRunouts = isAvailable(summary.equityRunoutAvailable);
  const hasVulnerability = isAvailable(summary.runoutVulnerabilityAvailable);

  if (!hasRunouts && !hasVulnerability) return null;

  const mean = probability(summary.equityMean);
  const median = probability(summary.equityP50);
  const p05 = probability(summary.equityP05);
  const p95 = probability(summary.equityP95);
  const pNuts = probability(summary.pNuts);
  const pDominated = probability(summary.pDominated);

  const vulnerability =
    hasVulnerability && pNuts !== null && pDominated !== null
      ? {
          pNuts,
          pDominated,
          edge: pNuts - pDominated,
        }
      : null;

  if (!hasRunouts || mean === null || median === null || p05 === null || p95 === null) {
    return vulnerability
      ? {
          hasRunoutQuantiles: false,
          mean: 0,
          median: 0,
          p05: 0,
          p95: 0,
          intervalWidth: 0,
          lowerTailGap: 0,
          upperTailGap: 0,
          tailSkew: 0,
          vulnerability,
        }
      : null;
  }

  const lowerTailGap = Math.max(0, median - p05);
  const upperTailGap = Math.max(0, p95 - median);

  return {
    hasRunoutQuantiles: true,
    mean,
    median,
    p05,
    p95,
    intervalWidth: Math.max(0, p95 - p05),
    lowerTailGap,
    upperTailGap,
    tailSkew: upperTailGap - lowerTailGap,
    vulnerability,
  };
}

function isAvailable(value: number | undefined): boolean {
  return typeof value === "number" && Number.isFinite(value) && value > 0.5;
}

function probability(value: number | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(1, value));
}
