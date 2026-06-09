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
    expect(result.streetBoardCards).toBe(3);
    expect(result.heroFixedPublicBoards).toBe(19600n);
    expect(result.boardFixedHeroHands).toBe(1176n);
    expect(result.streetStateUniverse).toBe(25989600n);
    expect(result.nextStreetCardsToDeal).toBe(1);
    expect(result.nextStreetPublicContinuations).toBe(47n);
    expect(result.legalVillainHands).toBe(1081n);
    expect(result.publicRunoutsAfterVillain).toBe(990n);
    expect(result.terminalLeaves).toBe(1070190n);
    expect(result.improvementProbability).toBeCloseTo(9 / 47);
    expect(result.cleanImprovementProbability).toBeCloseTo(7 / 47);
    expect(result.equityLeafStandardError).toBeGreaterThan(0);
  });

  it("counts preflop next-street branches as unordered flops", () => {
    const result = computeStateCombinatorics({
      hero: ["As", "Kd"],
      board: [],
    });

    expect(result.streetStateUniverse).toBe(1326n);
    expect(result.nextStreetCardsToDeal).toBe(3);
    expect(result.nextStreetPublicContinuations).toBe(19600n);
    expect(result.publicRunoutsAfterVillain).toBe(1712304n);
  });

  it("conditions villain and runout counts on dead cards", () => {
    const result = computeStateCombinatorics({
      hero: ["As", "Kd"],
      board: [],
      deadCards: ["2c"],
    });

    expect(result.knownCards).toBe(3);
    expect(result.deadCards).toBe(1);
    expect(result.remainingCards).toBe(49);
    expect(result.legalVillainHands).toBe(1176n);
    expect(result.nextStreetPublicContinuations).toBe(18424n);
    expect(result.streetStateUniverse).toBe(1275n);
    expect(result.publicRunoutsAfterVillain).toBe(1533939n);
    expect(result.terminalLeaves).toBe(1803912264n);
    expect(result.baselineTerminalLeavesNoDead).toBe(2097572400n);
    expect(result.removedTerminalLeavesByDeadCards).toBe(293660136n);
    expect(result.terminalLeafFractionOfNoDead).toBeCloseTo(Number(result.terminalLeaves) / 2097572400);
    expect(result.baselineStreetStateUniverseNoDead).toBe(1326n);
    expect(result.removedStreetStatesByDeadCards).toBe(51n);
    expect(result.streetStateFractionOfNoDead).toBeCloseTo(1275 / 1326);
  });

  it("reports no-dead ratios as one when no dead cards are supplied", () => {
    const result = computeStateCombinatorics({
      hero: ["As", "Kd"],
      board: ["2c", "7h", "Jh"],
    });

    expect(result.terminalLeaves).toBe(result.baselineTerminalLeavesNoDead);
    expect(result.removedTerminalLeavesByDeadCards).toBe(0n);
    expect(result.terminalLeafFractionOfNoDead).toBe(1);
    expect(result.streetStateUniverse).toBe(result.baselineStreetStateUniverseNoDead);
    expect(result.removedStreetStatesByDeadCards).toBe(0n);
    expect(result.streetStateFractionOfNoDead).toBe(1);
  });

  it("omits next-street branches on river states", () => {
    const result = computeStateCombinatorics({
      hero: ["As", "Kd"],
      board: ["2c", "7h", "Jh", "Tc", "4s"],
    });

    expect(result.runoutCardsToRiver).toBe(0);
    expect(result.nextStreetCardsToDeal).toBeNull();
    expect(result.nextStreetPublicContinuations).toBeNull();
    expect(result.publicRunoutsAfterVillain).toBe(1n);
    expect(result.terminalLeaves).toBe(990n);
  });

  it("formats exact large counts for the UI", () => {
    expect(formatBigInt(1070190n)).toBe("1,070,190");
  });
});
