"use client";

import { useState } from "react";
import { useAppStore } from "@/stores/app-store";

/**
 * Manual hand input — validation and projection deferred to Phase 4.
 */
export function HandInputPanel() {
  const [hero, setHero] = useState("As Kd");
  const [board, setBoard] = useState("");
  const setManualHand = useAppStore((s) => s.setManualHandInput);

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-zinc-200">Manual Hand Explorer</h2>
      <label className="block text-xs text-zinc-400">
        Hero hole cards
        <input
          className="mt-1 w-full rounded border border-white/10 bg-black/40 px-2 py-1.5 text-sm"
          value={hero}
          onChange={(e) => setHero(e.target.value)}
          placeholder="As Kd"
        />
      </label>
      <label className="block text-xs text-zinc-400">
        Community cards
        <input
          className="mt-1 w-full rounded border border-white/10 bg-black/40 px-2 py-1.5 text-sm"
          value={board}
          onChange={(e) => setBoard(e.target.value)}
          placeholder="2c 7d Jh (optional)"
        />
      </label>
      <button
        type="button"
        className="w-full rounded bg-emerald-600/80 px-3 py-2 text-sm font-medium hover:bg-emerald-500/80"
        onClick={() => setManualHand({ hero, board })}
      >
        Project into geometry (placeholder)
      </button>
    </div>
  );
}
