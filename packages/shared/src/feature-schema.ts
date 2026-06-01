import type { FeatureDescriptor, Street } from "./types.js";

/** Bump when feature column order or semantics change. */
export const FEATURE_SCHEMA_VERSION = "0.0.0-placeholder";

/**
 * Ordered feature schema — names and groups only in this phase.
 * Numeric extraction deferred to feature-engine implementation.
 */
export const FEATURE_SCHEMA: readonly FeatureDescriptor[] = [
  { name: "hero_equity_vs_random", label: "Hero equity vs random", group: "equity", higherIsBetter: true },
  { name: "hero_equity_vs_range", label: "Hero equity vs default range", group: "equity", higherIsBetter: true },
  { name: "nut_potential", label: "Nut potential", group: "draw", higherIsBetter: true },
  { name: "draw_strength", label: "Draw strength", group: "draw", higherIsBetter: true },
  { name: "vulnerability_index", label: "Vulnerability index", group: "vulnerability", higherIsBetter: false },
  { name: "category_rank", label: "Made-hand category rank", group: "category" },
  { name: "board_texture_paired", label: "Board paired", group: "texture" },
  { name: "board_texture_monotone", label: "Board monotone", group: "texture" },
  { name: "blocker_score", label: "Blocker score", group: "blocker" },
  { name: "street_index", label: "Street index", group: "meta" },
] as const;

export function streetFromCommunityCount(count: number): Street {
  switch (count) {
    case 0:
      return "preflop";
    case 3:
      return "flop";
    case 4:
      return "turn";
    case 5:
      return "river";
    default:
      throw new Error(`Invalid community card count: ${count}`);
  }
}

export function communityCountFromStreet(street: Street): number {
  switch (street) {
    case "preflop":
      return 0;
    case "flop":
      return 3;
    case "turn":
      return 4;
    case "river":
      return 5;
  }
}
