import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type {
  ApiErrorResponse,
  HealthResponse,
  ProjectResponse,
  Street,
} from "@geometry-of-poker/shared";
import type { BrowserMetadata } from "@/lib/types";
import { createArtifactFixture } from "./fixture-artifacts";

const fixture = createArtifactFixture();
let healthGET: typeof import("@/app/api/health/route").GET;
let manifestsGET: typeof import("@/app/api/manifests/route").GET;
let projectPOST: typeof import("@/app/api/project/route").POST;

beforeAll(async () => {
  process.env.GOP_PUBLIC_ARTIFACTS_ROOT = fixture.root;
  vi.resetModules();
  healthGET = (await import("@/app/api/health/route")).GET;
  manifestsGET = (await import("@/app/api/manifests/route")).GET;
  projectPOST = (await import("@/app/api/project/route")).POST;
});

afterAll(() => {
  delete process.env.GOP_PUBLIC_ARTIFACTS_ROOT;
  fixture.cleanup();
});

function request(payload: unknown) {
  return new Request("http://localhost/api/project", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

function sampleState(street: Street) {
  const file = join(fixture.root, street, "browser-metadata.json");
  const metadata = JSON.parse(readFileSync(file, "utf8")) as BrowserMetadata;
  const point = metadata.points[0]!;
  return { hero: point.hero, board: point.board, street };
}

describe("api routes", () => {
  it("reports health with available artifacts and native status", async () => {
    const res = await healthGET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as HealthResponse;
    expect(body.availableStreets).toEqual(["preflop", "flop", "turn", "river"]);
    expect(["ready", "degraded"]).toContain(body.status);
    expect(typeof body.pokerCalculations.available).toBe("boolean");
  });

  it("returns browser-safe manifests for all streets", async () => {
    const res = await manifestsGET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { streets: Record<Street, { artifacts: Record<string, string> }> };
    expect(Object.keys(body.streets).sort()).toEqual(["flop", "preflop", "river", "turn"]);
    expect(body.streets.flop.artifacts.pointsBin).toContain("/artifacts/embeddings/flop/");
    expect(body.streets.flop.artifacts.projectionIndexBin).toContain("projection-index.bin");
  });

  for (const street of ["preflop", "flop", "turn", "river"] as const) {
    it(`projects an exact ${street} fixture state`, async () => {
      const res = await projectPOST(request(sampleState(street)));
      expect(res.status).toBe(200);
      const body = (await res.json()) as ProjectResponse;
      expect(body.state.street).toBe(street);
      expect(Number.isFinite(body.projectedPoint.x)).toBe(true);
      expect(body.nearestNeighbors.length).toBeGreaterThan(0);
      expect(body.projectionMethod).toBe("exact-match");
    });
  }

  it("returns a production-safe error when non-exact projection cannot extract features", async () => {
    const res = await projectPOST(
      request({ hero: ["Ah", "Ad"], board: ["2c", "7h", "Jh"], street: "flop" }),
    );
    const body = (await res.json()) as ProjectResponse | ApiErrorResponse;
    if (res.status === 200) {
      expect((body as ProjectResponse).projectionMethod).toBe("pca-knn-interpolation");
      expect(Number.isFinite((body as ProjectResponse).projectedPoint.x)).toBe(true);
    } else {
      expect(res.status).toBe(503);
      expect((body as ApiErrorResponse).error.code).toBe("FEATURE_ENGINE_UNAVAILABLE");
    }
  });

  it("rejects duplicate cards", async () => {
    const res = await projectPOST(
      request({ hero: ["As", "As"], board: [], street: "preflop" }),
    );
    const body = (await res.json()) as ApiErrorResponse;
    expect(res.status).toBe(400);
    expect(body.error.code).toBe("DUPLICATE_CARD");
  });

  it("rejects malformed cards", async () => {
    const res = await projectPOST(
      request({ hero: ["Ax", "Kd"], board: [], street: "preflop" }),
    );
    const body = (await res.json()) as ApiErrorResponse;
    expect(res.status).toBe(400);
    expect(body.error.code).toBe("MALFORMED_CARD");
  });

  it("rejects invalid board length", async () => {
    const res = await projectPOST(
      request({ hero: ["As", "Kd"], board: ["2c", "3d"], street: "flop" }),
    );
    const body = (await res.json()) as ApiErrorResponse;
    expect(res.status).toBe(400);
    expect(body.error.code).toBe("INVALID_BOARD_LENGTH");
  });

  it("rejects dead-card collisions", async () => {
    const res = await projectPOST(
      request({ hero: ["As", "Kd"], board: [], deadCards: ["As"], street: "preflop" }),
    );
    const body = (await res.json()) as ApiErrorResponse;
    expect(res.status).toBe(400);
    expect(body.error.code).toBe("DUPLICATE_CARD");
  });
});
