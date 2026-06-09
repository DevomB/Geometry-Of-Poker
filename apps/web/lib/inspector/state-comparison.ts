import type { BrowserPointMeta, ManualMarker } from "@/lib/types";

export interface ManualStateComparison {
  equityDelta: number | null;
  categoryMatch: boolean | null;
  clusterMatch: boolean | null;
  neighborRank: number | null;
  neighborDistance: number | null;
  sharedCards: number;
  totalManualCards: number;
  deadCardCollisions: number;
  blockerCompatible: boolean | null;
}

export interface BlockerNeighborReference {
  cards: readonly string[];
  distance: number | null;
}

export interface BlockerNeighborSummary {
  compatible: number;
  total: number;
  compatibleWeightShare: number | null;
}

const INVERSE_DISTANCE_EPSILON = 1e-9;

function numberMetric(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringMetric(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function cardSet(cards: string[]) {
  return new Set(cards.map((card) => `${card[0]?.toUpperCase() ?? ""}${card[1]?.toLowerCase() ?? ""}`));
}

export function countBlockerCollisions(
  deadCards: readonly string[],
  referenceCards: readonly string[],
): number {
  const dead = cardSet([...deadCards]);
  const reference = cardSet([...referenceCards]);
  let collisions = 0;
  for (const card of dead) {
    if (reference.has(card)) collisions++;
  }
  return collisions;
}

export function summarizeBlockerNeighbors(
  deadCards: readonly string[],
  references: readonly BlockerNeighborReference[],
): BlockerNeighborSummary | null {
  if (deadCards.length === 0) return null;

  let compatible = 0;
  let total = 0;
  let compatibleWeight = 0;
  let totalWeight = 0;

  for (const reference of references) {
    total++;
    const collisions = countBlockerCollisions(deadCards, reference.cards);
    const isCompatible = collisions === 0;
    if (isCompatible) compatible++;

    if (
      typeof reference.distance === "number" &&
      Number.isFinite(reference.distance) &&
      reference.distance >= 0
    ) {
      const weight = 1 / (reference.distance + INVERSE_DISTANCE_EPSILON);
      totalWeight += weight;
      if (isCompatible) compatibleWeight += weight;
    }
  }

  if (total === 0) return null;

  return {
    compatible,
    total,
    compatibleWeightShare: totalWeight > 0 ? compatibleWeight / totalWeight : null,
  };
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

  const deadCardCollisions = countBlockerCollisions(marker.deadCards, [
    ...point.hero,
    ...point.board,
  ]);

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
    deadCardCollisions,
    blockerCompatible:
      marker.deadCards.length > 0 ? deadCardCollisions === 0 : null,
  };
}
