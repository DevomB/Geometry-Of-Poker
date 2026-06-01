"use client";

import { useEffect, useState } from "react";

export function MobileFallback() {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const narrow = window.innerWidth < 768;
    const lowMemory =
      typeof navigator !== "undefined" &&
      "deviceMemory" in navigator &&
      (navigator as Navigator & { deviceMemory?: number }).deviceMemory !== undefined &&
      ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) < 4;
    setBlocked(narrow || lowMemory);
  }, []);

  if (!blocked) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0f] p-8 text-center">
      <div className="max-w-md space-y-3">
        <h1 className="text-lg font-semibold text-zinc-100">Geometry of Poker</h1>
        <p className="text-sm text-zinc-400">
          This research visualization requires a desktop browser with WebGL and sufficient memory.
          Point-cloud rendering at 100k+ states is not practical on narrow viewports or low-memory
          mobile devices.
        </p>
        <p className="text-xs text-zinc-600">
          Use a desktop display at least 768px wide for the full interactive viewer.
        </p>
      </div>
    </div>
  );
}
