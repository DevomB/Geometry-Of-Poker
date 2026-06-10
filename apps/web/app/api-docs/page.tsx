import Link from "next/link";
import {
  ApiDocsShell,
  MethodBadge,
  Prose,
  Section,
} from "@/components/api-docs/ApiDocsShell";
import { CodePanel } from "@/components/api-docs/CodePanel";
import { API_BASE_NOTE, API_ENDPOINTS } from "@/lib/api-docs/catalog";

export default function ApiDocsOverviewPage() {
  return (
    <ApiDocsShell>
      <header className="border-b border-white/10 pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
          HTTP JSON API
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-50">
          Analyze Texas Hold&apos;em states programmatically
        </h1>
        <Prose>
          The Geometry of Poker API exposes exact combinatorial poker math from the native{" "}
          <code className="gop-mono text-zinc-300">poker-calculations</code> engine. Start with{" "}
          <strong className="font-medium text-zinc-200">POST /api/state</strong> for standalone
          analysis — no embedding artifacts required. Use{" "}
          <strong className="font-medium text-zinc-200">POST /api/project</strong> when you also
          need 3D map coordinates.
        </Prose>
      </header>

      <Section id="quick-start" title="Quick start">
        <CodePanel
          label="curl"
          language="bash"
          code={`curl -sS -X POST "https://<your-host>/api/state" \\
  -H "Content-Type: application/json" \\
  -d '{"hero":["8d","2d"],"board":["4h","9h","Tc","3d"]}'`}
        />
        <Prose>{API_BASE_NOTE}</Prose>
      </Section>

      <Section id="endpoints" title="Endpoints">
        <div className="grid gap-3">
          {API_ENDPOINTS.map((endpoint) => (
            <Link
              key={endpoint.slug}
              href={`/api-docs/${endpoint.slug}`}
              className="group rounded-xl border border-white/10 bg-white/[0.02] p-5 transition hover:border-cyan-400/25 hover:bg-cyan-500/[0.03]"
            >
              <div className="flex flex-wrap items-center gap-3">
                <MethodBadge method={endpoint.method} />
                <code className="gop-mono text-sm text-cyan-100/90">{endpoint.path}</code>
                {endpoint.requiresArtifacts && (
                  <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-violet-200/80">
                    artifacts
                  </span>
                )}
              </div>
              <h3 className="mt-3 text-base font-medium text-zinc-100 group-hover:text-white">
                {endpoint.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-zinc-500">{endpoint.summary}</p>
            </Link>
          ))}
        </div>
      </Section>

      <Section id="conventions" title="Conventions">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
            <h3 className="text-sm font-medium text-zinc-200">Request body</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              POST routes accept <code className="gop-mono text-zinc-300">application/json</code>{" "}
              up to 2KB. Cards are normalized to rank+suit (e.g.{" "}
              <code className="gop-mono text-zinc-300">As</code>).
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
            <h3 className="text-sm font-medium text-zinc-200">Errors</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Failures return <code className="gop-mono text-zinc-300">{"{ error: { code, message, field? } }"}</code>{" "}
              with an appropriate HTTP status.
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
            <h3 className="text-sm font-medium text-zinc-200">Street inference</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Board length implies street: 0 = preflop, 3 = flop, 4 = turn, 5 = river. An explicit{" "}
              <code className="gop-mono text-zinc-300">street</code> must match the board.
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
            <h3 className="text-sm font-medium text-zinc-200">Limitations</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Equity is vs a uniform random villain. No bet sizing, position, ICM, or GTO modeling.
              See each endpoint for availability flags.
            </p>
          </div>
        </div>
      </Section>
    </ApiDocsShell>
  );
}
