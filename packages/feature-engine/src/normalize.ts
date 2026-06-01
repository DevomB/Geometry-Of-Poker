import type { FeatureVector, ScalerParams } from "@geometry-of-poker/shared";

/**
 * Apply saved scaler parameters (z-score).
 */
export function normalizeFeatures(
  vector: FeatureVector | number[],
  scaler: ScalerParams,
): Float64Array {
  const input = vector instanceof Float64Array ? vector : Float64Array.from(vector);
  if (input.length !== scaler.featureNames.length) {
    throw new Error(
      `Feature dimension mismatch: vector=${input.length}, scaler=${scaler.featureNames.length}`,
    );
  }

  const out = new Float64Array(input.length);
  for (let i = 0; i < input.length; i++) {
    let x = input[i]!;
    const clipMin = scaler.clipMin?.[i];
    const clipMax = scaler.clipMax?.[i];
    if (clipMin !== undefined) x = Math.max(x, clipMin);
    if (clipMax !== undefined) x = Math.min(x, clipMax);
    const scale = scaler.scale[i] ?? 1;
    const mean = scaler.mean[i] ?? 0;
    out[i] = scale === 0 ? 0 : (x - mean) / scale;
  }
  return out;
}
