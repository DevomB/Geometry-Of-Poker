import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { createArtifactFixture } from "./fixture-artifacts";

const fixture = createArtifactFixture();
afterAll(() => fixture.cleanup());

describe("release artifact validator", () => {
  it("accepts complete GOPK/GOPC/GOPI fixture artifacts", () => {
    const script = join(process.cwd(), "..", "..", "scripts", "validate-release-artifacts.mjs");
    const result = spawnSync(process.execPath, [script, "--root", fixture.root], {
      cwd: join(process.cwd(), "..", ".."),
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Artifact release validation passed.");
  });
});
