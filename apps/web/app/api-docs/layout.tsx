import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API Reference - Geometry of Poker",
  description:
    "HTTP API documentation for poker state analysis, map projection, and deployment health.",
};

export default function ApiDocsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
