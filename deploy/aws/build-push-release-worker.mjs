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
  node deploy/aws/build-push-release-worker.mjs --region us-east-1 --account-id <aws-account-id>

Optional:
  --project-name geometry-of-poker
  --image-uri <full-ecr-image-uri>
`;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    input: options.input,
    encoding: "utf8",
    stdio: options.capture
      ? ["pipe", "pipe", "inherit"]
      : options.input
        ? ["pipe", "inherit", "inherit"]
        : "inherit",
    shell: false,
  });
  if (result.error) {
    throw new Error(
      `Failed to run ${command}: ${result.error.message}\nInstall/configure the required CLI and retry.`,
    );
  }
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}.`);
  }
  return result.stdout?.trim() ?? "";
}

function main() {
  const region = argValue("--region") || process.env.AWS_REGION || "us-east-1";
  const accountId = argValue("--account-id") || process.env.AWS_ACCOUNT_ID;
  const projectName = argValue("--project-name") || "geometry-of-poker";
  if (!accountId) {
    console.error(usage());
    process.exit(2);
  }

  const registry = `${accountId}.dkr.ecr.${region}.amazonaws.com`;
  const imageUri =
    argValue("--image-uri") || `${registry}/${projectName}-release-worker:latest`;

  const password = run("aws", ["ecr", "get-login-password", "--region", region], {
    capture: true,
  });
  run("docker", ["login", "--username", "AWS", "--password-stdin", registry], {
    input: password,
  });
  run("docker", ["build", "-f", "deploy/aws/release-worker.Dockerfile", "-t", imageUri, "."]);
  run("docker", ["push", imageUri]);

  console.log(`Pushed ${imageUri}`);
}

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
