"use client";

import { useAppStore, type AppMode } from "@/stores/app-store";

const MODES: { id: AppMode; label: string }[] = [
  { id: "research-explorer", label: "Research Explorer" },
  { id: "manual-hand-explorer", label: "Manual Hand" },
];

export function ModeSwitcher() {
  const mode = useAppStore((s) => s.mode);
  const setMode = useAppStore((s) => s.setMode);

  return (
    <div className="flex gap-1 rounded-md border border-white/10 p-1">
      {MODES.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => setMode(id)}
          className={`rounded px-3 py-1.5 text-sm transition ${
            mode === id
              ? "bg-emerald-500/20 text-emerald-300"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
