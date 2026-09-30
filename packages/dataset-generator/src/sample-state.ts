import type { Street } from "@geometry-of-poker/feature-engine";
import {
  allDeckCards,
  assertUniqueCards,
  boardLengthForStreet,
  canonicalStateKey,
  enumerateAll1326HoleCombos,
  enumerateCanonical169HoleCombos,
} from "./cards.js";
import { SeededRng } from "./rng.js";
import type { SampledState } from "./types.js";

export type PreflopMode = "enumerate1326" | "canonical169" | "random";

export function sampleRandomState(
  street: Street,
  rng: SeededRng,
  index: number,
  seed: number,
): SampledState {
  const boardLen = boardLengthForStreet(street);
  const deck = rng.shuffle(allDeckCards());
  const hero: [string, string] = [deck[0]!, deck[1]!];
  const board = deck.slice(2, 2 + boardLen);
  assertUniqueCards([...hero, ...board]);
  return {
    hero,
    board,
    street,
    seed,
    index,
    canonicalKey: canonicalStateKey(hero, board),
  };
}

export function sampleRandomStates(
  street: Street,
  count: number,
  seed: number,
  startIndex = 0,
): SampledState[] {
  if (street === "preflop") {
    throw new Error("Use enumeratePreflopStates for preflop, not sampleRandomStates");
  }
  const rng = new SeededRng(seed);
  const states: SampledState[] = [];
  for (let i = 0; i < count; i++) {
    states.push(sampleRandomState(street, rng, startIndex + i, seed));
  }
  return states;
}

export function enumeratePreflopStates(
  mode: PreflopMode,
  count: number,
  seed: number,
): SampledState[] {
  let combos: Array<[string, string]>;
  switch (mode) {
    case "enumerate1326":
      combos = enumerateAll1326HoleCombos();
      break;
    case "canonical169":
      combos = enumerateCanonical169HoleCombos();
      break;
    case "random": {
      const rng = new SeededRng(seed);
      const all = enumerateAll1326HoleCombos();
      const picked = rng.shuffle(all).slice(0, count);
      return picked.map((hero, index) => ({
        hero,
        board: [],
        street: "preflop" as const,
        seed,
        index,
        canonicalKey: canonicalStateKey(hero, []),
      }));
    }
  }

  const limited = combos.slice(0, count);
  return limited.map((hero, index) => ({
    hero,
    board: [],
    street: "preflop" as const,
    seed,
    index,
    canonicalKey: canonicalStateKey(hero, []),
  }));
}

export function resolveStateBatch(
  street: Street,
  batchIndex: number,
  batchSize: number,
  targetCount: number,
  seed: number,
  preflopMode: PreflopMode,
): SampledState[] {
  const start = batchIndex * batchSize;
  const end = Math.min(start + batchSize, targetCount);
  if (start >= targetCount) return [];

  if (street === "preflop") {
    const all = enumeratePreflopStates(preflopMode, targetCount, seed);
    return all.slice(start, end).map((s, i) => ({ ...s, index: start + i }));
  }

  return uniqueStatesThroughBatch(street, batchIndex, batchSize, seed).slice(start, end);
}

// Independent shuffles repeat a state now and then (seed 42, 25k flops: two exact repeats and a
// dozen with the same cards in another order), which the shard merge rejects. Repeats are redrawn
// from a separate stream, so every other state matches the plain per-batch shuffle. Batches are
// resolved in order from zero, so an ordinal's state never depends on targetCount or on which
// batch is asked for first.
interface UniqueStateRun {
  states: SampledState[];
  keys: Set<string>;
}

const uniqueStateRuns = new Map<string, UniqueStateRun>();

function unorderedStateKey(state: SampledState): string {
  return `${[...state.hero].sort().join(",")}|${[...state.board].sort().join(",")}`;
}

function uniqueStatesThroughBatch(
  street: Street,
  batchIndex: number,
  batchSize: number,
  seed: number,
): SampledState[] {
  const runKey = `${street}:${seed}:${batchSize}`;
  let run = uniqueStateRuns.get(runKey);
  if (!run) {
    run = { states: [], keys: new Set() };
    uniqueStateRuns.set(runKey, run);
  }
  for (let b = run.states.length / batchSize; b <= batchIndex; b++) {
    const batchSeed = seed + b * 1_000_003;
    const rng = new SeededRng(batchSeed);
    const redraw = new SeededRng((batchSeed ^ 0x9e3779b9) >>> 0);
    for (let i = 0; i < batchSize; i++) {
      const index = b * batchSize + i;
      let state = sampleRandomState(street, rng, index, seed);
      while (run.keys.has(unorderedStateKey(state))) {
        state = sampleRandomState(street, redraw, index, seed);
      }
      run.keys.add(unorderedStateKey(state));
      run.states.push(state);
    }
  }
  return run.states;
}

export function formatRecordId(street: Street, seed: number, index: number): string {
  return `${street}-${seed}-${String(index).padStart(8, "0")}`;
}

export function shardFileName(
  street: Street,
  seed: number,
  mode: string,
  batchIndex: number,
  batchSize: number,
): string {
  return `${street}-seed${seed}-${mode}-batch${String(batchIndex).padStart(4, "0")}-size${batchSize}.parquet`;
}
