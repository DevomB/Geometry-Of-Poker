import type { BrowserPointMeta, ManualMarker } from "@/lib/types";

export interface ManualStateComparison {
  equityDelta: number | null;
  categoryMatch: boolean | null;
  clusterMatch: boolean | null;
  neighborRank: number | null;
  neighborDistance: number | null;
  sharedCards: number;
  totalManualCards: number;
}

function numberMetric(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringMetric(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function cardSet(cards: string[]) {
  return new Set(cards.map((card) => `${card[0]?.toUpperCase() ?? ""}${card[1]?.toLowerCase() ?? ""}`));
}

export function compareManualToPoint(
  marker: ManualMarker,
  point: BrowserPointMeta,
): ManualStateComparison {
  const manualEquity = numberMetric(marker.features.equityVsRandom);
  const manualCategory = stringMetric(marker.features.category);
  const neighborIndex = marker.neighborIds.indexOf(point.id);
  const manualCards = [...marker.hero, ...marker.board];
  const pointCards = cardSet([...point.hero, ...point.board]);

  let sharedCards = 0;
  for (const card of cardSet(manualCards)) {
    if (pointCards.has(card)) sharedCards++;
  }

  return {
    equityDelta: manualEquity === null ? null : point.equityVsRandom - manualEquity,
    categoryMatch: manualCategory === null ? null : point.category === manualCategory,
    clusterMatch:
      marker.clusterId === null || point.clusterId < 0
        ? null
        : point.clusterId === marker.clusterId,
    neighborRank: neighborIndex >= 0 ? neighborIndex + 1 : null,
    neighborDistance:
      neighborIndex >= 0 ? marker.neighborDistances[neighborIndex] ?? null : null,
    sharedCards,
    totalManualCards: manualCards.length,
  };
}
