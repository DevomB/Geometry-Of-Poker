import { extractGeometryFeatures } from "@geometry-of-poker/feature-engine";
import type {
  ExactFeatureBudget,
  StateAvailability,
  StateCombinatoricsResponse,
  StateResponse,
  Street,
} from "@geometry-of-poker/shared";
import { computeStateCombinatorics } from "@/lib/poker/combinatorics";

export interface AnalyzeStateInput {
  hero: [string, string];
  board: string[];
  deadCards: string[];
  street: Street;
  exactFeatureBudget: ExactFeatureBudget;
}

function isAvailable(value: number | undefined): boolean {
  return typeof value === "number" && Number.isFinite(value) && value > 0.5;
}

function buildAvailability(groups: {
  runouts: Record<string, number>;
  vulnerability: Record<string, number>;
  removal: Record<string, number>;
  transitions: Record<string, number>;
  draws: Record<string, number>;
}): StateAvailability {
  return {
    equityRunout: isAvailable(groups.runouts.equityRunoutAvailable),
    runoutVulnerability: isAvailable(groups.vulnerability.runoutVulnerabilityAvailable),
    removalGradient: isAvailable(groups.removal.removalGradientAvailable),
    categoryTransition: isAvailable(groups.transitions.categoryTransitionAvailable),
    drawFeatures: isAvailable(groups.draws.drawFeaturesAvailable),
  };
}

function buildLimitations(street: Street, availability: StateAvailability): string[] {
  const limitations = [
    "Equity is vs a uniform random villain hand, not a range or GTO opponent.",
    "No bet sizing, position, stack depth, or multiway modeling is included.",
  ];
  if (!availability.equityRunout) {
    limitations.push(
      street === "preflop" || street === "flop"
        ? "Runout quantiles were not computed for this request (check exactFeatureBudget)."
        : "Runout quantiles are only defined for preflop and flop (board length ≤ 3).",
    );
  }
  if (!availability.runoutVulnerability) {
    limitations.push(
      street === "flop" || street === "turn"
        ? "Runout vulnerability was not computed for this request (check exactFeatureBudget)."
        : "Runout vulnerability is only defined for flop and turn (board length 3–4).",
    );
  }
  if (!availability.removalGradient) {
    limitations.push(
      "Card-removal gradient summaries require exactFeatureBudget=full.",
    );
  }
  if (!availability.categoryTransition) {
    limitations.push(
      "Category transition summaries require exactFeatureBudget=full and are flop-only.",
    );
  }
  return limitations;
}

function serializeCombinatorics(
  math: ReturnType<typeof computeStateCombinatorics>,
): StateCombinatoricsResponse {
  return {
    knownCards: math.knownCards,
    remainingCards: math.remainingCards,
    legalVillainHands: math.legalVillainHands.toString(),
    terminalLeaves: math.terminalLeaves.toString(),
    flushOuts: math.flushOutCount,
    straightOutCount: math.straightOutCount,
    improvementOutCount: math.improvementOutCount,
    cleanImprovementOutCount: math.cleanImprovementOutCount,
  };
}

export function analyzePokerState(input: AnalyzeStateInput): StateResponse {
  const extracted = extractGeometryFeatures(
    {
      hero: input.hero,
      board: input.board,
      deadCards: input.deadCards.length > 0 ? input.deadCards : undefined,
    },
    { mode: "compact", exactFeatureBudget: input.exactFeatureBudget },
  );

  const math = computeStateCombinatorics({
    hero: input.hero,
    board: input.board,
    deadCards: input.deadCards,
    equityVsRandom: extracted.groups.core.equityVsRandom,
    summary: {
      improvementOutCount: extracted.groups.draws.improvementOutCount,
      cleanImprovementOutCount: extracted.groups.draws.cleanImprovementOutCount,
      flushOutCount: extracted.groups.draws.flushOutCount,
      straightOutCount: extracted.groups.draws.straightOutCount,
    },
  });

  const availability = buildAvailability(extracted.groups);

  return {
    state: {
      hero: input.hero,
      board: input.board,
      deadCards: input.deadCards,
      street: input.street,
    },
    metadata: {
      category: extracted.metadata.category,
      categoryIndex: extracted.metadata.categoryIndex,
    },
    equityVsRandom: extracted.groups.core.equityVsRandom ?? 0,
    exactFeatureBudget: input.exactFeatureBudget,
    features: extracted.groups,
    combinatorics: serializeCombinatorics(math),
    availability,
    limitations: buildLimitations(input.street, availability),
  };
}
