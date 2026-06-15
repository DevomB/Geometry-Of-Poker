import { afterEach, describe, expect, it, vi } from "vitest";
import type { ApiErrorResponse, HealthResponse } from "@geometry-of-poker/shared";

function projectRequest() {
  return new Request("http://localhost/api/project", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      hero: ["As", "Kd"],
      board: ["2c", "7h", "Js"],
      street: "flop",
    }),
  });
}

describe("remote artifact availability", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    delete process.env.GOP_ARTIFACT_BASE_URL;
  });

  it("reports no reachable blob streets when remote manifests are unavailable", async () => {
    process.env.GOP_ARTIFACT_BASE_URL = "https://artifacts.example/releases/test";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("not found", { status: 404 })),
    );
    vi.resetModules();

    const { GET } = await import("@/app/api/health/route");
    const res = await GET();
    const body = (await res.json()) as HealthResponse;

    expect(res.status).toBe(200);
    expect(body.artifactMode).toBe("blob");
    expect(body.status).toBe("misconfigured");
    expect(body.ok).toBe(false);
    expect(body.availableStreets).toEqual([]);
  });

  it("maps missing remote manifests to ARTIFACTS_UNAVAILABLE", async () => {
    process.env.GOP_ARTIFACT_BASE_URL = "https://artifacts.example/releases/test";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("not found", { status: 404 })),
    );
    vi.resetModules();

    const [{ GET }, { POST }] = await Promise.all([
      import("@/app/api/manifests/route"),
      import("@/app/api/project/route"),
    ]);

    const manifests = await GET();
    const manifestsBody = (await manifests.json()) as ApiErrorResponse;
    expect(manifests.status).toBe(503);
    expect(manifestsBody.error.code).toBe("ARTIFACTS_UNAVAILABLE");

    const project = await POST(projectRequest());
    const projectBody = (await project.json()) as ApiErrorResponse;
    expect(project.status).toBe(503);
    expect(projectBody.error.code).toBe("ARTIFACTS_UNAVAILABLE");
  });
});
