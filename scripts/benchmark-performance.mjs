/**
 * Lightweight performance harness for Geometry of Poker documentation.
 * Measures browser-relevant loads and optional native feature-engine profiling.
 *
 * Usage (from visualizer/):
 *   node scripts/benchmark-performance.mjs
 *   node scripts/benchmark-performance.mjs --json > artifacts/benchmarks/latest.json
 */
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { performance } from "node:perf_hooks";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PUBLIC = join(ROOT, "apps/web/public/artifacts/embeddings");
const STREETS = ["preflop", "flop", "turn", "river"];

const BINARY_MAGIC = 0x4b504f47;

function parsePointsBin(buffer) {
  const view = new DataView(buffer);
  const magic = view.getUint32(0, true);
  if (magic !== BINARY_MAGIC) throw new Error("Invalid GOPK");
  const count = view.getUint32(8, true);
  const positions = new Float32Array(buffer, 16, count * 3);
  return { count, positions };
}

function bench(name, fn, iterations = 5) {
  const times = [];
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    fn();
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  return {
    name,
    iterations,
    msMin: times[0],
    msMedian: times[Math.floor(times.length / 2)],
    msMax: times[times.length - 1],
  };
}

function artifactSizes() {
  const rows = [];
  for (const street of STREETS) {
    const dir = join(PUBLIC, street);
    for (const file of ["browser-points.bin", "browser-metadata.json", "viewer-manifest.json"]) {
      const path = join(dir, file);
      if (!existsSync(path)) continue;
      rows.push({ street, file, bytes: statSync(path).size });
    }
  }
  return rows;
}

function browserLoadBenchmarks() {
  const results = [];
  for (const street of STREETS) {
    const dir = join(PUBLIC, street);
    const binPath = join(dir, "browser-points.bin");
    const metaPath = join(dir, "browser-metadata.json");
    if (!existsSync(binPath)) continue;

    const file = readFileSync(binPath);
    const binAb = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);

    const binBench = bench(`${street}/parse-points-bin`, () => parsePointsBin(binAb));
    results.push(binBench);

    if (existsSync(metaPath)) {
      const metaBytes = readFileSync(metaPath);
      const metaBench = bench(`${street}/parse-metadata-json`, () => JSON.parse(metaBytes.toString("utf8")));
      results.push(metaBench);
    }
  }
  return results;
}

function tryNativeProfile() {
  const script = `
    import { profileFeatureGroups } from './dist/profile.js';
    const states = [
      { label: 'preflop', hero: ['As','Kd'], board: [] },
      { label: 'flop', hero: ['As','Kd'], board: ['Jh','7d','2c'] },
      { label: 'turn', hero: ['As','Kd'], board: ['Jh','7d','2c','Ts'] },
      { label: 'river', hero: ['As','Kd'], board: ['Jh','7d','2c','Ts','4h'] },
    ];
    const runs = 10;
    const out = [];
    for (const s of states) {
      const acc = { core:0, board:0, draws:0, removal:0, transitions:0, total:0 };
      for (let i=0;i<runs;i++) {
        const t = profileFeatureGroups({ hero: s.hero, board: s.board }, 'compact');
        for (const k of Object.keys(acc)) acc[k] += t[k];
      }
      for (const k of Object.keys(acc)) acc[k] /= runs;
      out.push({ street: s.label, avgMs: acc, runs });
    }
    console.log(JSON.stringify(out));
  `;
  const res = spawnSync("node", ["--input-type=module", "-e", script], {
    cwd: join(ROOT, "packages/feature-engine"),
    encoding: "utf8",
  });
  if (res.status !== 0) {
    return { available: false, error: (res.stderr || res.stdout || "").trim().split("\n")[0] };
  }
  return { available: true, profiles: JSON.parse(res.stdout.trim()) };
}

const jsonOut = process.argv.includes("--json");
const report = {
  generatedAt: new Date().toISOString(),
  environment: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
  },
  artifactSizes: artifactSizes(),
  browserLoadBenchmarks: browserLoadBenchmarks(),
  nativeFeatureProfile: tryNativeProfile(),
  notes: [
    "Rendering FPS is measured in-browser via the viewer top nav (not captured here).",
    "Embedding runtime is recorded in pipeline analysis-report.md per street.",
    "Dataset generation throughput appears in manifest.json timing after pnpm generate.",
  ],
};

if (jsonOut) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log("# Geometry of Poker — benchmark snapshot\n");
  console.log(`Generated: ${report.generatedAt}`);
  console.log(`Platform: ${report.environment.platform} ${report.environment.arch}\n`);
  console.log("## Artifact sizes\n");
  for (const row of report.artifactSizes) {
    console.log(`- ${row.street}/${row.file}: ${(row.bytes / 1024).toFixed(1)} KB`);
  }
  console.log("\n## Browser load benchmarks (median ms)\n");
  for (const b of report.browserLoadBenchmarks) {
    console.log(`- ${b.name}: ${b.msMedian.toFixed(2)} ms (min ${b.msMin.toFixed(2)}, max ${b.msMax.toFixed(2)})`);
  }
  console.log("\n## Native feature profile\n");
  if (report.nativeFeatureProfile.available) {
    console.log(JSON.stringify(report.nativeFeatureProfile.profiles, null, 2));
  } else {
    console.log(`Unavailable: ${report.nativeFeatureProfile.error}`);
  }
}
