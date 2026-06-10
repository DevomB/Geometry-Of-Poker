import type { NextConfig } from "next";

const nativePokerPackageFiles = [
  "../../node_modules/poker-calculations/**/*",
  "../../node_modules/node-gyp-build/**/*",
];

const nextConfig: NextConfig = {
  transpilePackages: ["@geometry-of-poker/shared", "@geometry-of-poker/feature-engine"],
  serverExternalPackages: ["poker-calculations"],
  outputFileTracingIncludes: {
    "/api/health": nativePokerPackageFiles,
    "/api/project": nativePokerPackageFiles,
    "/api/state": nativePokerPackageFiles,
    "/api/state-metrics": nativePokerPackageFiles,
  },
};

export default nextConfig;
