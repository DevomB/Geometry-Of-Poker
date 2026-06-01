import { AboutResearchContent } from "@/components/research/AboutResearchContent";

export const metadata = {
  title: "About Research — Geometry of Poker",
  description: "Methodology, claims, and limitations for the Geometry of Poker research visualization.",
};

export default function ResearchPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0f]">
      <AboutResearchContent />
    </main>
  );
}
