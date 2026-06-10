import { describe, expect, it } from "vitest";
import { API_ENDPOINTS, getEndpointDoc } from "@/lib/api-docs/catalog";

describe("api docs catalog", () => {
  it("lists all documented endpoints", () => {
    expect(API_ENDPOINTS.map((endpoint) => endpoint.slug).sort()).toEqual([
      "health",
      "project",
      "state",
      "state-metrics",
    ]);
  });

  it("resolves endpoint metadata by slug", () => {
    const state = getEndpointDoc("state");
    expect(state?.path).toBe("/api/state");
    expect(state?.method).toBe("POST");
    expect(state?.requiresArtifacts).toBe(false);
  });
});
