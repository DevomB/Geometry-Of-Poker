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

  const count = end - start;

  if (street === "preflop") {
    const all = enumeratePreflopStates(preflopMode, targetCount, seed);
    return all.slice(start, end).map((s, i) => ({ ...s, index: start + i }));
  }

  const batchSeed = seed + batchIndex * 1_000_003;
  const rng = new SeededRng(batchSeed);
  const states: SampledState[] = [];
  for (let i = 0; i < count; i++) {
    states.push(sampleRandomState(street, rng, start + i, seed));
  }
  return states;
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
