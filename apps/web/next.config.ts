import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@geometry-of-poker/shared", "@geometry-of-poker/feature-engine"],
  serverExternalPackages: ["poker-calculations"],
};

export default nextConfig;
