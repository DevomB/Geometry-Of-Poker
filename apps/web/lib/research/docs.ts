import fs from "node:fs";
import path from "node:path";

export interface ResearchDocSummary {
  slug: string;
  title: string;
  excerpt: string;
  filename: string;
  category: ResearchDocCategory;
  tags: string[];
}

export type ResearchDocCategory =
  | "Core"
  | "Math"
  | "Statistics"
  | "Engineering"
  | "Limits"
  | "Notes";

export interface ResearchDocHeading {
  id: string;
  level: number;
  text: string;
}

export interface ResearchDoc extends ResearchDocSummary {
  markdown: string;
  headings: ResearchDocHeading[];
}

const DOC_ORDER = [
  "state-api",
  "research-methodology",
  "math-showpiece",
  "combinatorial-proofs",
  "statistical-standing",
  "street-atlas",
  "cluster-profiles",
  "topology-and-clustering-audit",
  "performance-analysis",
  "limitations",
  "feature-schema",
  "dataset-generation",
  "pipeline",
  "pipeline-embedding",
  "architecture",
  "research-notes",
];

export function getResearchDocs(): ResearchDocSummary[] {
  const docsDir = resolveDocsDir();
  return fs
    .readdirSync(docsDir)
    .filter((filename) => filename.endsWith(".md"))
    .map((filename) => {
      const markdown = fs.readFileSync(path.join(docsDir, filename), "utf8");
      return summarizeDoc(filename, markdown);
    })
    .sort((a, b) => {
      const ai = DOC_ORDER.indexOf(a.slug);
      const bi = DOC_ORDER.indexOf(b.slug);
      if (ai === -1 && bi === -1) return a.title.localeCompare(b.title);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
}

export function getResearchDoc(slug: string): ResearchDoc | null {
  const docsDir = resolveDocsDir();
  const safeSlug = slug.replace(/[^a-z0-9-]/gi, "");
  const filename = `${safeSlug}.md`;
  const fullPath = path.join(docsDir, filename);
  if (!fs.existsSync(fullPath)) return null;
  const markdown = fs.readFileSync(fullPath, "utf8");
  return { ...summarizeDoc(filename, markdown), markdown, headings: extractHeadings(markdown) };
}

function summarizeDoc(filename: string, markdown: string): ResearchDocSummary {
  const slug = filename.replace(/\.md$/, "");
  const title =
    markdown
      .split(/\r?\n/)
      .find((line) => line.startsWith("# "))
      ?.replace(/^#\s+/, "")
      .trim() || titleFromSlug(slug);
  const excerpt =
    markdown
      .split(/\r?\n\r?\n/)
      .map((block) => block.replace(/\s+/g, " ").trim())
      .find((block) => block.length > 0 && !block.startsWith("#")) || "";

  return {
    slug,
    title,
    excerpt: stripMarkdown(excerpt).slice(0, 220),
    filename,
    category: categoryForSlug(slug),
    tags: tagsForSlug(slug),
  };
}

export function categoryForSlug(slug: string): ResearchDocCategory {
  if (
    slug === "math-showpiece" ||
    slug === "combinatorial-proofs"
  ) {
    return "Math";
  }
  if (
    slug === "statistical-standing" ||
    slug === "street-atlas" ||
    slug === "cluster-profiles" ||
    slug === "topology-and-clustering-audit"
  ) {
    return "Statistics";
  }
  if (
    slug === "architecture" ||
    slug === "dataset-generation" ||
    slug === "feature-schema" ||
    slug === "performance-analysis" ||
    slug === "pipeline" ||
    slug === "pipeline-embedding" ||
    slug === "release-dashboard" ||
    slug === "state-api"
  ) {
    return "Engineering";
  }
  if (slug === "limitations") return "Limits";
  if (slug === "research-notes") return "Notes";
  return "Core";
}

export function tagsForSlug(slug: string): string[] {
  const tags = slug
    .split("-")
    .filter((part) => part.length > 2);
  const category = categoryForSlug(slug).toLowerCase();
  return [...new Set([category, ...tags])];
}

function resolveDocsDir(): string {
  const candidates = [
    path.resolve(process.cwd(), "docs"),
    path.resolve(process.cwd(), "..", "docs"),
    path.resolve(process.cwd(), "..", "..", "docs"),
  ];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    throw new Error(`Unable to locate docs directory from ${process.cwd()}`);
  }
  return found;
}

function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.slice(0, 1).toUpperCase() + word.slice(1))
    .join(" ");
}

function stripMarkdown(value: string): string {
  return value
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^[-*>#\s]+/, "")
    .trim();
}

function extractHeadings(markdown: string): ResearchDocHeading[] {
  const seen = new Map<string, number>();
  return markdown
    .split(/\r?\n/)
    .map((line) => line.match(/^(#{2,3})\s+(.+)$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => {
      const text = stripMarkdown(match[2]!.trim());
      const base = slugifyHeading(text);
      const count = seen.get(base) ?? 0;
      seen.set(base, count + 1);
      return {
        id: count === 0 ? base : `${base}-${count + 1}`,
        level: match[1]!.length,
        text,
      };
    });
}

export function slugifyHeading(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return slug || "section";
}
