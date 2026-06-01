"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { HealthResponse } from "@geometry-of-poker/shared";
import { useViewerStore } from "@/stores/viewer-store";

export function TopNav() {
  const fps = useViewerStore((s) => s.fps);
  const dataset = useViewerStore((s) => s.dataset);
  const street = useViewerStore((s) => s.street);
  const isLoading = useViewerStore((s) => s.isLoading);
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    let active = true;
    void fetch("/api/health")
      .then((res) => (res.ok ? (res.json() as Promise<HealthResponse>) : null))
      .then((payload) => {
        if (active) setHealth(payload);
      })
      .catch(() => {
        if (active) setHealth(null);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <header className="pointer-events-auto absolute left-72 right-80 top-0 z-10 flex h-14 items-center justify-between border-b border-white/10 bg-black/50 px-4 backdrop-blur-md">
      <div>
        <h1 className="text-sm font-semibold tracking-tight text-zinc-100">Geometry of Poker</h1>
        <p className="text-[10px] text-zinc-500">
          Learned 3D manifold{" - "}
          <span className="capitalize text-zinc-400">{street}</span>
          {dataset && <>{" - "}{dataset.count.toLocaleString()} states</>}
        </p>
      </div>
      <div className="flex items-center gap-4 text-[10px] tabular-nums text-zinc-500">
        <Link
          href="/research"
          className="text-zinc-400 transition hover:text-zinc-200"
        >
          About research
        </Link>
        {isLoading && <span>Loading...</span>}
        {health && (
          <span title={`Artifacts: ${health.artifactMode}`}>
            Engine {health.pokerCalculations.available ? "ready" : "fallback"}
          </span>
        )}
        {!isLoading && fps > 0 && <span>{fps} fps</span>}
      </div>
    </header>
  );
}
