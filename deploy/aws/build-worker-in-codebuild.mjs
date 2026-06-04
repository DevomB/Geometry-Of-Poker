#!/usr/bin/env node
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const WORKSPACE_ROOT = resolve(ROOT, "..");
const BUILD_DIR = join(ROOT, ".aws-build");
const STAGE_DIR = join(BUILD_DIR, "release-worker-source");
const ZIP_PATH = join(BUILD_DIR, "release-worker-source.zip");

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
  pnpm aws:build-worker -- --region us-east-1 --account-id <aws-account-id>

Optional:
  --project-name geometry-of-poker
  --stack-name geometry-of-poker-artifacts
  --source-bucket <codebuild-source-bucket>
  --codebuild-project <codebuild-project-name>
  --image-uri <full-ecr-image-uri>
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

function stackOutputs(region, stackName) {
  const stack = awsJson([
    "cloudformation",
    "describe-stacks",
    "--region",
    region,
    "--stack-name",
    stackName,
  ]).Stacks?.[0];
  return Object.fromEntries((stack?.Outputs ?? []).map((row) => [row.OutputKey, row.OutputValue]));
}

function copySource() {
  rmSync(STAGE_DIR, { recursive: true, force: true });
  mkdirSync(STAGE_DIR, { recursive: true });

  for (const item of [
    ".dockerignore",
    ".npmrc",
    "apps",
    "deploy",
    "package.json",
    "packages",
    "pipeline",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "scripts",
  ]) {
    const src = join(ROOT, item);
    if (!existsSync(src)) continue;
    cpSync(src, join(STAGE_DIR, item), {
      recursive: true,
      filter: (path) => {
        const normalized = path.replace(/\\/g, "/");
        const relativePath = relative(ROOT, path).replace(/\\/g, "/");
        const segments = relativePath.split("/");
        if (segments.includes(".git")) return false;
        if (segments.includes(".next")) return false;
        if (segments.includes(".venv")) return false;
        if (segments.includes("dist")) return false;
        if (segments.includes("node_modules")) return false;
        if (segments.includes("__pycache__")) return false;
        if (relativePath === "artifacts" || relativePath.startsWith("artifacts/")) return false;
        if (
          relativePath === "apps/web/public/artifacts" ||
          relativePath.startsWith("apps/web/public/artifacts/")
        ) {
          return false;
        }
        if (!normalized) return false;
        return true;
      },
    });
  }

  const pokerCalculationsSource = join(WORKSPACE_ROOT, "NPM");
  if (!existsSync(pokerCalculationsSource)) {
    throw new Error(
      "Missing sibling NPM/ repo. The AWS worker build needs it to compile poker-calculations natively in CodeBuild.",
    );
  }

  cpSync(pokerCalculationsSource, join(STAGE_DIR, "vendor", "poker-calculations"), {
    recursive: true,
    filter: (path) => {
      const relativePath = relative(pokerCalculationsSource, path).replace(/\\/g, "/");
      const segments = relativePath.split("/");
      if (segments.includes(".git")) return false;
      if (segments.includes("node_modules")) return false;
      if (segments.includes("build")) return false;
      if (segments.includes("build_native_tests")) return false;
      if (segments.includes("prebuilds")) return false;
      if (relativePath === "Poker-Calculations-Image.png") return false;
      return true;
    },
  });
}

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}

function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function walkFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) files.push(...walkFiles(fullPath));
    else if (stats.isFile()) files.push(fullPath);
  }
  return files;
}

function dosDateTime(date) {
  const year = Math.max(date.getFullYear(), 1980);
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { dosDate, dosTime };
}

function u16(value) {
  const buffer = Buffer.allocUnsafe(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

function u32(value) {
  const buffer = Buffer.allocUnsafe(4);
  buffer.writeUInt32LE(value >>> 0);
  return buffer;
}

function zipSource() {
  rmSync(ZIP_PATH, { force: true });
  const fileRecords = [];
  const chunks = [];
  let offset = 0;

  for (const filePath of walkFiles(STAGE_DIR)) {
    const data = readFileSync(filePath);
    const name = relative(STAGE_DIR, filePath).replace(/\\/g, "/");
    const nameBuffer = Buffer.from(name);
    const stats = statSync(filePath);
    const { dosDate, dosTime } = dosDateTime(stats.mtime);
    const checksum = crc32(data);

    const localHeader = Buffer.concat([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(dosTime),
      u16(dosDate),
      u32(checksum),
      u32(data.length),
      u32(data.length),
      u16(nameBuffer.length),
      u16(0),
      nameBuffer,
    ]);

    chunks.push(localHeader, data);
    fileRecords.push({ checksum, dataLength: data.length, dosDate, dosTime, nameBuffer, offset });
    offset += localHeader.length + data.length;
  }

  const centralDirectory = [];
  let centralDirectorySize = 0;
  for (const record of fileRecords) {
    const header = Buffer.concat([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(record.dosTime),
      u16(record.dosDate),
      u32(record.checksum),
      u32(record.dataLength),
      u32(record.dataLength),
      u16(record.nameBuffer.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(record.offset),
      record.nameBuffer,
    ]);
    centralDirectory.push(header);
    centralDirectorySize += header.length;
  }

  const endOfCentralDirectory = Buffer.concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(fileRecords.length),
    u16(fileRecords.length),
    u32(centralDirectorySize),
    u32(offset),
    u16(0),
  ]);

  writeFileSync(ZIP_PATH, Buffer.concat([...chunks, ...centralDirectory, endOfCentralDirectory]));
}

function main() {
  const region = argValue("--region") || process.env.AWS_REGION || "us-east-1";
  const accountId = argValue("--account-id") || process.env.AWS_ACCOUNT_ID;
  const projectName = argValue("--project-name") || "geometry-of-poker";
  const stackName = argValue("--stack-name") || `${projectName}-artifacts`;
  if (!accountId) {
    console.error(usage());
    process.exit(2);
  }

  const outputs = stackOutputs(region, stackName);
  const sourceBucket = argValue("--source-bucket") || outputs.CodeBuildSourceBucketName;
  const codebuildProject = argValue("--codebuild-project") || outputs.CodeBuildProjectName;
  const imageUri =
    argValue("--image-uri") ||
    outputs.EcrRepositoryUri && `${outputs.EcrRepositoryUri}:latest` ||
    `${accountId}.dkr.ecr.${region}.amazonaws.com/${projectName}-release-worker:latest`;

  if (!sourceBucket || !codebuildProject) {
    throw new Error("Missing CodeBuild source bucket/project. Deploy the artifact stack first.");
  }

  copySource();
  zipSource();

  const s3Uri = `s3://${sourceBucket}/source.zip`;
  run("aws", ["s3", "cp", ZIP_PATH, s3Uri, "--region", region, "--only-show-errors"]);

  const build = awsJson([
    "codebuild",
    "start-build",
    "--region",
    region,
    "--project-name",
    codebuildProject,
    "--environment-variables-override",
    `name=IMAGE_URI,value=${imageUri},type=PLAINTEXT`,
  ]).build;

  console.log(`Started CodeBuild build: ${build?.id ?? "(unknown id)"}`);
  console.log(`Image target: ${imageUri}`);
}

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
