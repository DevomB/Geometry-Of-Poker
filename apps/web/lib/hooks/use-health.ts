"use client";

import { useEffect, useState } from "react";
import type { HealthResponse } from "@geometry-of-poker/shared";

export type HealthState =
  | { status: "loading"; payload: null; error: null }
  | { status: "ok"; payload: HealthResponse; error: null }
  | { status: "error"; payload: null; error: string };

export function useHealth(): HealthState {
  const [state, setState] = useState<HealthState>({
    status: "loading",
    payload: null,
    error: null,
  });

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    void (async () => {
      try {
        const res = await fetch("/api/health", { signal: controller.signal });
        if (!res.ok) throw new Error(`Health endpoint returned ${res.status}`);
        const payload = (await res.json()) as HealthResponse;
        if (active) setState({ status: "ok", payload, error: null });
      } catch (err) {
        if (!active) return;
        if ((err as Error).name === "AbortError") return;
        setState({
          status: "error",
          payload: null,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  return state;
}
