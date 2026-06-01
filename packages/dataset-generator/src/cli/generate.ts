import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { generateStreetDataset } from "../generate-street-dataset.js";
import { streetOutputDir } from "../io.js";
import type { FeatureMode, Street } from "../types.js";

const STREETS: Street[] = ["preflop", "flop", "turn", "river"];

const DEFAULT_COUNTS: Record<Street, number> = {
  preflop: 1326,
  flop: 25_000,
  turn: 25_000,
  river: 25_000,
};

function repoArtifactsRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, "..", "..", "..", "artifacts");
}

function parseArgs(argv: string[]) {
  const args: Record<string, string | boolean> = {
    seed: "42",
    mode: "compact",
    batchSize: "1000",
    resume: false,
    all: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--resume") {
      args.resume = true;
      continue;
    }
    if (arg === "--all") {
      args.all = true;
      continue;
    }
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const value = argv[i + 1];
      if (value && !value.startsWith("--")) {
        args[key] = value;
        i++;
      }
    }
  }

  return args;
}

function usage(): string {
  return `Usage:
  pnpm generate --street flop --count 25000 --seed 42 --mode compact [--batch-size 1000] [--resume]
  pnpm generate --all [--seed 42] [--mode compact]

Streets: preflop | flop | turn | river
Preflop default count: 1326 (enumerate all hole-card combos)
Postflop default count: 25000`;
}

async function runOne(
  street: Street,
  count: number,
  seed: number,
  mode: FeatureMode,
  batchSize: number,
  resume: boolean,
  artifactsRoot: string,
) {
  const outputDir = streetOutputDir(artifactsRoot, street);
  return generateStreetDataset({
    street,
    count,
    seed,
    mode,
    batchSize,
    outputDir,
    resume,
    artifactsRoot,
    preflopMode: street === "preflop" ? "enumerate1326" : "random",
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    console.log(usage());
    return;
  }

  const seed = Number(args.seed ?? 42);
  const mode = (args.mode ?? "compact") as FeatureMode;
  const batchSize = Number(args.batchSize ?? 1000);
  const resume = Boolean(args.resume);
  const artifactsRoot = String(args.artifacts ?? repoArtifactsRoot());

  if (args.all) {
    for (const street of STREETS) {
      const count = Number(args.count ?? DEFAULT_COUNTS[street]);
      await runOne(street, count, seed, mode, batchSize, resume, artifactsRoot);
    }
    return;
  }

  const street = args.street as Street | undefined;
  if (!street || !STREETS.includes(street)) {
    console.error(usage());
    process.exit(1);
  }

  const count = Number(args.count ?? DEFAULT_COUNTS[street]);
  await runOne(street, count, seed, mode, batchSize, resume, artifactsRoot);
}

main().catch((err) => {
  console.error("[generate] fatal:", err);
  process.exit(1);
});
