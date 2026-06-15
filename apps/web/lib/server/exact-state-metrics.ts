import { getPokerCalculations } from "@geometry-of-poker/feature-engine";
import type { ExactRunoutMetrics } from "@/lib/inspector/resolve-summary";

export function computeExactRunoutMetrics(input: {
  hero: [string, string];
  board: string[];
  deadCards?: string[];
}): ExactRunoutMetrics {
  const pc = getPokerCalculations();
  const metrics: ExactRunoutMetrics = {};

  if (input.board.length <= 3) {
    const q = pc.exactHeroEquityRunoutQuantiles(input.hero, input.board);
    metrics.equityMean = q.mean;
    metrics.equityVariance = q.variance;
    metrics.equityP05 = q.p05;
    metrics.equityP50 = q.p50;
    metrics.equityP95 = q.p95;
    metrics.equityRunoutAvailable = 1;
  }

  if (input.board.length >= 3 && input.board.length <= 4) {
    const v = pc.exactHeroRunoutVulnerability(
      input.hero,
      input.board,
      input.deadCards ?? [],
    );
    metrics.pNuts = v.pNuts;
    metrics.pDominated = v.pDominated;
    metrics.runoutVulnerabilityAvailable = 1;
  }

  return metrics;
}
