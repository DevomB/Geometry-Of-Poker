import { describe, expect, it } from "vitest";
import { choose, computeStateCombinatorics, formatBigInt } from "@/lib/poker/combinatorics";

describe("poker combinatorics", () => {
  it("computes binomial coefficients exactly", () => {
    expect(choose(52, 2)).toBe(1326n);
    expect(choose(50, 3)).toBe(19600n);
    expect(choose(5, 0)).toBe(1n);
    expect(choose(3, 5)).toBe(0n);
  });

  it("counts selected flop equity leaves and next-card odds", () => {
    const result = computeStateCombinatorics({
      hero: ["As", "Kd"],
      board: ["2c", "7h", "Jh"],
      equityVsRandom: 0.42,
      summary: {
        improvementOutCount: 9,
        cleanImprovementOutCount: 7,
        flushOutCount: 4,
        straightOutCount: 0,
      },
    });

    expect(result.knownCards).toBe(5);
    expect(result.remainingCards).toBe(47);
    expect(result.legalVillainHands).toBe(1081n);
    expect(result.publicRunoutsAfterVillain).toBe(990n);
    expect(result.terminalLeaves).toBe(1070190n);
    expect(result.improvementProbability).toBeCloseTo(9 / 47);
    expect(result.cleanImprovementProbability).toBeCloseTo(7 / 47);
    expect(result.equityLeafStandardError).toBeGreaterThan(0);
  });

  it("formats exact large counts for the UI", () => {
    expect(formatBigInt(1070190n)).toBe("1,070,190");
  });
});
