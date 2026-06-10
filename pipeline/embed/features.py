"""Compact feature schema — keep in sync with packages/feature-engine/src/feature-order.ts"""

from __future__ import annotations

import re

CORE_SCALAR = ["equityVsRandom", "categoryIndex", "streetIndex"]

CATEGORY_ONE_HOT = [
    "categoryHighCard",
    "categoryPair",
    "categoryTwoPair",
    "categoryThreeOfAKind",
    "categoryStraight",
    "categoryFlush",
    "categoryFullHouse",
    "categoryFourOfAKind",
    "categoryStraightFlush",
    "categoryRoyalFlush",
]

RUNOUT = [
    "equityMean",
    "equityVariance",
    "equityP05",
    "equityP50",
    "equityP95",
    "equityRunoutAvailable",
]

VULNERABILITY = ["pNuts", "pDominated", "runoutVulnerabilityAvailable"]

BOARD = [
    "boardRankDistinctCount",
    "boardPairCount",
    "boardTripsFlag",
    "boardQuadsFlag",
    "boardPairednessScore",
    "boardMaxSuitCount",
    "boardDistinctSuitCount",
    "boardRainbowFlag",
    "boardTwoToneFlag",
    "boardMonotoneFlag",
    "boardConnectivityScore",
    "boardBroadwayDensity",
    "boardHighCardNormalized",
    "boardLowCardNormalized",
    "boardFeaturesAvailable",
]

DRAWS = [
    "flushOutCount",
    "backdoorFlushFlag",
    "straightOutCount",
    "openEndedStraightDrawFlag",
    "gutshotFlag",
    "doubleGutshotFlag",
    "comboDrawFlag",
    "improvementOutCount",
    "cleanImprovementOutCount",
    "improvementProbabilityNextCard",
    "drawFeaturesAvailable",
]

REMOVAL = [
    "removalGradientMean",
    "removalGradientStdDev",
    "removalGradientMin",
    "removalGradientMax",
    "removalGradientL1",
    "removalGradientL2",
    "removalGradientPositiveMass",
    "removalGradientNegativeMass",
    "removalGradientAvailable",
]

TRANSITION = [
    "transitionEntropy",
    "transitionMaxProbability",
    "transitionStdDev",
    "transitionDiagonalMass",
    "transitionUpgradeMass",
    "transitionDowngradeMass",
    "transitionRiverPairOrBetterMass",
    "transitionRiverFlushOrBetterMass",
    "categoryTransitionAvailable",
]

COMPACT_FEATURE_ORDER = (
    CORE_SCALAR
    + CATEGORY_ONE_HOT
    + RUNOUT
    + VULNERABILITY
    + BOARD
    + DRAWS
    + REMOVAL
    + TRANSITION
)

META_COLUMNS = {
    "id",
    "hero0",
    "hero1",
    "board_json",
    "street",
    "category",
    "category_index",
    "equity_vs_random",
}

SUMMARY_METRICS = [
    "equityVsRandom",
    "equityMean",
    "equityVariance",
    "equityP05",
    "equityP50",
    "equityP95",
    "equityRunoutAvailable",
    "pNuts",
    "pDominated",
    "runoutVulnerabilityAvailable",
    "flushOutCount",
    "straightOutCount",
    "improvementOutCount",
    "cleanImprovementOutCount",
    "drawFeaturesAvailable",
    "boardConnectivityScore",
    "boardRainbowFlag",
    "boardTwoToneFlag",
    "boardMonotoneFlag",
    "boardPairednessScore",
    "removalGradientMean",
    "transitionEntropy",
]

EXPERIMENT_VARIANTS = {
    "compact": {"exclude": [], "description": "Full compact vector (66 dims)"},
    "extended": {"exclude": [], "extended": True, "description": "Extended vector if present in parquet"},
    "compact_no_board": {"exclude": BOARD, "description": "Compact without handcrafted board metrics"},
    "compact_no_removal": {"exclude": REMOVAL, "description": "Compact without card-removal summaries"},
}


def sanitize_column(name: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_]", "_", name)


def compact_columns_sanitized() -> list[str]:
    return [sanitize_column(n) for n in COMPACT_FEATURE_ORDER]


def parquet_feature_columns(columns: list[str]) -> list[str]:
    """Feature columns present in parquet (sanitized names)."""
    sanitized = compact_columns_sanitized()
    present = [c for c in sanitized if c in columns]
    if len(present) >= len(COMPACT_FEATURE_ORDER) - 5:
        return present
    # fallback: infer numeric non-meta columns
    return [c for c in columns if c not in META_COLUMNS and not c.startswith("removalGradientDeck") and not c.startswith("categoryJoint")]
