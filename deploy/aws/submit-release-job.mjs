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
  --streets preflop,flop,turn,river
  --source-release-id <prior-release-id>
  --resume
  --batch-size 1000
  --vcpus 4
  --memory-mb 30720
  --exact-feature-budget production
`;
}

function parseOptions() {
  const releaseId = argValue("--release-id");
  if (!releaseId) {
    console.error(usage());
    process.exit(2);
  }

  const projectName = argValue("--project-name") || "geometry-of-poker";
  return {
    releaseId,
    region: argValue("--region") || process.env.AWS_REGION || "us-east-1",
    projectName,
    jobQueue: argValue("--job-queue") || `${projectName}-release`,
    jobDefinition: argValue("--job-definition") || `${projectName}-release-worker`,
    bucket: argValue("--bucket"),
    exactFeatureBudget: argValue("--exact-feature-budget"),
    preflopCount: argValue("--preflop-count"),
    flopCount: argValue("--flop-count"),
    turnCount: argValue("--turn-count"),
    riverCount: argValue("--river-count"),
    streets: argValue("--streets"),
    sourceReleaseId: argValue("--source-release-id"),
    batchSize: argValue("--batch-size"),
    vcpus: argValue("--vcpus"),
    memoryMb: argValue("--memory-mb"),
    skipUpload: process.argv.includes("--skip-upload"),
    resume: process.argv.includes("--resume"),
  };
}

function pushEnv(environment, name, value) {
  if (value) environment.push({ name, value });
}

function buildEnvironment(options) {
  const environment = [{ name: "GOP_RELEASE_ID", value: options.releaseId }];
  pushEnv(environment, "GOP_ARTIFACT_BUCKET", options.bucket);
  pushEnv(environment, "GOP_SKIP_UPLOAD", options.skipUpload ? "1" : "");
  pushEnv(environment, "GOP_RESUME", options.resume ? "1" : "");
  pushEnv(environment, "GOP_EXACT_FEATURE_BUDGET", options.exactFeatureBudget);
  pushEnv(environment, "GOP_PREFLOP_COUNT", options.preflopCount);
  pushEnv(environment, "GOP_FLOP_COUNT", options.flopCount);
  pushEnv(environment, "GOP_TURN_COUNT", options.turnCount);
  pushEnv(environment, "GOP_RIVER_COUNT", options.riverCount);
  pushEnv(environment, "GOP_STREETS", options.streets);
  pushEnv(environment, "GOP_SOURCE_RELEASE_ID", options.sourceReleaseId);
  pushEnv(environment, "GOP_BATCH_SIZE", options.batchSize);
  return environment;
}

function buildResourceRequirements(options) {
  const resourceRequirements = [];
  if (options.vcpus) resourceRequirements.push({ type: "VCPU", value: options.vcpus });
  if (options.memoryMb) resourceRequirements.push({ type: "MEMORY", value: options.memoryMb });
  return resourceRequirements;
}

function containerOverrides(options) {
  const resourceRequirements = buildResourceRequirements(options);
  const containerOverrides = JSON.stringify({
    environment: buildEnvironment(options),
    ...(resourceRequirements.length > 0 ? { resourceRequirements } : {}),
  });
  return containerOverrides;
}

function submitJob(options) {
  const jobName = `gop-${options.releaseId}`.replace(/[^A-Za-z0-9_-]/g, "-").slice(0, 128);
  return spawnSync(
    "aws",
    [
      "batch",
      "submit-job",
      "--region",
      options.region,
      "--job-name",
      jobName,
      "--job-queue",
      options.jobQueue,
      "--job-definition",
      options.jobDefinition,
      "--container-overrides",
      containerOverrides(options),
    ],
    { stdio: "inherit", shell: false },
  );
}

function main() {
  const result = submitJob(parseOptions());
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
