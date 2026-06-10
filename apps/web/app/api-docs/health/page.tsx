import {
  ApiDocsShell,
  EndpointHero,
  Prose,
  Section,
} from "@/components/api-docs/ApiDocsShell";
import { CodePanel, ParamTable } from "@/components/api-docs/CodePanel";
import { requireEndpointDoc } from "@/lib/api-docs/catalog";

const endpoint = requireEndpointDoc("health");

const RESPONSE = `{
  "ok": true,
  "status": "ready",
  "version": "0.1.0",
  "artifactMode": "blob",
  "availableStreets": ["preflop", "flop", "turn", "river"],
  "pokerCalculations": {
    "available": true,
    "platform": "linux",
    "arch": "x64",
    "napi": "8"
  }
}`;

export default function HealthApiDocsPage() {
  return (
    <ApiDocsShell activeSlug="health">
      <EndpointHero
        method={endpoint.method}
        path={endpoint.path}
        title={endpoint.title}
        summary={endpoint.summary}
        tags={endpoint.tags}
      />

      <Section id="request" title="Request">
        <Prose>No body. Call with GET.</Prose>
      </Section>

      <Section id="response" title="Response">
        <ParamTable
          rows={[
            {
              name: "ok",
              type: "boolean",
              description: "True when status is ready and at least one street is available.",
            },
            {
              name: "status",
              type: "string",
              description: "ready | degraded | misconfigured",
            },
            {
              name: "version",
              type: "string",
              description: "Deployed app version.",
            },
            {
              name: "artifactMode",
              type: "string",
              description: "public (local) or blob (CloudFront).",
            },
            {
              name: "availableStreets",
              type: "Street[]",
              description: "Streets with loadable release artifacts.",
            },
            {
              name: "pokerCalculations",
              type: "object",
              description: "Native NAPI binding probe.",
            },
          ]}
        />
        <CodePanel label="Example response" code={RESPONSE} />
      </Section>

      <Section id="curl" title="Try it">
        <CodePanel
          label="curl"
          language="bash"
          code={`curl -sS "https://<your-host>/api/health"`}
        />
      </Section>
    </ApiDocsShell>
  );
}
