import { validatePokerStateInput } from "./validate-input.js";
import { computeBoardFeatures } from "./features/board-features.js";
import { computeCoreFeatures } from "./features/core-features.js";
import { computeDrawFeatures } from "./features/draw-features.js";
import { computeRemovalFeatures } from "./features/removal-features.js";
import { computeTransitionFeatures } from "./features/transition-features.js";
import type { ExactFeatureBudget, FeatureMode } from "./types.js";

export interface FeatureGroupTimingsMs {
  core: number;
  board: number;
  draws: number;
  removal: number;
  transitions: number;
  total: number;
}

/** Time each feature group independently (profiling helper for dataset generation). */
export function profileFeatureGroups(
  state: Parameters<typeof validatePokerStateInput>[0],
  mode: FeatureMode = "compact",
  exactFeatureBudget: ExactFeatureBudget = mode === "extended" ? "full" : "production",
): FeatureGroupTimingsMs {
  const validated = validatePokerStateInput(state);
  const extended = mode === "extended";

  let t0 = performance.now();
  computeCoreFeatures(validated, exactFeatureBudget);
  const core = performance.now() - t0;

  t0 = performance.now();
  computeBoardFeatures(validated);
  const board = performance.now() - t0;

  t0 = performance.now();
  computeDrawFeatures(validated);
  const draws = performance.now() - t0;

  t0 = performance.now();
  computeRemovalFeatures(validated, undefined, extended, exactFeatureBudget);
  const removal = performance.now() - t0;

  t0 = performance.now();
  computeTransitionFeatures(validated, extended, exactFeatureBudget);
  const transitions = performance.now() - t0;

  return {
    core,
    board,
    draws,
    removal,
    transitions,
    total: core + board + draws + removal + transitions,
  };
}

export { computeBoardFeatures } from "./features/board-features.js";
export { computeCoreFeatures } from "./features/core-features.js";
export { computeDrawFeatures } from "./features/draw-features.js";
export { computeRemovalFeatures } from "./features/removal-features.js";
export { computeTransitionFeatures } from "./features/transition-features.js";
