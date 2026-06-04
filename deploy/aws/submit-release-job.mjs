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

  const environment = [{ name: "GOP_RELEASE_ID", value: releaseId }];
  if (bucket) environment.push({ name: "GOP_ARTIFACT_BUCKET", value: bucket });

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
