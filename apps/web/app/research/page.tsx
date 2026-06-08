import Link from "next/link";
import { AboutResearchContent } from "@/components/research/AboutResearchContent";
import { ResearchDocBrowser } from "@/components/research/ResearchDocBrowser";
import { getResearchDocs } from "@/lib/research/docs";

export const metadata = {
  title: "About Research - Geometry of Poker",
  description: "Methodology, claims, and limitations for the Geometry of Poker research visualization.",
};

export default function ResearchPage() {
  const docs = getResearchDocs();

  return (
    <main className="min-h-screen bg-[#0a0a0f]">
      <AboutResearchContent />

      <section className="mx-auto max-w-5xl border-t border-white/10 px-6 py-10">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
              Repository docs
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              These pages are rendered directly from the Markdown research files in
              the repo, so methodology, proofs, limits, and implementation notes stay
              connected to the shipped product.
            </p>
          </div>
          <Link
            href="/"
            className="hidden text-xs text-zinc-500 transition hover:text-zinc-300 md:inline-block"
          >
            Viewer
          </Link>
          <Link
            href="/release"
            className="hidden text-xs text-zinc-500 transition hover:text-zinc-300 md:inline-block"
          >
            Release
          </Link>
        </div>

        <ResearchDocBrowser docs={docs} />
      </section>
    </main>
  );
}
