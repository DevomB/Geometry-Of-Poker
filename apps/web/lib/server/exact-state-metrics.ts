import { extractGeometryFeatures } from "@geometry-of-poker/feature-engine";
import type { ExactRunoutMetrics } from "@/lib/inspector/resolve-summary";

export function computeExactRunoutMetrics(input: {
  hero: [string, string];
  board: string[];
}): ExactRunoutMetrics {
  const extracted = extractGeometryFeatures(
    {
      hero: input.hero,
      board: input.board,
    },
    { mode: "compact", exactFeatureBudget: "full" },
  );

  return {
    ...extracted.groups.runouts,
    ...extracted.groups.vulnerability,
  };
}
