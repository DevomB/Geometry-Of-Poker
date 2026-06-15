import { describe, expect, it, vi } from "vitest";

describe("POST /api/state-metrics", () => {
  it("passes accepted dead cards into exact metric extraction", async () => {
    const exactHeroEquityRunoutQuantiles = vi.fn(() => ({
      mean: 0.5,
      variance: 0.02,
      p05: 0.2,
      p50: 0.5,
      p95: 0.8,
    }));
    const exactHeroRunoutVulnerability = vi.fn(() => ({
      pNuts: 0.1,
      pDominated: 0.2,
    }));

    vi.doMock("@geometry-of-poker/feature-engine", () => ({
      getPokerCalculations: () => ({
        exactHeroEquityRunoutQuantiles,
        exactHeroRunoutVulnerability,
      }),
    }));
    vi.resetModules();

    const { POST } = await import("@/app/api/state-metrics/route");
    const res = await POST(
      new Request("http://localhost/api/state-metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hero: ["As", "Kd"],
          board: ["2c", "7h", "Js"],
          deadCards: ["Qc"],
        }),
      }),
    );

    expect(res.status).toBe(200);
    expect(exactHeroEquityRunoutQuantiles).toHaveBeenCalledWith(
      ["As", "Kd"],
      ["2c", "7h", "Js"],
    );
    expect(exactHeroRunoutVulnerability).toHaveBeenCalledWith(
      ["As", "Kd"],
      ["2c", "7h", "Js"],
      ["Qc"],
    );
    await expect(res.json()).resolves.toEqual({
      metrics: {
        equityMean: 0.5,
        equityVariance: 0.02,
        equityP05: 0.2,
        equityP50: 0.5,
        equityP95: 0.8,
        equityRunoutAvailable: 1,
        pNuts: 0.1,
        pDominated: 0.2,
        runoutVulnerabilityAvailable: 1,
      },
    });

    vi.doUnmock("@geometry-of-poker/feature-engine");
  });
});
