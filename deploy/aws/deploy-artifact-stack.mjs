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
  node deploy/aws/deploy-artifact-stack.mjs --region us-east-1

Optional:
  --project-name geometry-of-poker
  --account-id <aws-account-id>
  --image-uri <full-ecr-image-uri>
  --vpc-id vpc-...
  --subnet-ids subnet-a,subnet-b
`;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: options.capture ? ["ignore", "pipe", "inherit"] : "inherit",
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

function awsJson(args) {
  const out = run("aws", [...args, "--output", "json"], { capture: true });
  return JSON.parse(out);
}

function discoverDefaultNetwork(region) {
  console.log("No VPC/subnets provided. Looking for the default VPC and public default subnets...");

  const vpcs = awsJson([
    "ec2",
    "describe-vpcs",
    "--region",
    region,
    "--filters",
    "Name=is-default,Values=true",
  ]).Vpcs ?? [];
  const vpcId = vpcs[0]?.VpcId;
  if (!vpcId) {
    throw new Error(
      "No default VPC was found. Create a default VPC in the AWS console, or rerun with --vpc-id and --subnet-ids.",
    );
  }

  const subnets = awsJson([
    "ec2",
    "describe-subnets",
    "--region",
    region,
    "--filters",
    `Name=vpc-id,Values=${vpcId}`,
    "Name=default-for-az,Values=true",
    "Name=state,Values=available",
  ]).Subnets ?? [];
  const publicSubnetIds = subnets
    .filter((subnet) => subnet.MapPublicIpOnLaunch)
    .map((subnet) => subnet.SubnetId)
    .sort();

  if (publicSubnetIds.length < 2) {
    throw new Error(
      `Default VPC ${vpcId} has fewer than two public default subnets. Create default subnets or rerun with --subnet-ids.`,
    );
  }

  console.log(`Using default VPC ${vpcId}`);
  console.log(`Using public subnets ${publicSubnetIds.join(",")}`);
  return { vpcId, subnetIds: publicSubnetIds.join(",") };
}

function main() {
  const region = argValue("--region") || process.env.AWS_REGION || "us-east-1";
  const projectName = argValue("--project-name") || "geometry-of-poker";
  const providedVpcId = argValue("--vpc-id");
  const providedSubnetIds = argValue("--subnet-ids");
  const discoveredNetwork =
    providedVpcId && providedSubnetIds ? null : discoverDefaultNetwork(region);
  const vpcId = providedVpcId || discoveredNetwork.vpcId;
  const subnetIds = providedSubnetIds || discoveredNetwork.subnetIds;

  const accountId =
    argValue("--account-id") ||
    process.env.AWS_ACCOUNT_ID ||
    awsJson(["sts", "get-caller-identity", "--region", region]).Account;
  const imageUri =
    argValue("--image-uri") ||
    `${accountId}.dkr.ecr.${region}.amazonaws.com/${projectName}-release-worker:latest`;

  run("aws", [
    "cloudformation",
    "validate-template",
    "--region",
    region,
    "--template-body",
    "file://deploy/aws/production-artifacts.yaml",
  ]);

  run("aws", [
    "cloudformation",
    "deploy",
    "--region",
    region,
    "--stack-name",
    `${projectName}-artifacts`,
    "--template-file",
    "deploy/aws/production-artifacts.yaml",
    "--capabilities",
    "CAPABILITY_IAM",
    "--parameter-overrides",
    `ProjectName=${projectName}`,
    `ReleaseWorkerImage=${imageUri}`,
    `VpcId=${vpcId}`,
    `SubnetIds=${subnetIds}`,
  ]);

  const stack = awsJson([
    "cloudformation",
    "describe-stacks",
    "--region",
    region,
    "--stack-name",
    `${projectName}-artifacts`,
  ]).Stacks?.[0];
  const outputs = Object.fromEntries(
    (stack?.Outputs ?? []).map((row) => [row.OutputKey, row.OutputValue]),
  );

  console.log("\nArtifact stack outputs:");
  for (const [key, value] of Object.entries(outputs)) console.log(`${key}=${value}`);
}

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
