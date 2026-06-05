#!/usr/bin/env node
import { spawnSync } from "node:child_process";

function argValue(name) {
  const argv = process.argv.filter((arg) => arg !== "--");
  const index = argv.indexOf(name);
  if (index < 0) return "";
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value.`);
  return value;
}

function usage() {
  return `Usage:
  node deploy/aws/submit-release-job.mjs --release-id 2026-06-balanced-small-1 --region us-east-1

Optional:
  --project-name geometry-of-poker
  --job-queue geometry-of-poker-release
  --job-definition geometry-of-poker-release-worker
  --bucket <artifact-bucket>
  --skip-upload
  --preflop-count 10
  --flop-count 20
  --turn-count 20
  --river-count 20
  --exact-feature-budget production
`;
}

function main() {
  const releaseId = argValue("--release-id");
  if (!releaseId) {
    console.error(usage());
    process.exit(2);
  }

  const region = argValue("--region") || process.env.AWS_REGION || "us-east-1";
  const projectName = argValue("--project-name") || "geometry-of-poker";
  const jobQueue = argValue("--job-queue") || `${projectName}-release`;
  const jobDefinition = argValue("--job-definition") || `${projectName}-release-worker`;
  const bucket = argValue("--bucket");
  const exactFeatureBudget = argValue("--exact-feature-budget");
  const preflopCount = argValue("--preflop-count");
  const flopCount = argValue("--flop-count");
  const turnCount = argValue("--turn-count");
  const riverCount = argValue("--river-count");
  const skipUpload = process.argv.includes("--skip-upload");

  const environment = [{ name: "GOP_RELEASE_ID", value: releaseId }];
  if (bucket) environment.push({ name: "GOP_ARTIFACT_BUCKET", value: bucket });
  if (skipUpload) environment.push({ name: "GOP_SKIP_UPLOAD", value: "1" });
  if (exactFeatureBudget) {
    environment.push({ name: "GOP_EXACT_FEATURE_BUDGET", value: exactFeatureBudget });
  }
  if (preflopCount) environment.push({ name: "GOP_PREFLOP_COUNT", value: preflopCount });
  if (flopCount) environment.push({ name: "GOP_FLOP_COUNT", value: flopCount });
  if (turnCount) environment.push({ name: "GOP_TURN_COUNT", value: turnCount });
  if (riverCount) environment.push({ name: "GOP_RIVER_COUNT", value: riverCount });

  const containerOverrides = JSON.stringify({ environment });
  const jobName = `gop-${releaseId}`.replace(/[^A-Za-z0-9_-]/g, "-").slice(0, 128);

  const result = spawnSync(
    "aws",
    [
      "batch",
      "submit-job",
      "--region",
      region,
      "--job-name",
      jobName,
      "--job-queue",
      jobQueue,
      "--job-definition",
      jobDefinition,
      "--container-overrides",
      containerOverrides,
    ],
    { stdio: "inherit", shell: false },
  );

  if (result.error) {
    console.error(`Failed to run AWS CLI: ${result.error.message}`);
    console.error("Install and configure AWS CLI v2, then retry this command.");
    process.exit(1);
  }

  process.exit(result.status ?? 1);
}

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(2);
}
