import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

type PokerCalculationsApi = typeof import("poker-calculations");

let cached: PokerCalculationsApi | undefined;

export function getPokerCalculations(): PokerCalculationsApi {
  if (!cached) {
    cached = require("poker-calculations") as PokerCalculationsApi;
  }
  return cached;
}

export function isPokerCalculationsAvailable(): boolean {
  try {
    getPokerCalculations().exactHuEquityVsRandomHand(["As", "Kd"], []);
    return true;
  } catch {
    return false;
  }
}
