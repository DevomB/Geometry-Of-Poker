"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function MobileFallback() {
  const [blocked, setBlocked] = useState(false);
  const [reason, setReason] = useState<"narrow" | "low-memory" | null>(null);

  useEffect(() => {
    const narrow = window.innerWidth < 768;
    const lowMemory =
      typeof navigator !== "undefined" &&
      "deviceMemory" in navigator &&
      (navigator as Navigator & { deviceMemory?: number }).deviceMemory !== undefined &&
      ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) < 4;
    setReason(narrow ? "narrow" : lowMemory ? "low-memory" : null);
    setBlocked(narrow || lowMemory);
  }, []);

  if (!blocked) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="mobile-fallback-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--surface-base)] p-8 text-center"
    >
      <div className="gop-fade-in max-w-md space-y-4">
        <p className="gop-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
          Geometry of Poker · Research
        </p>
        <h1
          id="mobile-fallback-title"
          className="text-lg font-semibold tracking-tight text-zinc-100"
        >
          Desktop browser recommended
        </h1>
        <p className="text-sm text-zinc-400">
          {reason === "narrow"
            ? "This visualization renders 100k+ poker states as a single GPU point cloud. Narrow viewports cannot fit the inspector and control panels alongside the manifold."
            : "Your device reports limited memory. Loading large embedding artifacts may degrade the experience."}
        </p>
        <p className="text-xs text-zinc-500">
          Reopen on a desktop browser at least 768px wide for the full
          interactive viewer.
        </p>
        <div className="border-t border-[var(--border-subtle)] pt-3">
          <Link
            href="/research"
            className="text-xs text-zinc-300 underline-offset-2 hover:underline"
          >
            Read the research methodology →
          </Link>
        </div>
      </div>
    </div>
  );
}
