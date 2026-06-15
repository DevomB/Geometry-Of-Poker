import { describe, expect, it, vi } from "vitest";

describe("POST /api/state-metrics", () => {
  it("passes accepted dead cards into exact metric extraction", async () => {
    const extractGeometryFeatures = vi.fn(() => ({
      groups: {
        runouts: { equityRunoutAvailable: 1 },
        vulnerability: { runoutVulnerabilityAvailable: 1 },
      },
    }));

    vi.doMock("@geometry-of-poker/feature-engine", () => ({
      extractGeometryFeatures,
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
    expect(extractGeometryFeatures).toHaveBeenCalledWith(
      {
        hero: ["As", "Kd"],
        board: ["2c", "7h", "Js"],
        deadCards: ["Qc"],
      },
      { mode: "compact", exactFeatureBudget: "full" },
    );

    vi.doUnmock("@geometry-of-poker/feature-engine");
  });
});
