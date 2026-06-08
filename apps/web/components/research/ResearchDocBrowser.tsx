"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ResearchDocCategory, ResearchDocSummary } from "@/lib/research/docs";
import {
  RESEARCH_CATEGORIES,
  categoryCounts,
  filterResearchDocs,
} from "@/lib/research/filter-docs";

interface ResearchDocBrowserProps {
  docs: ResearchDocSummary[];
}

export function ResearchDocBrowser({ docs }: ResearchDocBrowserProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ResearchDocCategory | "All">("All");
  const counts = useMemo(() => categoryCounts(docs), [docs]);
  const visibleDocs = useMemo(
    () => filterResearchDocs(docs, query, category),
    [category, docs, query],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-1">
          {RESEARCH_CATEGORIES.map((item) => {
            const active = item === category;
            const count = counts.get(item) ?? 0;
            if (count === 0 && item !== "All") return null;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`rounded border px-2 py-1 text-[11px] transition ${
                  active
                    ? "border-cyan-300/40 bg-cyan-500/15 text-cyan-100"
                    : "border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                }`}
              >
                {item}
                <span className="gop-mono ml-1 text-[10px] text-zinc-500">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <label className="relative block md:w-72">
          <span className="sr-only">Search research docs</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search docs"
            className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-cyan-300/50 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500 transition hover:text-zinc-300"
              aria-label="Clear search"
            >
              clear
            </button>
          )}
        </label>
      </div>

      <div className="flex items-center justify-between text-[11px] text-zinc-600">
        <span className="gop-mono tabular-nums">
          {visibleDocs.length}/{docs.length} docs
        </span>
        <span>{category}</span>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {visibleDocs.map((doc) => (
          <Link
            key={doc.slug}
            href={`/research/${doc.slug}`}
            className="rounded border border-white/10 bg-white/[0.025] p-4 transition hover:border-cyan-300/30 hover:bg-white/[0.045]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-cyan-300/60">
                  {doc.category}
                </p>
                <h3 className="text-sm font-medium text-zinc-100">{doc.title}</h3>
              </div>
              <span className="gop-mono shrink-0 text-[10px] text-zinc-600">
                MD
              </span>
            </div>
            {doc.excerpt && (
              <p className="mt-2 line-clamp-3 text-xs leading-5 text-zinc-500">
                {doc.excerpt}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-1">
              {doc.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="rounded border border-white/10 bg-black/20 px-1.5 py-0.5 text-[10px] text-zinc-500"
                >
                  {tag}
                </span>
              ))}
            </div>
            <p className="gop-mono mt-3 text-[10px] text-zinc-600">{doc.filename}</p>
          </Link>
        ))}
      </div>

      {visibleDocs.length === 0 && (
        <div className="rounded border border-dashed border-white/10 p-6 text-center text-sm text-zinc-500">
          No matching docs.
        </div>
      )}
    </div>
  );
}
