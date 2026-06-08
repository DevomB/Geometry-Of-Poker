import Link from "next/link";
import {
  ARTIFACT_MODE,
  APP_VERSION,
  AVAILABLE_STREETS,
  loadStreetManifest,
  streetArtifactsExist,
} from "@/lib/server/artifacts";
import {
  formatMaybePercent,
  releaseReadiness,
  summarizeArtifactStreet,
  type ArtifactStreetDashboard,
} from "@/lib/release/artifact-dashboard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Release Dashboard - Geometry of Poker",
  description: "Artifact readiness, embedding diagnostics, and release metadata for Geometry of Poker.",
};

export default async function ReleasePage() {
  const streets = await loadDashboard();
  const readiness = releaseReadiness(streets);

  return (
    <main className="min-h-screen bg-[#08080c] text-zinc-200">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <header className="border-b border-white/10 pb-8">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="text-xs text-zinc-500 transition hover:text-zinc-300">
              Viewer
            </Link>
            <Link href="/research" className="text-xs text-zinc-500 transition hover:text-zinc-300">
              Research
            </Link>
          </div>
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
            Release dashboard
          </p>
          <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-tight text-zinc-50">
            Artifact readiness and embedding diagnostics
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-400">
            This page reads the same street manifests used by the viewer. It is a
            compact release surface for checking which artifacts are available,
            whether projection sidecars exist, and what diagnostics shipped.
          </p>
        </header>

        <section className="grid gap-4 border-b border-white/10 py-8 md:grid-cols-5">
          <Stat label="App version" value={`v${APP_VERSION}`} />
          <Stat label="Mode" value={ARTIFACT_MODE} />
          <Stat label="Ready" value={`${readiness.ready}/${streets.length}`} />
          <Stat label="Partial" value={String(readiness.partial)} />
          <Stat label="Missing" value={String(readiness.missing)} />
        </section>

        <section className="py-8">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                Street artifacts
              </h2>
              <p className="mt-2 text-sm text-zinc-500">
                Ready means the manifest exists, point count is positive, and a projection
                index is declared.
              </p>
            </div>
            <span
              className={`rounded border px-2 py-1 text-xs ${
                readiness.complete
                  ? "border-emerald-300/30 bg-emerald-500/10 text-emerald-200"
                  : "border-amber-300/30 bg-amber-500/10 text-amber-200"
              }`}
            >
              {readiness.complete ? "complete release" : "incomplete release"}
            </span>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {streets.map((street) => (
              <StreetCard key={street.street} street={street} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

async function loadDashboard(): Promise<ArtifactStreetDashboard[]> {
  const results = await Promise.all(
    AVAILABLE_STREETS.map(async (street) => {
      try {
        const exists = streetArtifactsExist(street);
        if (!exists) return summarizeArtifactStreet(street, null);
        return summarizeArtifactStreet(street, await loadStreetManifest(street));
      } catch {
        return summarizeArtifactStreet(street, null);
      }
    }),
  );
  return results;
}

function StreetCard({ street }: { street: ArtifactStreetDashboard }) {
  const readinessClass =
    street.readiness === "ready"
      ? "border-emerald-300/25 bg-emerald-500/[0.04] text-emerald-200"
      : street.readiness === "partial"
        ? "border-amber-300/25 bg-amber-500/[0.04] text-amber-200"
        : "border-rose-300/25 bg-rose-500/[0.04] text-rose-200";

  return (
    <article className="rounded border border-white/10 bg-white/[0.025] p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold capitalize text-zinc-50">
            {street.street}
          </h3>
          <p className="gop-mono mt-1 text-xs text-zinc-600">
            {street.version ? `v${street.version}` : "no manifest"}
          </p>
        </div>
        <span className={`rounded border px-2 py-1 text-xs ${readinessClass}`}>
          {street.readiness}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <Row label="Points" value={street.pointCount?.toLocaleString() ?? "-"} mono />
        <Row label="Artifacts" value={String(street.artifactCount)} mono />
        <Row
          label="Dimensions"
          value={
            street.retainedDimension !== null || street.originalDimension !== null
              ? `${street.retainedDimension ?? "?"}/${street.originalDimension ?? "?"}`
              : "-"
          }
          mono
        />
        <Row label="PCA dims" value={street.pcaDimensions?.toString() ?? "-"} mono />
        <Row label="PCA variance" value={formatMaybePercent(street.pcaVariance)} mono />
        <Row label="Trustworthiness" value={formatMaybePercent(street.trustworthiness)} mono />
        <Row label="kNN overlap" value={formatMaybePercent(street.knnOverlap)} mono />
        <Row label="Clusters" value={street.clusters?.toString() ?? "-"} mono />
        <Row label="Noise" value={formatMaybePercent(street.noiseFraction)} mono />
        <Row label="Channels" value={street.hasChannels ? "yes" : "no"} />
        <Row label="Projection" value={street.hasProjectionIndex ? "yes" : "no"} />
      </dl>

      {street.embeddingMethod && (
        <p className="gop-mono mt-4 rounded border border-white/10 bg-black/20 px-3 py-2 text-[11px] leading-5 text-zinc-500">
          {street.embeddingMethod}
        </p>
      )}
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l border-white/10 pl-4">
      <div className="gop-mono text-2xl text-zinc-50">{value}</div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-widest text-zinc-500">
        {label}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <>
      <dt className="text-zinc-500">{label}</dt>
      <dd className={`text-right text-zinc-300 ${mono ? "gop-mono tabular-nums" : ""}`}>
        {value}
      </dd>
    </>
  );
}
