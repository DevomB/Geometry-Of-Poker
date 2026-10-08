"use client";

import { useEffect, useState } from "react";
import { SceneShell } from "@/features/scene/SceneShell";
import { SceneToolbar } from "@/features/scene/SceneToolbar";
import { ControlPanel } from "@/features/controls/ControlPanel";
import { InspectorPanel } from "@/features/inspector/InspectorPanel";
import { MobileViewer } from "@/features/mobile/MobileViewer";
import { TopNav } from "@/components/TopNav";
import { useViewerShortcuts } from "@/lib/hooks/use-viewer-shortcuts";

type ViewportKind = "desktop" | "mobile";

/** Resolves after mount so only one viewer (and one WebGL canvas) ever mounts. */
function useViewportKind(): ViewportKind | null {
  const [kind, setKind] = useState<ViewportKind | null>(null);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setKind(mq.matches ? "desktop" : "mobile");
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return kind;
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
  const kind = useViewportKind();

  return (
    <main className="relative h-[100dvh] w-screen overflow-hidden bg-[var(--surface-base)] text-[var(--text-primary)]">
      {kind === "desktop" && <DesktopViewer />}
      {kind === "mobile" && <MobileViewer />}
    </main>
  );
}
