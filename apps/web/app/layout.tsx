import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Geometry of Poker",
  description:
    "Research-grade interactive 3D visualization of Texas Hold'em state space",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
