import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type {
  ApiErrorResponse,
  HealthResponse,
  ProjectResponse,
  Street,
} from "@geometry-of-poker/shared";
import { GET as healthGET } from "@/app/api/health/route";
import { GET as manifestsGET } from "@/app/api/manifests/route";
import { POST as projectPOST } from "@/app/api/project/route";
import type { BrowserMetadata } from "@/lib/types";

function request(payload: unknown) {
  return new Request("http://localhost/api/project", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

function sampleState(street: Street) {
  const file = join(
    process.cwd(),
    `public/artifacts/embeddings/${street}/browser-metadata.json`,
  );
  const metadata = JSON.parse(readFileSync(file, "utf8")) as BrowserMetadata;
  const point = metadata.points[0]!;
  return { hero: point.hero, board: point.board, street };
}

describe("api routes", () => {
  it("reports health with available artifacts and native status", async () => {
    const res = await healthGET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as HealthResponse;
    expect(body.ok).toBe(true);
    expect(body.availableStreets).toEqual(["preflop", "flop", "turn", "river"]);
    expect(typeof body.pokerCalculations.available).toBe("boolean");
  });

  it("returns browser-safe manifests for all streets", async () => {
    const res = await manifestsGET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { streets: Record<Street, { artifacts: Record<string, string> }> };
    expect(Object.keys(body.streets).sort()).toEqual(["flop", "preflop", "river", "turn"]);
    expect(body.streets.flop.artifacts.pointsBin).toContain("/artifacts/embeddings/flop/");
  });

  for (const street of ["preflop", "flop", "turn", "river"] as const) {
    it(`projects a valid ${street} state`, async () => {
      const res = await projectPOST(request(sampleState(street)));
      expect(res.status).toBe(200);
      const body = (await res.json()) as ProjectResponse;
      expect(body.state.street).toBe(street);
      expect(Number.isFinite(body.projectedPoint.x)).toBe(true);
      expect(body.nearestNeighbors.length).toBeGreaterThan(0);
      expect(body.projectionMethod).toBe("precomputed-nearest-neighbor");
    });
  }

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
