"use client";

import { useEffect, useState } from "react";
import { SceneShell } from "@/features/scene/SceneShell";
import { SceneToolbar } from "@/features/scene/SceneToolbar";
import { ControlPanel } from "@/features/controls/ControlPanel";
import { InspectorPanel } from "@/features/inspector/InspectorPanel";
import { TopNav } from "@/components/TopNav";
import { MobileFallback } from "@/components/MobileFallback";
import { useViewerShortcuts } from "@/lib/hooks/use-viewer-shortcuts";

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

function DesktopViewer() {
  useViewerShortcuts();
  return (
    <>
      <SceneShell />
      <TopNav />
      <ControlPanel />
      <InspectorPanel />
      <SceneToolbar />
    </>
  );
}

export default function HomePage() {
  const desktop = useDesktopViewport();

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[var(--surface-base)] text-[var(--text-primary)]">
      {!desktop && <MobileFallback />}
      {desktop && <DesktopViewer />}
    </main>
  );
}
