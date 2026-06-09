import { describe, expect, it } from "vitest";
import { computeDrawPressure } from "@/lib/inspector/draw-pressure";

describe("draw pressure summary", () => {
  it("derives exact clean, dirty, and blank next-card probabilities", () => {
    const pressure = computeDrawPressure(
      {
        drawFeaturesAvailable: 1,
        improvementOutCount: 9,
        cleanImprovementOutCount: 7,
        flushOutCount: 4,
        straightOutCount: 8,
        comboDrawFlag: 1,
        openEndedStraightDrawFlag: 1,
      },
      47,
    );

    expect(pressure).not.toBeNull();
    expect(pressure?.improvementOuts).toBe(9);
    expect(pressure?.cleanImprovementOuts).toBe(7);
    expect(pressure?.dirtyImprovementOuts).toBe(2);
    expect(pressure?.blankCards).toBe(38);
    expect(pressure?.improvementProbability).toBeCloseTo(9 / 47);
    expect(pressure?.cleanImprovementProbability).toBeCloseTo(7 / 47);
    expect(pressure?.dirtyImprovementProbability).toBeCloseTo(2 / 47);
    expect(pressure?.blankProbability).toBeCloseTo(38 / 47);
    expect(pressure?.comboDraw).toBe(true);
    expect(pressure?.drawClass).toBe("Open-ended straight");
  });

  it("clamps artifact counts into the unseen deck", () => {
    const pressure = computeDrawPressure(
      {
        drawFeaturesAvailable: 1,
        improvementOutCount: 99,
        cleanImprovementOutCount: 60,
        flushOutCount: 70,
      },
      45,
    );

    expect(pressure?.improvementOuts).toBe(45);
    expect(pressure?.cleanImprovementOuts).toBe(45);
    expect(pressure?.dirtyImprovementOuts).toBe(0);
    expect(pressure?.blankCards).toBe(0);
    expect(pressure?.flushOuts).toBe(45);
  });

  it("skips unavailable, terminal, and empty draw summaries", () => {
    expect(computeDrawPressure({}, 47)).toBeNull();
    expect(computeDrawPressure({ drawFeaturesAvailable: 1, improvementOutCount: 1 }, 0)).toBeNull();
    expect(
      computeDrawPressure(
        {
          drawFeaturesAvailable: 1,
          improvementOutCount: 0,
          cleanImprovementOutCount: 0,
          flushOutCount: 0,
          straightOutCount: 0,
        },
        47,
      ),
    ).toBeNull();
  });
});
