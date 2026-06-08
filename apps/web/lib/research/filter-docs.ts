import type { ResearchDocCategory, ResearchDocSummary } from "@/lib/research/docs";

export const RESEARCH_CATEGORIES: Array<ResearchDocCategory | "All"> = [
  "All",
  "Core",
  "Math",
  "Statistics",
  "Engineering",
  "Limits",
  "Notes",
];

export function filterResearchDocs(
  docs: ResearchDocSummary[],
  query: string,
  category: ResearchDocCategory | "All",
): ResearchDocSummary[] {
  const normalizedQuery = normalize(query);
  return docs.filter((doc) => {
    if (category !== "All" && doc.category !== category) return false;
    if (!normalizedQuery) return true;
    return searchableText(doc).includes(normalizedQuery);
  });
}

export function categoryCounts(docs: ResearchDocSummary[]) {
  const counts = new Map<ResearchDocCategory | "All", number>();
  counts.set("All", docs.length);
  for (const doc of docs) {
    counts.set(doc.category, (counts.get(doc.category) ?? 0) + 1);
  }
  return counts;
}

function searchableText(doc: ResearchDocSummary): string {
  return normalize(
    [
      doc.title,
      doc.excerpt,
      doc.filename,
      doc.slug,
      doc.category,
      ...doc.tags,
    ].join(" "),
  );
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}
