"use client";

import { useEffect, useState } from "react";
import type { Street } from "@geometry-of-poker/shared";
import type { BrowserPointMeta } from "@/lib/types";
import {
  needsExactRunoutMetrics,
  type ExactRunoutMetrics,
} from "@/lib/inspector/resolve-summary";
import type { PointSummary } from "@/lib/types";

export function useExactRunoutMetrics(
  point: BrowserPointMeta,
  street: Street,
  summary: PointSummary,
) {
  const [exact, setExact] = useState<ExactRunoutMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needs = needsExactRunoutMetrics(summary, point.board.length);
  const shouldFetch = needs.runouts || needs.vulnerability;

  useEffect(() => {
    if (!shouldFetch) {
      setExact(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetch("/api/state-metrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hero: point.hero,
        board: point.board,
        street,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as {
            error?: { message?: string };
          } | null;
          throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
        }
        return res.json() as Promise<{ metrics: ExactRunoutMetrics }>;
      })
      .then((data) => {
        if (!cancelled) setExact(data.metrics);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [point.id, point.hero, point.board, street, shouldFetch]);

  return { exact, loading, error, needs };
}
