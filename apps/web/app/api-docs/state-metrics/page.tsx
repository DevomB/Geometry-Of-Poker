import {
  ApiDocsShell,
  EndpointHero,
  Prose,
  Section,
} from "@/components/api-docs/ApiDocsShell";
import { Callout, CodePanel, ParamTable } from "@/components/api-docs/CodePanel";
import { requireEndpointDoc } from "@/lib/api-docs/catalog";

const endpoint = requireEndpointDoc("state-metrics");

const REQUEST = `{
  "hero": ["8d", "2d"],
  "board": ["4h", "9h", "Tc", "3d"]
}`;

const RESPONSE = `{
  "metrics": {
    "equityMean": 0,
    "equityVariance": 0,
    "equityP05": 0,
    "equityP50": 0,
    "equityP95": 0,
    "equityRunoutAvailable": 0,
    "pNuts": 0.12,
    "pDominated": 0.08,
    "runoutVulnerabilityAvailable": 1
  }
}`;

export default function StateMetricsApiDocsPage() {
  return (
    <ApiDocsShell activeSlug="state-metrics">
      <EndpointHero
        method={endpoint.method}
        path={endpoint.path}
        title={endpoint.title}
        summary={endpoint.summary}
        tags={endpoint.tags}
      />

      <Callout>
        Legacy endpoint used by the viewer inspector backfill. New integrations should use{" "}
        <a href="/api-docs/state" className="text-cyan-200 underline-offset-2 hover:underline">
          POST /api/state
        </a>{" "}
        instead.
      </Callout>

      <Section id="request" title="Request">
        <Prose>Same card payload as POST /api/state (without exactFeatureBudget).</Prose>
        <ParamTable
          rows={[
            { name: "hero", type: "[string, string]", required: true, description: "Hole cards." },
            { name: "board", type: "string[]", required: true, description: "Community cards." },
            { name: "deadCards", type: "string[]", required: false, description: "Optional dead cards." },
          ]}
        />
        <CodePanel label="Example body" code={REQUEST} />
      </Section>

      <Section id="response" title="Response">
        <Prose>
          Flat <code className="gop-mono text-zinc-300">metrics</code> object with runout quantiles
          and vulnerability fields only. Always uses exact feature budget internally.
        </Prose>
        <CodePanel label="Example response" code={RESPONSE} />
      </Section>

      <Section id="curl" title="Try it">
        <CodePanel
          label="curl"
          language="bash"
          code={`curl -sS -X POST "https://<your-host>/api/state-metrics" \\
  -H "Content-Type: application/json" \\
  -d '{"hero":["8d","2d"],"board":["4h","9h","Tc","3d"]}'`}
        />
      </Section>
    </ApiDocsShell>
  );
}
