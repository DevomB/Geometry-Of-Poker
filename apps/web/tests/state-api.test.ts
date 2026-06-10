import { describe, expect, it, vi, beforeAll } from "vitest";
import type { ApiErrorResponse, StateResponse } from "@geometry-of-poker/shared";

let statePOST: typeof import("@/app/api/state/route").POST;

beforeAll(async () => {
  vi.resetModules();
  statePOST = (await import("@/app/api/state/route")).POST;
});

function request(payload: unknown) {
  return new Request("http://localhost/api/state", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

describe("POST /api/state", () => {
  it("rejects duplicate cards", async () => {
    const res = await statePOST(
      request({ hero: ["As", "Kd"], board: ["As", "2c", "3d"] }),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as ApiErrorResponse;
    expect(body.error.code).toBe("DUPLICATE_CARD");
  });

  it("rejects invalid exactFeatureBudget", async () => {
    const res = await statePOST(
      request({
        hero: ["As", "Kd"],
        board: ["2c", "3d", "4h"],
        exactFeatureBudget: "turbo",
      }),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as ApiErrorResponse;
    expect(body.error.code).toBe("INVALID_FEATURE_BUDGET");
  });

  it("analyzes a turn state with vulnerability availability when engine is present", async () => {
    const res = await statePOST(
      request({ hero: ["8d", "2d"], board: ["4h", "9h", "Tc", "3d"] }),
    );

    if (res.status === 503) {
      const body = (await res.json()) as ApiErrorResponse;
      expect(body.error.code).toBe("FEATURE_ENGINE_UNAVAILABLE");
      return;
    }

    expect(res.status).toBe(200);
    const body = (await res.json()) as StateResponse;
    expect(body.state.street).toBe("turn");
    expect(body.exactFeatureBudget).toBe("full");
    expect(body.metadata.category).toBeTruthy();
    expect(body.equityVsRandom).toBeGreaterThan(0);
    expect(body.combinatorics.knownCards).toBe(6);
    expect(body.combinatorics.legalVillainHands).toMatch(/^\d+$/);
    expect(body.features.vulnerability).toBeDefined();
    expect(body.availability.drawFeatures).toBe(true);
    expect(body.limitations.length).toBeGreaterThan(0);

    if (body.availability.runoutVulnerability) {
      expect(body.features.vulnerability.pNuts).toBeGreaterThanOrEqual(0);
      expect(body.features.vulnerability.pDominated).toBeGreaterThanOrEqual(0);
    }
  }, 30_000);

  it("analyzes preflop with production budget", async () => {
    const res = await statePOST(
      request({
        hero: ["As", "Kd"],
        board: [],
        exactFeatureBudget: "production",
      }),
    );

    if (res.status === 503) return;

    expect(res.status).toBe(200);
    const body = (await res.json()) as StateResponse;
    expect(body.state.street).toBe("preflop");
    expect(body.exactFeatureBudget).toBe("production");
    expect(body.availability.equityRunout).toBe(false);
    expect(body.availability.removalGradient).toBe(false);
  });
});
