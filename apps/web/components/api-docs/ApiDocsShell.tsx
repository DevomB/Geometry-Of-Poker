import Link from "next/link";
import { API_ENDPOINTS } from "@/lib/api-docs/catalog";

export function ApiDocsShell({
  children,
  activeSlug,
}: {
  children: React.ReactNode;
  activeSlug?: string;
}) {
  return (
    <div className="min-h-screen bg-[#08080c] text-zinc-200">
      <div className="border-b border-white/10 bg-[#0a0a0f]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
              Geometry of Poker
            </p>
            <h1 className="mt-1 text-lg font-semibold tracking-tight text-zinc-50">
              API Reference
            </h1>
          </div>
          <nav className="flex items-center gap-4 text-xs">
            <Link href="/" className="text-zinc-500 transition hover:text-zinc-200">
              Viewer
            </Link>
            <Link href="/research" className="text-zinc-500 transition hover:text-zinc-200">
              Research
            </Link>
            <Link href="/map" className="hidden text-zinc-500 transition hover:text-zinc-200 sm:inline-block">
              Map
            </Link>
          </nav>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <nav aria-label="API endpoints" className="space-y-1">
            <Link
              href="/api-docs"
              className={`block rounded-md px-3 py-2 text-sm transition ${
                !activeSlug
                  ? "bg-cyan-500/10 text-cyan-100 ring-1 ring-cyan-400/20"
                  : "text-zinc-400 hover:bg-white/[0.03] hover:text-zinc-100"
              }`}
            >
              Overview
            </Link>
            {API_ENDPOINTS.map((endpoint) => (
              <Link
                key={endpoint.slug}
                href={`/api-docs/${endpoint.slug}`}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition ${
                  activeSlug === endpoint.slug
                    ? "bg-cyan-500/10 text-cyan-100 ring-1 ring-cyan-400/20"
                    : "text-zinc-400 hover:bg-white/[0.03] hover:text-zinc-100"
                }`}
              >
                <MethodBadge method={endpoint.method} compact />
                <span className="truncate">{endpoint.title}</span>
              </Link>
            ))}
          </nav>

          <div className="mt-6 rounded-lg border border-white/10 bg-white/[0.02] p-3 text-[11px] leading-5 text-zinc-500">
            <p className="font-medium text-zinc-400">Card format</p>
            <p className="mt-1 gop-mono text-zinc-500">
              Rank + suit, e.g. <span className="text-zinc-300">As</span>,{" "}
              <span className="text-zinc-300">Td</span>, <span className="text-zinc-300">2c</span>
            </p>
          </div>
        </aside>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

export function MethodBadge({
  method,
  compact,
}: {
  method: "GET" | "POST";
  compact?: boolean;
}) {
  const colors =
    method === "GET"
      ? "bg-emerald-500/15 text-emerald-300 ring-emerald-400/25"
      : "bg-amber-500/15 text-amber-300 ring-amber-400/25";

  return (
    <span
      className={`gop-mono inline-flex shrink-0 items-center justify-center rounded font-semibold uppercase ring-1 ${
        compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]"
      } ${colors}`}
    >
      {method}
    </span>
  );
}

export function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-8 border-b border-white/10 py-8 last:border-b-0">
      <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-400">
        {title}
      </h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export function Prose({ children }: { children: React.ReactNode }) {
  return <p className="max-w-3xl text-sm leading-7 text-zinc-400">{children}</p>;
}

export function EndpointHero({
  method,
  path,
  title,
  summary,
  tags,
}: {
  method: "GET" | "POST";
  path: string;
  title: string;
  summary: string;
  tags?: string[];
}) {
  return (
    <header className="border-b border-white/10 pb-8">
      <div className="flex flex-wrap items-center gap-3">
        <MethodBadge method={method} />
        <code className="gop-mono rounded-md border border-white/10 bg-black/30 px-3 py-1.5 text-sm text-cyan-100">
          {path}
        </code>
      </div>
      <h1 className="mt-5 text-3xl font-semibold tracking-tight text-zinc-50">{title}</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">{summary}</p>
      {tags && tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-zinc-500"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </header>
  );
}
