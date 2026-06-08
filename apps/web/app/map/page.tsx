import Link from "next/link";

export const metadata = {
  title: "Map Behind the Project - Geometry of Poker",
  description:
    "A technical walkthrough of the state-space map, feature geometry, embedding pipeline, and projection method behind Geometry of Poker.",
};

const RELEASE_STATS = [
  ["Preflop", "1,326", "Complete two-card hero state enumeration"],
  ["Flop", "25,000", "Seeded balanced-small sample"],
  ["Turn", "25,000", "Seeded balanced-small sample"],
  ["River", "25,000", "Seeded balanced-small sample"],
];

const PIPELINE = [
  {
    label: "State",
    code: "s = (hero, board, street)",
    body: "A validated no-limit Hold'em public state: two hero cards plus zero, three, four, or five board cards.",
  },
  {
    label: "Features",
    code: "x = phi(s) in R^66",
    body: "Exact poker outputs and engineered board texture features are converted into a fixed compact schema.",
  },
  {
    label: "Scale",
    code: "z = (x - mu) / sigma",
    body: "Per-street scaler parameters make feature magnitudes comparable before distance-based modeling.",
  },
  {
    label: "Compress",
    code: "y = V_k^T z",
    body: "PCA retains the dominant variance directions and removes redundant feature axes.",
  },
  {
    label: "Embed",
    code: "u = UMAP(y) in R^3",
    body: "A fuzzy neighbor graph is optimized into a three-dimensional manifold for interactive inspection.",
  },
  {
    label: "Cluster",
    code: "c = HDBSCAN(u)",
    body: "Density clusters provide labels for local neighborhoods without forcing every point into a cluster.",
  },
];

const FEATURE_GROUPS = [
  {
    title: "Equity Surface",
    body: "Hero equity against a uniform random villain gives the map a strategic gradient. Strong holdings become high-energy regions; fragile holdings create transition bands.",
  },
  {
    title: "Category Topology",
    body: "Hand category one-hot values and category index anchor discrete poker facts such as pair, flush, straight, and full house.",
  },
  {
    title: "Board Texture",
    body: "Rank distinctness, pairedness, suit concentration, connectivity, broadway density, and high/low card measures describe public-card structure.",
  },
  {
    title: "Draw Pressure",
    body: "Flush outs, straight outs, open-ended and gutshot flags, combo-draw flags, and next-card improvement probability capture future-card instability.",
  },
  {
    title: "Removal Effects",
    body: "Card-removal gradients measure how unavailable cards perturb equity and category transitions.",
  },
  {
    title: "Projection Sidecar",
    body: "Retained feature names, scaler parameters, PCA basis, PCA training vectors, point ids, and UMAP coordinates make manual hand input production-safe.",
  },
];

const RESEARCH_NOTES = [
  "The map is not a poker solver. It is a geometry of measurable state properties.",
  "UMAP preserves local neighborhoods better than global distances, so interpretation should focus on nearby structure.",
  "Manual hands are projected by PCA-space neighbor interpolation, not by inventing new UMAP coordinates at request time.",
  "The production viewer serves immutable binary artifacts from S3/CloudFront; Vercel only hosts the app and APIs.",
];

export default function MapPage() {
  return (
    <main className="min-h-screen bg-[#08080c] text-zinc-200">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <header className="border-b border-white/10 pb-8">
          <Link href="/" className="text-xs text-zinc-500 transition hover:text-zinc-300">
            Back to viewer
          </Link>
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
            Research map
          </p>
          <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-tight text-zinc-50">
            How Geometry of Poker turns Hold&apos;em states into a navigable manifold
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-400">
            This page is the technical map behind the project: what each point means,
            how the coordinates are produced, what the viewer can claim, and where the
            research boundaries are.
          </p>
        </header>

        <section className="grid gap-4 border-b border-white/10 py-8 md:grid-cols-4">
          {RELEASE_STATS.map(([street, count, detail]) => (
            <div key={street} className="border-l border-white/10 pl-4">
              <div className="gop-mono text-2xl text-zinc-50">{count}</div>
              <div className="mt-1 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                {street}
              </div>
              <p className="mt-2 text-xs leading-5 text-zinc-500">{detail}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-8 border-b border-white/10 py-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
              Core equation
            </h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Every point in the cloud is the result of a deterministic map from cards to
              features, followed by a learned per-street geometric transform.
            </p>
          </div>
          <div className="rounded border border-cyan-400/20 bg-cyan-950/10 p-5">
            <p className="gop-mono text-sm leading-7 text-cyan-100">
              s = (hero, board, street)
              <br />
              x = phi(s)
              <br />
              z = (x - mu) / sigma
              <br />
              y = V_k^T z
              <br />
              u = UMAP(y)
            </p>
            <p className="mt-4 text-xs leading-5 text-zinc-500">
              For manual input, the app computes y for the new state and interpolates
              existing UMAP coordinates from bounded nearest neighbors in PCA space.
            </p>
          </div>
        </section>

        <section className="border-b border-white/10 py-10">
          <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
            Pipeline
          </h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {PIPELINE.map((step) => (
              <article key={step.label} className="rounded border border-white/10 bg-white/[0.025] p-4">
                <h3 className="text-sm font-medium text-zinc-100">{step.label}</h3>
                <p className="gop-mono mt-2 text-xs text-cyan-300/80">{step.code}</p>
                <p className="mt-3 text-xs leading-5 text-zinc-500">{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-8 border-b border-white/10 py-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
              What the axes mean
            </h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              The x/y/z axes are not hand-labeled poker concepts. They are coordinates
              learned by UMAP from local feature-neighborhood constraints.
            </p>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              The practical reading is neighborhood-first: nearby points share similar
              equity, category, texture, and draw-pressure signatures.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {FEATURE_GROUPS.map((group) => (
              <article key={group.title} className="rounded border border-white/10 bg-white/[0.02] p-4">
                <h3 className="text-sm font-medium text-zinc-100">{group.title}</h3>
                <p className="mt-2 text-xs leading-5 text-zinc-500">{group.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-8 border-b border-white/10 py-10 lg:grid-cols-2">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
              Projection formula
            </h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              A new hand is not inserted into UMAP directly. It is featurized, scaled,
              projected through the saved PCA basis, then blended from nearby training
              points already present in the map.
            </p>
          </div>
          <div className="rounded border border-amber-400/20 bg-amber-950/10 p-5">
            <p className="gop-mono text-xs leading-6 text-amber-100">
              w_i = 1 / (epsilon + ||y - y_i||^2)
              <br />
              u_hat = sum_i(w_i * u_i) / sum_i(w_i)
            </p>
            <p className="mt-4 text-xs leading-5 text-zinc-500">
              This is intentionally conservative: the response includes nearest-neighbor
              ids and distances so low-confidence projections are visible instead of hidden.
            </p>
          </div>
        </section>

        <section className="py-10">
          <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
            Research notes
          </h2>
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {RESEARCH_NOTES.map((point) => (
              <li key={point} className="rounded border border-white/10 bg-white/[0.02] p-4 text-sm leading-6 text-zinc-400">
                {point}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
