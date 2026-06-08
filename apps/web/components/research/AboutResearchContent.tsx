import Link from "next/link";

const SECTIONS = [
  {
    title: "Research question",
    body: [
      "When hero-centric poker states are mapped to a fixed feature vector built from exact combinatorics and engineered summaries, does unsupervised dimensionality reduction reveal coherent low-dimensional structure that can be explored interactively?",
      "We do not presuppose a geometric shape. Structure must emerge from data.",
    ],
  },
  {
    title: "Poker state",
    body: [
      "Each state: exactly two hero hole cards and zero, three, four, or five community cards (preflop through river).",
      "Validation rejects duplicate cards, invalid lengths, and hero-on-board collisions.",
      "Postflop state space is far too large to enumerate — we use seeded random sampling per street.",
    ],
  },
  {
    title: "Feature vector (66 dimensions, compact mode)",
    body: [
      "Exact combinatorial outputs from the C++ poker-calculations core: equity vs a uniform random villain, hand category, runout quantiles, vulnerability (pNuts, pDominated).",
      "Derived deterministic features: board texture, draw counts via single-card enumeration.",
      "Summary statistics: card-removal gradient aggregates, category-transition entropy (flop only).",
      "Street-aware masking: unavailable groups are zero with explicit availability flags — never NaN.",
    ],
  },
  {
    title: "Embedding pipeline",
    body: [
      "Per street: StandardScaler → PCA (95% variance target) → UMAP (3D) → HDBSCAN clustering.",
      "UMAP parameters and random seed are recorded in viewer-manifest.json.",
      "Evaluation metrics (trustworthiness, kNN overlap) are in analysis-report.md per street.",
    ],
  },
  {
    title: "Manual hand projection",
    body: [
      "User-selected cards are validated, featurized, and projected into the learned geometry.",
      "Production path: scale -> PCA -> bounded kNN interpolation in PCA space using the saved projection index.",
      "The viewer shows projection method, neighbor IDs, and distances — treat distant neighbors as low confidence.",
    ],
  },
];

const CLAIMS = {
  weClaim: [
    "Deterministic feature extraction from a documented schema",
    "Reproducible sampling and embedding given recorded seeds",
    "Quantitative embedding diagnostics alongside visualization",
    "Interactive exploration via a single GPU point cloud",
  ],
  weDoNotClaim: [
    "Clusters prove optimal poker strategy",
    "UMAP distances are perfect strategic distances",
    "Uniform-villain equity equals game-theoretic EV",
    "A small sample covers the full strategic state space",
  ],
};

const DISTINCTIONS = [
  { label: "Exact combinatorial outputs", example: "equityVsRandom, categoryIndex, runout quantiles" },
  { label: "Engineered features", example: "boardConnectivityScore, removalGradientMean" },
  { label: "Dimensionality-reduction artifacts", example: "UMAP xyz, HDBSCAN cluster id" },
  { label: "Interpretive observations", example: "human cluster descriptions — not theorems" },
];

interface AboutResearchContentProps {
  /** When true, render without the page header (suitable for modal embedding). */
  embed?: boolean;
}

export function AboutResearchContent({ embed = false }: AboutResearchContentProps = {}) {
  const containerClass = embed
    ? "space-y-8 text-sm leading-relaxed text-zinc-300"
    : "mx-auto max-w-3xl space-y-10 px-6 py-10 text-sm leading-relaxed text-zinc-300";

  return (
    <article className={containerClass}>
      {!embed && (
        <header className="space-y-3 border-b border-white/10 pb-8">
          <Link
            href="/"
            className="text-xs text-zinc-500 transition hover:text-zinc-300"
          >
            ← Back to viewer
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
            About this research
          </h1>
          <p className="text-zinc-400">
            Geometry of Poker is a computational research visualization. It maps poker states to
            feature vectors, embeds them in three dimensions, and renders an explorable point cloud.
            This page summarizes methodology without overstating conclusions.
          </p>
        </header>
      )}
      {embed && (
        <p className="text-zinc-400">
          Geometry of Poker is a computational research visualization. It maps poker states to
          feature vectors, embeds them in three dimensions, and renders an explorable point cloud.
          The summary below outlines methodology without overstating conclusions.
        </p>
      )}

      {SECTIONS.map((section) => (
        <section key={section.title} className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            {section.title}
          </h2>
          {section.body.map((paragraph) => (
            <p key={paragraph.slice(0, 40)}>{paragraph}</p>
          ))}
        </section>
      ))}

      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          What we claim vs. what we do not
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded border border-emerald-900/40 bg-emerald-950/20 p-4">
            <h3 className="mb-2 text-xs font-medium text-emerald-300">We claim</h3>
            <ul className="list-inside list-disc space-y-1 text-zinc-400">
              {CLAIMS.weClaim.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded border border-rose-900/40 bg-rose-950/20 p-4">
            <h3 className="mb-2 text-xs font-medium text-rose-300">We do not claim</h3>
            <ul className="list-inside list-disc space-y-1 text-zinc-400">
              {CLAIMS.weDoNotClaim.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Four kinds of evidence
        </h2>
        <p className="text-zinc-400">
          Always distinguish these when interpreting the visualization:
        </p>
        <dl className="space-y-3">
          {DISTINCTIONS.map((d) => (
            <div
              key={d.label}
              className="rounded border border-white/10 bg-white/[0.02] px-4 py-3"
            >
              <dt className="font-medium text-zinc-200">{d.label}</dt>
              <dd className="mt-1 font-mono text-xs text-zinc-500">{d.example}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Reproducibility
        </h2>
        <ul className="list-inside list-disc space-y-1 text-zinc-400">
          <li>Dataset seed: manifest.json per street</li>
          <li>Feature schema version: retained-features.json</li>
          <li>UMAP seed and hyperparameters: viewer-manifest.json</li>
          <li>Report UMAP random_state in any published figure — embedding is seed-sensitive</li>
        </ul>
      </section>

      <section className="space-y-3 border-t border-white/10 pt-8">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Full documentation (repository)
        </h2>
        <ul className="space-y-1 font-mono text-xs text-zinc-500">
          <li>docs/research-methodology.md</li>
          <li>docs/math-showpiece.md</li>
          <li>docs/topology-and-clustering-audit.md</li>
          <li>docs/performance-analysis.md</li>
          <li>docs/limitations.md</li>
          <li>docs/feature-schema.md</li>
        </ul>
      </section>

      <footer className="border-t border-white/10 pt-6 text-xs text-zinc-600">
        Research visualization — not gambling advice. Built on poker-calculations (C++ core).
      </footer>
    </article>
  );
}
