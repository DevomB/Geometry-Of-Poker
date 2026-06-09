import type { PointSummary } from "@/lib/types";

export interface DrawPressure {
  unseenCardCount: number;
  improvementOuts: number;
  cleanImprovementOuts: number;
  dirtyImprovementOuts: number;
  blankCards: number;
  improvementProbability: number;
  cleanImprovementProbability: number;
  dirtyImprovementProbability: number;
  blankProbability: number;
  flushOuts: number;
  straightOuts: number;
  drawClass: string | null;
  comboDraw: boolean;
}

export function computeDrawPressure(
  summary: PointSummary,
  unseenCardCount: number,
): DrawPressure | null {
  if (!isAvailable(summary.drawFeaturesAvailable)) return null;
  if (!Number.isInteger(unseenCardCount) || unseenCardCount <= 0) return null;

  const improvementOuts = clampCount(summary.improvementOutCount, unseenCardCount);
  const cleanImprovementOuts = clampCount(summary.cleanImprovementOutCount, improvementOuts);
  const flushOuts = clampCount(summary.flushOutCount, unseenCardCount);
  const straightOuts = clampCount(summary.straightOutCount, unseenCardCount);
  const dirtyImprovementOuts = improvementOuts - cleanImprovementOuts;
  const blankCards = unseenCardCount - improvementOuts;

  if (
    improvementOuts === 0 &&
    cleanImprovementOuts === 0 &&
    flushOuts === 0 &&
    straightOuts === 0
  ) {
    return null;
  }

  return {
    unseenCardCount,
    improvementOuts,
    cleanImprovementOuts,
    dirtyImprovementOuts,
    blankCards,
    improvementProbability: improvementOuts / unseenCardCount,
    cleanImprovementProbability: cleanImprovementOuts / unseenCardCount,
    dirtyImprovementProbability: dirtyImprovementOuts / unseenCardCount,
    blankProbability: blankCards / unseenCardCount,
    flushOuts,
    straightOuts,
    drawClass: classifyDraw(summary, flushOuts, straightOuts),
    comboDraw: isAvailable(summary.comboDrawFlag) || (flushOuts > 0 && straightOuts > 0),
  };
}

function classifyDraw(
  summary: PointSummary,
  flushOuts: number,
  straightOuts: number,
): string | null {
  if (isAvailable(summary.openEndedStraightDrawFlag)) return "Open-ended straight";
  if (isAvailable(summary.doubleGutshotFlag)) return "Double gutshot";
  if (isAvailable(summary.gutshotFlag)) return "Gutshot";
  if (isAvailable(summary.backdoorFlushFlag)) return "Backdoor flush";
  if (flushOuts > 0 && straightOuts > 0) return "Combo";
  if (flushOuts > 0) return "Flush";
  if (straightOuts > 0) return "Straight";
  return null;
}

function clampCount(value: number | undefined, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(max, Math.max(0, Math.round(value)));
}

function isAvailable(value: number | undefined): boolean {
  return typeof value === "number" && Number.isFinite(value) && value > 0.5;
}
