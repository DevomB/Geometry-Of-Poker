import { describe, expect, it, afterAll } from "vitest";
import { createArtifactFixture, loadFixtureDataset } from "./fixture-artifacts";
import { projectIntoGeometry, findExactMatch } from "@/lib/projection/project-point";

const fixture = createArtifactFixture();
afterAll(() => fixture.cleanup());

describe("projection", () => {
  it("finds exact match in dataset by cards", () => {
    const dataset = loadFixtureDataset(fixture.root, "flop");
    const first = dataset.metadata[0]!;
    const idx = findExactMatch(dataset, first.hero, first.board);
    expect(idx).toBe(0);
  });

  it("finds exact match regardless of hero or board entry order", () => {
    const dataset = loadFixtureDataset(fixture.root, "river");
    const first = dataset.metadata[0]!;
    const idx = findExactMatch(
      dataset,
      [first.hero[1], first.hero[0]],
      [...first.board].reverse(),
    );
    expect(idx).toBe(0);
  });

  it("projects known hand to exact coordinates", () => {
    const dataset = loadFixtureDataset(fixture.root, "flop");
    const first = dataset.metadata[0]!;
    const result = projectIntoGeometry(dataset, {
      hero: first.hero,
      board: first.board,
    });
    expect(result.method).toBe("exact_match");
    expect(result.position).toEqual([first.x, first.y, first.z]);
    expect(result.neighborIds.length).toBeGreaterThan(0);
  });

  it("projects permuted known hand to exact coordinates", () => {
    const dataset = loadFixtureDataset(fixture.root, "turn");
    const first = dataset.metadata[0]!;
    const result = projectIntoGeometry(dataset, {
      hero: [first.hero[1], first.hero[0]],
      board: [...first.board].reverse(),
    });
    expect(result.method).toBe("exact_match");
    expect(result.position).toEqual([first.x, first.y, first.z]);
  });

  it("projects a non-dataset hand with PCA kNN interpolation", () => {
    const dataset = loadFixtureDataset(fixture.root, "flop");
    const result = projectIntoGeometry(dataset, {
      hero: ["Ah", "Ad"],
      board: ["2c", "7h", "Jh"],
      featureVector: [0.72, 1],
      featureNames: ["equityVsRandom", "categoryIndex"],
    });
    expect(result.method).toBe("pca_knn_interpolation");
    expect(result.position.every(Number.isFinite)).toBe(true);
    expect(result.neighborIds.length).toBe(3);
  });

  it("projects exact cards with dead-card blockers through PCA interpolation", () => {
    const dataset = loadFixtureDataset(fixture.root, "flop");
    const first = dataset.metadata[0]!;
    const result = projectIntoGeometry(dataset, {
      hero: first.hero,
      board: first.board,
      deadCards: ["Qs"],
      featureVector: [first.equityVsRandom, 1],
      featureNames: ["equityVsRandom", "categoryIndex"],
    });

    expect(result.method).toBe("pca_knn_interpolation");
    expect(result.position.every(Number.isFinite)).toBe(true);
  });

  it("requires projection artifacts for non-exact manual hands", () => {
    const dataset = loadFixtureDataset(fixture.root, "flop");
    dataset.projectionIndex = undefined;
    expect(() =>
      projectIntoGeometry(dataset, {
        hero: ["Ah", "Ad"],
        board: ["2c", "7h", "Jh"],
        featureVector: [0.72, 1],
        featureNames: ["equityVsRandom", "categoryIndex"],
      }),
    ).toThrow(/Projection index/);
  });
});
