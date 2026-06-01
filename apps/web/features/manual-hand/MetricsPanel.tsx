"use client";

import { useAppStore } from "@/stores/app-store";

export function MetricsPanel() {
  const projection = useAppStore((s) => s.manualProjection);

  if (!projection) {
    return (
      <p className="text-sm text-zinc-400">
        Enter a hand and project to see feature metrics and nearest neighbors.
      </p>
    );
  }

  return (
    <div className="space-y-2 text-sm">
      <h2 className="font-medium text-zinc-200">Hand Metrics</h2>
      <pre className="overflow-auto rounded bg-black/40 p-2 text-xs text-zinc-300">
        {JSON.stringify(projection, null, 2)}
      </pre>
    </div>
  );
}
