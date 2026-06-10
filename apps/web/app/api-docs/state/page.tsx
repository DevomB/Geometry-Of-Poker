import {
  ApiDocsShell,
  EndpointHero,
  Prose,
  Section,
} from "@/components/api-docs/ApiDocsShell";
import { Callout, CodePanel, ParamTable, StatusTable } from "@/components/api-docs/CodePanel";
import { requireEndpointDoc } from "@/lib/api-docs/catalog";

const endpoint = requireEndpointDoc("state");

const REQUEST = `{
  "hero": ["8d", "2d"],
  "board": ["4h", "9h", "Tc", "3d"],
  "deadCards": [],
  "exactFeatureBudget": "full"
}`;

const RESPONSE = `{
  "state": {
    "hero": ["8d", "2d"],
    "board": ["4h", "9h", "Tc", "3d"],
    "deadCards": [],
    "street": "turn"
  },
  "metadata": {
    "category": "highCard",
    "categoryIndex": 0
  },
  "equityVsRandom": 0.5647,
  "exactFeatureBudget": "full",
  "features": {
    "core": { "equityVsRandom": 0.5647, "categoryIndex": 0, "streetIndex": 2 },
    "runouts": { "equityMean": 0, "equityVariance": 0, "equityRunoutAvailable": 0 },
    "vulnerability": { "pNuts": 0.12, "pDominated": 0.08, "runoutVulnerabilityAvailable": 1 },
    "board": { "boardConnectivityScore": 0.42 },
    "draws": { "flushOutCount": 9, "drawFeaturesAvailable": 1 },
    "removal": { "removalGradientAvailable": 1 },
    "transitions": { "categoryTransitionAvailable": 0 }
  },
  "combinatorics": {
    "knownCards": 6,
    "remainingCards": 46,
    "legalVillainHands": "1035",
    "terminalLeaves": "45540",
    "flushOuts": 9,
    "straightOutCount": 0,
    "improvementOutCount": 9,
    "cleanImprovementOutCount": 9
  },
  "availability": {
    "equityRunout": false,
    "runoutVulnerability": true,
    "removalGradient": true,
    "categoryTransition": false,
    "drawFeatures": true
  },
  "limitations": [
    "Equity is vs a uniform random villain hand, not a range or GTO opponent.",
    "Runout quantiles are only defined for preflop and flop (board length ≤ 3)."
  ]
}`;

export default function StateApiDocsPage() {
  return (
    <ApiDocsShell activeSlug="state">
      <EndpointHero
        method={endpoint.method}
        path={endpoint.path}
        title={endpoint.title}
        summary={endpoint.summary}
        tags={endpoint.tags}
      />

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
              description: "Known dead cards. Must not overlap hero or board.",
            },
            {
              name: "street",
              type: "string",
              required: false,
              description: "preflop | flop | turn | river. Inferred from board if omitted.",
            },
            {
              name: "exactFeatureBudget",
              type: "string",
              required: false,
              description:
                '"full" (default) runs exact runouts, vulnerability, removal, and transitions where supported. "production" uses bounded MC equity only.',
            },
          ]}
        />
        <CodePanel label="Example body" code={REQUEST} />
      </Section>

      <Section id="response" title="Response">
        <Prose>
          Returns normalized state, hand category, equity vs random, grouped feature scalars,
          combinatorial counts, boolean availability flags, and human-readable limitations.
          Large integer counts are serialized as decimal strings.
        </Prose>
        <Callout>
          Always check <code className="gop-mono">availability</code> before interpreting feature
          groups. Neutral zeros mean the metric was not computed for this street or budget.
        </Callout>
        <CodePanel label="Example response" code={RESPONSE} />
      </Section>

      <Section id="availability" title="Availability flags">
        <ParamTable
          rows={[
            {
              name: "equityRunout",
              type: "boolean",
              description: "Runout quantiles (preflop–flop, full budget).",
            },
            {
              name: "runoutVulnerability",
              type: "boolean",
              description: "pNuts / pDominated (flop–turn, full budget).",
            },
            {
              name: "removalGradient",
              type: "boolean",
              description: "Card-removal summaries (full budget).",
            },
            {
              name: "categoryTransition",
              type: "boolean",
              description: "Flop category transition matrix summaries (full budget).",
            },
            {
              name: "drawFeatures",
              type: "boolean",
              description: "Draw and improvement out counts.",
            },
          ]}
        />
      </Section>

      <Section id="errors" title="Errors">
        <StatusTable
          rows={[
            { status: "400", code: "MALFORMED_CARD", meaning: "Invalid card string." },
            { status: "400", code: "DUPLICATE_CARD", meaning: "Same card in hero, board, or dead." },
            { status: "400", code: "INVALID_FEATURE_BUDGET", meaning: 'Must be "full" or "production".' },
            { status: "413", code: "PAYLOAD_TOO_LARGE", meaning: "Body exceeds 2KB." },
            { status: "503", code: "FEATURE_ENGINE_UNAVAILABLE", meaning: "Native engine not loaded." },
            { status: "500", code: "STATE_ANALYSIS_FAILED", meaning: "Unexpected engine failure." },
          ]}
        />
      </Section>

      <Section id="curl" title="Try it">
        <CodePanel
          label="curl"
          language="bash"
          code={`curl -sS -X POST "https://<your-host>/api/state" \\
  -H "Content-Type: application/json" \\
  -d '${REQUEST.replace(/\n/g, "").replace(/  /g, "")}'`}
        />
      </Section>
    </ApiDocsShell>
  );
}
