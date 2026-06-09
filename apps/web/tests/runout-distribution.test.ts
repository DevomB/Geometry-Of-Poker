import { describe, expect, it } from "vitest";
import { computeRunoutDistribution } from "@/lib/inspector/runout-distribution";

describe("runout distribution summary", () => {
  it("derives interval width, tail skew, and vulnerability edge", () => {
    const runout = computeRunoutDistribution({
      equityRunoutAvailable: 1,
      equityMean: 0.52,
      equityP05: 0.2,
      equityP50: 0.5,
      equityP95: 0.85,
      runoutVulnerabilityAvailable: 1,
      pNuts: 0.18,
      pDominated: 0.07,
    });

    expect(runout).not.toBeNull();
    expect(runout?.hasRunoutQuantiles).toBe(true);
    expect(runout?.intervalWidth).toBeCloseTo(0.65);
    expect(runout?.lowerTailGap).toBeCloseTo(0.3);
    expect(runout?.upperTailGap).toBeCloseTo(0.35);
    expect(runout?.tailSkew).toBeCloseTo(0.05);
    expect(runout?.vulnerability?.edge).toBeCloseTo(0.11);
  });

  it("can expose vulnerability when runout quantiles are unavailable", () => {
    const runout = computeRunoutDistribution({
      equityRunoutAvailable: 0,
      runoutVulnerabilityAvailable: 1,
      pNuts: 0.05,
      pDominated: 0.12,
    });

    expect(runout?.hasRunoutQuantiles).toBe(false);
    expect(runout?.vulnerability?.edge).toBeCloseTo(-0.07);
  });

  it("skips unavailable summaries", () => {
    expect(computeRunoutDistribution({})).toBeNull();
    expect(
      computeRunoutDistribution({
        equityRunoutAvailable: 1,
        equityMean: Number.NaN,
      }),
    ).toBeNull();
  });
});
