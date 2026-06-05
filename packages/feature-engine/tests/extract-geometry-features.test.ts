import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  COMPACT_FEATURE_DIMENSION,
  COMPACT_FEATURE_ORDER,
  EXTENDED_FEATURE_DIMENSION,
} from "../src/feature-order.js";
import {
  COMPACT_FEATURE_ORDER as SHARED_COMPACT_FEATURE_ORDER,
  FEATURE_SCHEMA_VERSION,
} from "../../shared/src/feature-schema.js";
import { extractGeometryFeatures } from "../src/extract-geometry-features.js";
import { isPokerCalculationsAvailable } from "../src/pc.js";

const nativeOk = isPokerCalculationsAvailable();
const requireNative = process.env.CI === "true" || process.env.GOP_REQUIRE_NATIVE === "1";

function spot(
  hero: [string, string],
  board: string[],
  deadCards?: string[],
) {
  return extractGeometryFeatures({ hero, board, deadCards });
}

describe("feature schema contract", () => {
  it("aligns compact feature order with the shared schema contract", () => {
    assert.equal(FEATURE_SCHEMA_VERSION, "1.0.0");
    assert.deepEqual([...SHARED_COMPACT_FEATURE_ORDER], [...COMPACT_FEATURE_ORDER]);
  });
});

describe("extractGeometryFeatures", { skip: !nativeOk }, () => {
  it("has stable compact vector length and ordering", () => {
    const a = spot(["As", "Kd"], ["2c", "7h", "Jh"]);
    const b = spot(["As", "Kd"], ["2c", "7h", "Jh"]);
    assert.equal(a.vector.length, COMPACT_FEATURE_DIMENSION);
    assert.deepEqual(a.featureNames, b.featureNames);
    assert.deepEqual(a.vector, b.vector);
  });

  it("extended mode adds gradient and joint matrix dimensions", () => {
    const ext = extractGeometryFeatures(
      { hero: ["9h", "8d"], board: ["6c", "7s", "2d"] },
      { mode: "extended" },
    );
    assert.equal(ext.vector.length, EXTENDED_FEATURE_DIMENSION);
    assert.ok(ext.featureNames.includes("removalGradientDeck0"));
    assert.ok(ext.featureNames.includes("categoryJointTurn0River0"));
  });

  it("all values are finite", () => {
    const result = spot(["Qh", "Qd"], ["Qc", "2d", "2h"]);
    for (const v of result.vector) {
      assert.ok(Number.isFinite(v));
    }
  });

  it("classifies dry rainbow flop board texture", () => {
    const result = spot(["As", "Kd"], ["2c", "7h", "Jh"]);
    assert.equal(result.groups.board.boardRainbowFlag, 1);
    assert.equal(result.groups.board.boardMonotoneFlag, 0);
    assert.equal(result.groups.board.boardFeaturesAvailable, 1);
  });

  it("detects monotone-heavy flop", () => {
    const result = spot(["As", "Ks"], ["2s", "7s", "Jh"]);
    assert.equal(result.groups.board.boardMaxSuitCount, 3);
  });

  it("detects paired board", () => {
    const result = spot(["As", "Kd"], ["Qh", "Qd", "2c"]);
    assert.equal(result.groups.board.boardPairCount, 1);
    assert.ok(result.groups.board.boardPairednessScore > 0);
  });

  it("detects connected board", () => {
    const result = spot(["As", "Kd"], ["9h", "Td", "Jc"]);
    assert.ok(result.groups.board.boardConnectivityScore > 0);
  });

  it("detects open-ended straight draw", () => {
    const result = spot(["8h", "9d"], ["6c", "7s", "2d"]);
    assert.equal(result.groups.draws.openEndedStraightDrawFlag, 1);
    assert.ok(result.groups.draws.straightOutCount >= 8);
  });

  it("detects gutshot", () => {
    const result = spot(["9h", "Jd"], ["Qc", "8s", "2d"]);
    assert.equal(result.groups.draws.gutshotFlag, 1);
    assert.equal(result.groups.draws.straightOutCount, 4);
  });

  it("detects flush draw", () => {
    const result = spot(["Ah", "Kh"], ["2h", "7h", "9c"]);
    assert.ok(result.groups.draws.flushOutCount >= 9);
  });

  it("detects combination draw", () => {
    const result = spot(["8h", "9h"], ["7h", "6s", "2h"]);
    assert.equal(result.groups.draws.comboDrawFlag, 1);
  });

  it("made flush on turn has no flush outs", () => {
    const result = spot(["Ah", "Kh"], ["2h", "7h", "Jh", "Qc"]);
    assert.equal(result.groups.draws.drawFeaturesAvailable, 1);
    assert.equal(result.groups.draws.flushOutCount, 0);
  });

  it("full house maps category one-hot", () => {
    const result = spot(["Qh", "Qd"], ["Qc", "2d", "2h"]);
    assert.equal(result.metadata.category, "fullHouse");
    assert.equal(result.groups.core.categoryFullHouse, 1);
  });

  it("river disables draw and runout availability flags", () => {
    const result = spot(["As", "Kd"], ["2c", "7h", "Jh", "Qc", "3d"]);
    assert.equal(result.street, "river");
    assert.equal(result.groups.draws.drawFeaturesAvailable, 0);
    assert.equal(result.groups.runouts.equityRunoutAvailable, 0);
    assert.equal(result.groups.vulnerability.runoutVulnerabilityAvailable, 0);
  });

  it("preflop disables board and draw groups", () => {
    const result = spot(["As", "Kd"], []);
    assert.equal(result.groups.board.boardFeaturesAvailable, 0);
    assert.equal(result.groups.draws.drawFeaturesAvailable, 0);
    assert.ok(result.groups.core.equityVsRandom > 0);
    assert.equal(result.groups.runouts.equityRunoutAvailable, 0);
  });

  it("full exact budget exposes category transition summaries", () => {
    const result = extractGeometryFeatures(
      { hero: ["As", "Kd"], board: ["2c", "7h", "Jh"] },
      { exactFeatureBudget: "full" },
    );
    assert.equal(result.groups.transitions.categoryTransitionAvailable, 1);
    assert.ok(result.groups.transitions.transitionEntropy >= 0);
  });

  it("production budget disables expensive exact transition summaries", () => {
    const result = spot(["As", "Kd"], ["2c", "7h", "Jh"]);
    assert.equal(result.groups.transitions.categoryTransitionAvailable, 0);
  });

  it("turn disables category transition availability", () => {
    const result = spot(["As", "Kd"], ["2c", "7h", "Jh", "Qc"]);
    assert.equal(result.groups.transitions.categoryTransitionAvailable, 0);
  });
});

describe("extractGeometryFeatures native availability", () => {
  it("reports whether poker-calculations native addon loaded", () => {
    assert.equal(typeof nativeOk, "boolean");
    if (requireNative) {
      assert.equal(nativeOk, true, "poker-calculations native addon is required in CI");
    }
  });
});
