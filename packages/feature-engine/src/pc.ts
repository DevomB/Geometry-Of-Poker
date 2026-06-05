import { createRequire } from "node:module";
import { join } from "node:path";

const packageRequire = createRequire(import.meta.url);

type PokerCalculationsApi = typeof import("poker-calculations");

let cached: PokerCalculationsApi | undefined;
let lastAvailabilityError: unknown;

export function getPokerCalculations(): PokerCalculationsApi {
  if (!cached) {
    const errors: string[] = [];
    for (const requirePokerCalculations of [
      createRequire(join(process.cwd(), "package.json")),
      packageRequire,
    ]) {
      try {
        cached = requirePokerCalculations("poker-calculations") as PokerCalculationsApi;
        break;
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err));
      }
    }
    if (!cached) {
      throw new Error(`Unable to load poker-calculations: ${errors.join(" | ")}`);
    }
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

export function pokerCalculationsAvailabilityError(): string | undefined {
  if (!lastAvailabilityError) return undefined;
  return lastAvailabilityError instanceof Error
    ? lastAvailabilityError.message
    : String(lastAvailabilityError);
}
