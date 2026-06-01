"use client";

import { SceneShell } from "@/features/scene/SceneShell";
import { ControlPanel } from "@/features/controls/ControlPanel";
import { InspectorPanel } from "@/features/inspector/InspectorPanel";
import { TopNav } from "@/components/TopNav";
import { MobileFallback } from "@/components/MobileFallback";

export default function HomePage() {
  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#0a0a0f]">
      <MobileFallback />

      <div className="hidden h-full md:flex">
        <ControlPanel />
        <div className="relative min-w-0 flex-1">
          <TopNav />
          <SceneShell />
        </div>
        <div className="flex w-80 flex-col">
          <InspectorPanel />
        </div>
      </div>
    </main>
  );
}
