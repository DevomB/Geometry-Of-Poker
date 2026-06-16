#!/usr/bin/env node
/**
 * Post-deploy smoke check for a deployed Geometry of Poker host.
 *
 * Usage:
 *   node scripts/post-deploy-smoke.mjs --host https://your-deployment.vercel.app
 *   DEPLOY_HOST=https://... node scripts/post-deploy-smoke.mjs
 */
function argValue(name) {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value.`);
  }
  return value;
}

const host = (argValue("--host") ?? process.env.DEPLOY_HOST ?? "").replace(/\/$/, "");

if (!host) {
  console.error("Usage: node scripts/post-deploy-smoke.mjs --host https://<deployment-host>");
  process.exit(2);
}

async function check(path, label) {
  const url = `${host}${path}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${label} failed: ${res.status} ${url}\n${text.slice(0, 200)}`);
  }
  return res.json();
}

async function main() {
  const health = await check("/api/health", "Health");
  if (typeof health.ok !== "boolean") {
    throw new Error("Health response missing ok field.");
  }
  console.log(`health: status=${health.status} ok=${health.ok} streets=${(health.availableStreets ?? []).join(",")}`);

  const manifests = await check("/api/manifests", "Manifests");
  const streetCount = Object.keys(manifests.streets ?? {}).length;
  console.log(`manifests: ${streetCount} street(s) available`);
}

main().catch((err) => {
  console.error("[post-deploy-smoke]", err instanceof Error ? err.message : err);
  process.exit(1);
});
