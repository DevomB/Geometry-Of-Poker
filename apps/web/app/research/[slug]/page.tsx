import Link from "next/link";
import { notFound } from "next/navigation";
import { MarkdownContent } from "@/components/research/MarkdownContent";
import { getResearchDoc, getResearchDocs } from "@/lib/research/docs";

interface ResearchDocPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getResearchDocs().map((doc) => ({ slug: doc.slug }));
}

export async function generateMetadata({ params }: ResearchDocPageProps) {
  const { slug } = await params;
  const doc = getResearchDoc(slug);
  if (!doc) return {};
  return {
    title: `${doc.title} - Geometry of Poker`,
    description: doc.excerpt,
  };
}

export default async function ResearchDocPage({ params }: ResearchDocPageProps) {
  const { slug } = await params;
  const doc = getResearchDoc(slug);
  if (!doc) notFound();

  return (
    <main className="min-h-screen bg-[#08080c] text-zinc-200">
      <article className="mx-auto max-w-4xl px-6 py-8">
        <header className="border-b border-white/10 pb-8">
          <div className="flex items-center justify-between gap-4">
            <Link href="/research" className="text-xs text-zinc-500 transition hover:text-zinc-300">
              Back to research index
            </Link>
            <Link href="/" className="text-xs text-zinc-500 transition hover:text-zinc-300">
              Viewer
            </Link>
          </div>
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
            Repository research doc
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-50">
            {doc.title}
          </h1>
          {doc.excerpt && (
            <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-400">
              {doc.excerpt}
            </p>
          )}
          <p className="gop-mono mt-4 text-xs text-zinc-600">{doc.filename}</p>
        </header>

        <div className="grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_14rem]">
          <div className="min-w-0">
            <MarkdownContent markdown={doc.markdown} />
          </div>

          {doc.headings.length > 0 && (
            <aside className="hidden lg:block">
              <div className="sticky top-6 rounded border border-white/10 bg-white/[0.02] p-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  On this page
                </p>
                <nav aria-label="Document sections">
                  <ol className="space-y-1">
                    {doc.headings.map((heading) => (
                      <li key={heading.id}>
                        <a
                          href={`#${heading.id}`}
                          className={`block truncate text-[11px] leading-5 text-zinc-500 transition hover:text-cyan-200 ${
                            heading.level === 3 ? "pl-3" : ""
                          }`}
                          title={heading.text}
                        >
                          {heading.text}
                        </a>
                      </li>
                    ))}
                  </ol>
                </nav>
              </div>
            </aside>
          )}
        </div>
      </article>
    </main>
  );
}
