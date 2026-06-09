import { describe, expect, it } from "vitest";
import { computeRemovalPressure } from "@/lib/inspector/removal-pressure";

describe("removal pressure summary", () => {
  it("derives signed mass and concentration from exact gradient summaries", () => {
    const pressure = computeRemovalPressure(
      {
        removalGradientAvailable: 1,
        removalGradientMean: 0.01,
        removalGradientStdDev: 0.04,
        removalGradientMin: -0.08,
        removalGradientMax: 0.12,
        removalGradientL1: 0.5,
        removalGradientL2: 0.25,
        removalGradientPositiveMass: 0.32,
        removalGradientNegativeMass: 0.18,
      },
      47,
    );

    expect(pressure).not.toBeNull();
    expect(pressure?.signedMass).toBeCloseTo(0.14);
    expect(pressure?.concentration).toBeCloseTo(0.5);
    expect(pressure?.uniformConcentrationFloor).toBeCloseTo(1 / Math.sqrt(47));
  });

  it("does not render unavailable or zero-mass gradients", () => {
    expect(computeRemovalPressure({ removalGradientAvailable: 0 })).toBeNull();
    expect(
      computeRemovalPressure({
        removalGradientAvailable: 1,
        removalGradientL1: 0,
        removalGradientL2: 0,
      }),
    ).toBeNull();
  });
});
