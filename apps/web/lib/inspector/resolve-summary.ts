import type { BrowserChannels } from "@/lib/artifacts/parse-channels-bin";
import type { PointSummary } from "@/lib/types";

export interface ExactRunoutMetrics {
  equityMean?: number;
  equityVariance?: number;
  equityP05?: number;
  equityP50?: number;
  equityP95?: number;
  equityRunoutAvailable?: number;
  pNuts?: number;
  pDominated?: number;
  runoutVulnerabilityAvailable?: number;
}

export function isFeatureAvailable(value: number | undefined): boolean {
  return typeof value === "number" && Number.isFinite(value) && value > 0.5;
}

export function enrichSummaryFromChannels(
  summary: PointSummary,
  index: number,
  channels: BrowserChannels,
): PointSummary {
  const pNuts = summary.pNuts ?? channels.pNuts[index];
  const equityVariance = summary.equityVariance ?? channels.equityVariance[index];
  return {
    ...summary,
    ...(pNuts !== undefined ? { pNuts } : {}),
    ...(equityVariance !== undefined ? { equityVariance } : {}),
  };
}

export function needsExactRunoutMetrics(
  summary: PointSummary,
  boardLength: number,
): { runouts: boolean; vulnerability: boolean } {
  return {
    runouts: boardLength <= 3 && !isFeatureAvailable(summary.equityRunoutAvailable),
    vulnerability:
      boardLength >= 3 &&
      boardLength <= 4 &&
      !isFeatureAvailable(summary.runoutVulnerabilityAvailable),
  };
}

export function mergeExactRunoutMetrics(
  summary: PointSummary,
  exact: ExactRunoutMetrics | null,
): PointSummary {
  if (!exact) return summary;
  return { ...summary, ...exact };
}

export function isEquityVarianceDefined(boardLength: number): boolean {
  return boardLength <= 3;
}

export function isVulnerabilityDefined(boardLength: number): boolean {
  return boardLength >= 3 && boardLength <= 4;
}
