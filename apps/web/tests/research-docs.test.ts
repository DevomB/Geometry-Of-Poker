import { describe, expect, it } from "vitest";
import {
  categoryForSlug,
  getResearchDoc,
  getResearchDocs,
  slugifyHeading,
  tagsForSlug,
} from "@/lib/research/docs";
import {
  categoryCounts,
  filterResearchDocs,
} from "@/lib/research/filter-docs";

describe("research docs", () => {
  it("loads repository Markdown docs for static research pages", () => {
    const docs = getResearchDocs();
    expect(docs.some((doc) => doc.slug === "combinatorial-proofs")).toBe(true);
    expect(docs.some((doc) => doc.slug === "statistical-standing")).toBe(true);
    expect(docs.some((doc) => doc.slug === "street-atlas")).toBe(true);
    expect(docs.some((doc) => doc.slug === "cluster-profiles")).toBe(true);
    expect(docs.some((doc) => doc.slug === "release-dashboard")).toBe(true);

    const proofDoc = getResearchDoc("combinatorial-proofs");
    expect(proofDoc?.title).toBe("Combinatorial Proofs - Geometry of Poker");
    expect(proofDoc?.headings.some((heading) => heading.id === "legal-villain-hand-count")).toBe(true);
  });

  it("creates stable heading anchors", () => {
    expect(slugifyHeading("Legal villain hand count")).toBe("legal-villain-hand-count");
    expect(slugifyHeading("PCA/UMAP: metric caveats")).toBe("pcaumap-metric-caveats");
  });

  it("classifies and filters research docs", () => {
    const docs = getResearchDocs();
    const counts = categoryCounts(docs);

    expect(categoryForSlug("combinatorial-proofs")).toBe("Math");
    expect(categoryForSlug("cluster-profiles")).toBe("Statistics");
    expect(categoryForSlug("release-dashboard")).toBe("Engineering");
    expect(tagsForSlug("cluster-profiles")).toContain("cluster");
    expect(counts.get("All")).toBe(docs.length);

    const mathDocs = filterResearchDocs(docs, "", "Math");
    expect(mathDocs.every((doc) => doc.category === "Math")).toBe(true);

    const clusterDocs = filterResearchDocs(docs, "cluster", "All");
    expect(clusterDocs.some((doc) => doc.slug === "cluster-profiles")).toBe(true);
  });
});
