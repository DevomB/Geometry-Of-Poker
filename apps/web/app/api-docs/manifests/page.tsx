import {
  ApiDocsShell,
  EndpointHero,
  Prose,
  Section,
} from "@/components/api-docs/ApiDocsShell";
import { CodePanel, ParamTable, StatusTable } from "@/components/api-docs/CodePanel";
import { requireEndpointDoc } from "@/lib/api-docs/catalog";

const endpoint = requireEndpointDoc("manifests");

const RESPONSE = `{
  "artifactMode": "blob",
  "streets": {
    "flop": {
      "version": "1.0.0",
      "street": "flop",
      "pointCount": 50000,
      "artifacts": {
        "pointsBin": "https://<cdn>/releases/<id>/embeddings/flop/browser-points.bin",
        "channelsBin": "https://<cdn>/releases/<id>/embeddings/flop/browser-channels.bin",
        "metadataJson": "https://<cdn>/releases/<id>/embeddings/flop/browser-metadata.json",
        "projectionIndexBin": "https://<cdn>/releases/<id>/embeddings/flop/projection-index.bin"
      }
    }
  }
}`;

export default function ManifestsApiDocsPage() {
  return (
    <ApiDocsShell activeSlug="manifests">
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
              name: "artifactMode",
              type: "public | blob",
              description: "public uses local public artifacts; blob uses GOP_ARTIFACT_BASE_URL.",
            },
            {
              name: "streets",
              type: "Record<Street, StreetManifest>",
              description: "Only streets with loadable manifests are returned.",
            },
            {
              name: "streets.*.artifacts",
              type: "object",
              description: "Browser-safe URLs for point, channel, metadata, and projection-index artifacts.",
            },
          ]}
        />
        <CodePanel label="Example response" code={RESPONSE} />
      </Section>

      <Section id="errors" title="Errors">
        <StatusTable
          rows={[
            {
              status: "503",
              code: "ARTIFACTS_UNAVAILABLE",
              meaning: "Remote release manifests are configured but cannot be reached.",
            },
            {
              status: "500",
              code: "MANIFEST_LOAD_FAILED",
              meaning: "Manifest parsing or local artifact loading failed.",
            },
          ]}
        />
      </Section>

      <Section id="curl" title="Try it">
        <CodePanel
          label="curl"
          language="bash"
          code={`curl -sS "https://<your-host>/api/manifests"`}
        />
      </Section>
    </ApiDocsShell>
  );
}
