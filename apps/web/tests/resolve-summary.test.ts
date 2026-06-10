import { describe, expect, it } from "vitest";
import {
  enrichSummaryFromChannels,
  isEquityVarianceDefined,
  isVulnerabilityDefined,
  mergeExactRunoutMetrics,
  needsExactRunoutMetrics,
} from "@/lib/inspector/resolve-summary";
import type { BrowserChannels } from "@/lib/artifacts/parse-channels-bin";

function emptyChannels(count: number): BrowserChannels {
  return {
    equity: new Float32Array(count),
    clusterId: new Int16Array(count),
    categoryIndex: new Uint8Array(count),
    pNuts: new Float32Array(count),
    equityVariance: new Float32Array(count),
    boardConnectivity: new Float32Array(count),
    boardRainbow: new Uint8Array(count),
    boardTwoTone: new Uint8Array(count),
    boardMonotone: new Uint8Array(count),
    boardPairedness: new Float32Array(count),
  };
}

describe("resolve summary", () => {
  it("fills missing summary scalars from channels", () => {
    const channels = emptyChannels(1);
    channels.pNuts[0] = 0.22;
    channels.equityVariance[0] = 0.04;

    const summary = enrichSummaryFromChannels({}, 0, channels);
    expect(summary.pNuts).toBeCloseTo(0.22);
    expect(summary.equityVariance).toBeCloseTo(0.04);
  });

  it("requests exact vulnerability metrics on turn when artifacts are neutral", () => {
    const needs = needsExactRunoutMetrics(
      { pNuts: 0, pDominated: 0, runoutVulnerabilityAvailable: 0 },
      4,
    );
    expect(needs.vulnerability).toBe(true);
    expect(needs.runouts).toBe(false);
  });

  it("skips exact fetch when availability flags are set", () => {
    const needs = needsExactRunoutMetrics(
      {
        equityRunoutAvailable: 1,
        runoutVulnerabilityAvailable: 1,
      },
      4,
    );
    expect(needs.runouts).toBe(false);
    expect(needs.vulnerability).toBe(false);
  });

  it("merges exact runout metrics into the inspector summary", () => {
    const merged = mergeExactRunoutMetrics(
      { pNuts: 0, runoutVulnerabilityAvailable: 0 },
      { pNuts: 0.18, pDominated: 0.07, runoutVulnerabilityAvailable: 1 },
    );
    expect(merged.pNuts).toBeCloseTo(0.18);
    expect(merged.pDominated).toBeCloseTo(0.07);
    expect(merged.runoutVulnerabilityAvailable).toBe(1);
  });

  it("knows which streets define each metric family", () => {
    expect(isEquityVarianceDefined(3)).toBe(true);
    expect(isEquityVarianceDefined(4)).toBe(false);
    expect(isVulnerabilityDefined(3)).toBe(true);
    expect(isVulnerabilityDefined(4)).toBe(true);
    expect(isVulnerabilityDefined(5)).toBe(false);
  });
});
