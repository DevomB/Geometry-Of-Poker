import { BOARD_FEATURE_NAMES } from "./features/board-features.js";
import {
  CATEGORY_ONE_HOT_NAMES,
  CORE_SCALAR_NAMES,
  RUNOUT_NAMES,
  VULNERABILITY_NAMES,
} from "./features/core-features.js";
import { DRAW_FEATURE_NAMES } from "./features/draw-features.js";
import {
  REMOVAL_GRADIENT_NAMES,
  REMOVAL_SUMMARY_NAMES,
} from "./features/removal-features.js";
import {
  TRANSITION_MATRIX_NAMES,
  TRANSITION_SUMMARY_NAMES,
} from "./features/transition-features.js";
import type { FeatureMode } from "./types.js";

export const COMPACT_FEATURE_ORDER: readonly string[] = [
  ...CORE_SCALAR_NAMES,
  ...CATEGORY_ONE_HOT_NAMES,
  ...RUNOUT_NAMES,
  ...VULNERABILITY_NAMES,
  ...BOARD_FEATURE_NAMES,
  ...DRAW_FEATURE_NAMES,
  ...REMOVAL_SUMMARY_NAMES,
  ...TRANSITION_SUMMARY_NAMES,
];

export const EXTENDED_ONLY_NAMES: readonly string[] = [
  ...REMOVAL_GRADIENT_NAMES,
  ...TRANSITION_MATRIX_NAMES,
];

export const EXTENDED_FEATURE_ORDER: readonly string[] = [
  ...COMPACT_FEATURE_ORDER,
  ...EXTENDED_ONLY_NAMES,
];

export function featureOrderForMode(mode: FeatureMode): readonly string[] {
  return mode === "extended" ? EXTENDED_FEATURE_ORDER : COMPACT_FEATURE_ORDER;
}

export const COMPACT_FEATURE_DIMENSION = COMPACT_FEATURE_ORDER.length;
export const EXTENDED_FEATURE_DIMENSION = EXTENDED_FEATURE_ORDER.length;
