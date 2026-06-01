import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@geometry-of-poker/shared"],
  serverExternalPackages: ["@geometry-of-poker/feature-engine", "poker-calculations"],
};

export default nextConfig;
