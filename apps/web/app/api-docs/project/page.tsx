import {
  ApiDocsShell,
  EndpointHero,
  Prose,
  Section,
} from "@/components/api-docs/ApiDocsShell";
import { Callout, CodePanel, ParamTable, StatusTable } from "@/components/api-docs/CodePanel";
import { requireEndpointDoc } from "@/lib/api-docs/catalog";

const endpoint = requireEndpointDoc("project");

const REQUEST = `{
  "hero": ["As", "Kd"],
  "board": ["2c", "7d", "9h"],
  "deadCards": []
}`;

const RESPONSE = `{
  "state": {
    "hero": ["As", "Kd"],
    "board": ["2c", "7d", "9h"],
    "deadCards": [],
    "street": "flop"
  },
  "projectedPoint": { "x": 1.24, "y": -0.58, "z": 0.91 },
  "nearestNeighbors": [
    {
      "id": "flop-12-0042",
      "distance": 0.03,
      "x": 1.21,
      "y": -0.55,
      "z": 0.88,
      "hero": ["As", "Kd"],
      "board": ["2c", "7d", "9h"],
      "category": "highCard",
      "equityVsRandom": 0.67
    }
  ],
  "metrics": {
    "equityVsRandom": 0.67,
    "category": "highCard",
    "clusterId": 4,
    "sourceMethod": "exact_match"
  },
  "projectionMethod": "exact-match",
  "warnings": []
}`;

export default function ProjectApiDocsPage() {
  return (
    <ApiDocsShell activeSlug="project">
      <EndpointHero
        method={endpoint.method}
        path={endpoint.path}
        title={endpoint.title}
        summary={endpoint.summary}
        tags={endpoint.tags}
      />

      <Callout tone="warn">
        Requires release artifacts (<code className="gop-mono">projection-index.bin</code> and
        street datasets). Returns{" "}
        <code className="gop-mono">503 FEATURE_ENGINE_UNAVAILABLE</code> when native extraction is
        needed but unavailable.
      </Callout>

      <Section id="request" title="Request">
        <ParamTable
          rows={[
            {
              name: "hero",
              type: "[string, string]",
              required: true,
              description: "Exactly two hole cards.",
            },
            {
              name: "board",
              type: "string[]",
              required: true,
              description: "Community cards: length 0, 3, 4, or 5.",
            },
            {
              name: "deadCards",
              type: "string[]",
              required: false,
              description: "Known dead cards. Non-exact projection may be unavailable with dead cards.",
            },
            {
              name: "street",
              type: "string",
              required: false,
              description: "Inferred from board length if omitted.",
            },
          ]}
        />
        <CodePanel label="Example body" code={REQUEST} />
      </Section>

      <Section id="response" title="Response">
        <Prose>
          If the exact hero+board exists in the release dataset, projection uses an exact match.
          Otherwise features are extracted and interpolated from PCA-space nearest neighbors in the
          embedding.
        </Prose>
        <ParamTable
          rows={[
            {
              name: "projectedPoint",
              type: "{ x, y, z }",
              description: "3D UMAP coordinates for the hand.",
            },
            {
              name: "nearestNeighbors",
              type: "array",
              description: "Closest dataset states with distances and metadata.",
            },
            {
              name: "projectionMethod",
              type: "string",
              description: "exact-match | pca-knn-interpolation | precomputed-nearest-neighbor",
            },
            {
              name: "warnings",
              type: "string[]",
              description: "Non-fatal issues (e.g. degraded feature extraction).",
            },
          ]}
        />
        <CodePanel label="Example response" code={RESPONSE} />
      </Section>

      <Section id="errors" title="Errors">
        <StatusTable
          rows={[
            { status: "400", code: "DUPLICATE_CARD", meaning: "Overlapping cards." },
            { status: "404", code: "MISSING_ARTIFACTS", meaning: "No artifacts for requested street." },
            { status: "503", code: "FEATURE_ENGINE_UNAVAILABLE", meaning: "Non-exact path needs native engine." },
            { status: "422", code: "PROJECTION_FAILED", meaning: "Projection pipeline error." },
          ]}
        />
      </Section>

      <Section id="curl" title="Try it">
        <CodePanel
          label="curl"
          language="bash"
          code={`curl -sS -X POST "https://<your-host>/api/project" \\
  -H "Content-Type: application/json" \\
  -d '{"hero":["As","Kd"],"board":["2c","7d","9h"]}'`}
        />
      </Section>
    </ApiDocsShell>
  );
}
