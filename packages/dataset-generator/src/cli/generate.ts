import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { generateStreetDataset } from "../generate-street-dataset.js";
import { streetOutputDir } from "../io.js";
import type { ExactFeatureBudget, FeatureMode, Street } from "../types.js";

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

function kebabToCamel(key: string): string {
  return key.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function parseArgs(argv: string[]) {
  const args: Record<string, string | boolean> = {
    seed: "42",
    mode: "compact",
    exactFeatureBudget: "production",
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
      const key = kebabToCamel(arg.slice(2));
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
  pnpm generate --street flop --target-count 50000 --extend-from artifacts/datasets/flop --seed 42 --mode compact
  pnpm generate --all [--seed 42] [--mode compact] [--exact-feature-budget production]
  pnpm generate --street preflop --preflop-mode canonical169 [--count 169]

Streets: preflop | flop | turn | river
Preflop default count: 1326 (enumerate all hole-card combos)
Postflop default count: 25000
Dataset growth: --target-count is an alias for --count and --extend-from points at a compatible raw checkpoint
Preflop mode: enumerate1326 | canonical169 | random
Exact feature budget: production | full`;
}

async function runOne(
  street: Street,
  count: number,
  seed: number,
  mode: FeatureMode,
  exactFeatureBudget: ExactFeatureBudget,
  batchSize: number,
  resume: boolean,
  artifactsRoot: string,
  preflopMode: "enumerate1326" | "canonical169" | "random",
  extendFrom?: string,
) {
  const outputDir = streetOutputDir(artifactsRoot, street);
  return generateStreetDataset({
    street,
    count,
    seed,
    mode,
    exactFeatureBudget,
    batchSize,
    outputDir,
    resume,
    artifactsRoot,
    preflopMode: street === "preflop" ? preflopMode : "random",
    extendFrom,
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
  const exactFeatureBudget = (
    args.exactFeatureBudget ??
    (mode === "extended" ? "full" : "production")
  ) as ExactFeatureBudget;
  const batchSize = Number(args.batchSize ?? 1000);
  const resume = Boolean(args.resume);
  const artifactsRoot = String(args.artifacts ?? repoArtifactsRoot());
  const preflopMode = (args.preflopMode ?? "enumerate1326") as
    | "enumerate1326"
    | "canonical169"
    | "random";

  if (args.all) {
    for (const street of STREETS) {
      const count = Number(args.targetCount ?? args.count ?? DEFAULT_COUNTS[street]);
      await runOne(
        street,
        count,
        seed,
        mode,
        exactFeatureBudget,
        batchSize,
        resume,
        artifactsRoot,
        preflopMode,
        args.extendFrom ? String(args.extendFrom) : undefined,
      );
    }
    return;
  }

  const street = args.street as Street | undefined;
  if (!street || !STREETS.includes(street)) {
    console.error(usage());
    process.exit(1);
  }

  const count = Number(args.targetCount ?? args.count ?? DEFAULT_COUNTS[street]);
  await runOne(
    street,
    count,
    seed,
    mode,
    exactFeatureBudget,
    batchSize,
    resume,
    artifactsRoot,
    preflopMode,
    args.extendFrom ? String(args.extendFrom) : undefined,
  );
}

main().catch((err) => {
  console.error("[generate] fatal:", err);
  process.exit(1);
});
