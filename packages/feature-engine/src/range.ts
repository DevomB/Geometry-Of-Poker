/** Uniform dense villain range: Float64Array(1326) with unit weight per combo index. */
export function createUniformVillainRange(): Float64Array {
  return new Float64Array(1326).fill(1);
}

export function resolveVillainRange(range?: Float64Array): Float64Array {
  if (!range) return createUniformVillainRange();
  if (range.length !== 1326) {
    throw new Error(`Villain range must have length 1326 — got ${range.length}.`);
  }
  return range;
}
