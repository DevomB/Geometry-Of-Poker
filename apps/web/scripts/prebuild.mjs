import { spawnSync } from "node:child_process";

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}.`);
  }
}

run("pnpm", ["--filter", "@geometry-of-poker/shared", "build"]);
run("pnpm", ["--filter", "@geometry-of-poker/feature-engine", "build"]);

const isVercelBuild = process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV);

if (isVercelBuild) {
  if (!process.env.GOP_ARTIFACT_BASE_URL?.trim()) {
    if (process.env.VERCEL_ENV !== "production") {
      console.warn("Skipping local artifact sync; Vercel preview build has no GOP_ARTIFACT_BASE_URL.");
      process.exit(0);
    }
    throw new Error(
      "GOP_ARTIFACT_BASE_URL is required for Vercel production builds. Point it at the CloudFront release artifact base.",
    );
  }
  console.log("Skipping local artifact sync; Vercel uses GOP_ARTIFACT_BASE_URL.");
  process.exit(0);
}

run("node", ["scripts/sync-artifacts.mjs"]);
