import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

type PokerCalculationsApi = typeof import("poker-calculations");

let cached: PokerCalculationsApi | undefined;
let lastAvailabilityError: unknown;

export function getPokerCalculations(): PokerCalculationsApi {
  if (!cached) {
    cached = require("poker-calculations") as PokerCalculationsApi;
  }
  return cached;
}

export function isPokerCalculationsAvailable(): boolean {
  try {
    getPokerCalculations().evaluateHandStrengthFast(["As", "Kd"], ["2c", "7d", "9h", "Ts", "Jc"]);
    lastAvailabilityError = undefined;
    return true;
  } catch (err) {
    lastAvailabilityError = err;
    if (process.env.GOP_LOG_NATIVE_CHECK === "1") {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[poker-calculations] availability check failed: ${message}`);
    }
    return false;
  }
}
