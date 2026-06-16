"use client";

import { useEffect, useState } from "react";
import { SceneShell } from "@/features/scene/SceneShell";
import { ControlPanel } from "@/features/controls/ControlPanel";
import { InspectorPanel } from "@/features/inspector/InspectorPanel";
import { TopNav } from "@/components/TopNav";
import { MobileFallback } from "@/components/MobileFallback";

function useDesktopViewport(): boolean {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return desktop;
}

export default function HomePage() {
  const desktop = useDesktopViewport();

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[var(--surface-base)] text-[var(--text-primary)]">
      {!desktop && <MobileFallback />}

      {desktop && (
        <div className="flex h-full">
          <ControlPanel />
          <div className="relative min-w-0 flex-1">
            <TopNav />
            <SceneShell />
          </div>
          <div className="flex w-80 flex-col">
            <InspectorPanel />
          </div>
        </div>
      )}
    </main>
  );
}
