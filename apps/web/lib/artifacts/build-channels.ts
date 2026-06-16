import type { BrowserPointMeta } from "@/lib/types";
import type { BrowserChannels } from "@/lib/artifacts/parse-channels-bin";
import { categoryIndexForLabel } from "@geometry-of-poker/shared";

export function buildChannelsFromMetadata(
  metadata: BrowserPointMeta[],
  count: number,
): BrowserChannels {
  const equity = new Float32Array(count);
  const clusterId = new Int16Array(count);
  const categoryIndex = new Uint8Array(count);
  const pNuts = new Float32Array(count);
  const equityVariance = new Float32Array(count);
  const boardConnectivity = new Float32Array(count);
  const boardRainbow = new Uint8Array(count);
  const boardTwoTone = new Uint8Array(count);
  const boardMonotone = new Uint8Array(count);
  const boardPairedness = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const p = metadata[i]!;
    equity[i] = p.equityVsRandom;
    clusterId[i] = p.clusterId;
    categoryIndex[i] = categoryIndexForLabel(p.category);
    pNuts[i] = p.summary.pNuts ?? 0;
    equityVariance[i] = p.summary.equityVariance ?? 0;
    boardConnectivity[i] = p.summary.boardConnectivityScore ?? 0;
    boardRainbow[i] = (p.summary.boardRainbowFlag ?? 0) > 0.5 ? 1 : 0;
    boardTwoTone[i] = (p.summary.boardTwoToneFlag ?? 0) > 0.5 ? 1 : 0;
    boardMonotone[i] = (p.summary.boardMonotoneFlag ?? 0) > 0.5 ? 1 : 0;
    boardPairedness[i] = p.summary.boardPairednessScore ?? 0;
  }

  return {
    equity,
    clusterId,
    categoryIndex,
    pNuts,
    equityVariance,
    boardConnectivity,
    boardRainbow,
    boardTwoTone,
    boardMonotone,
    boardPairedness,
  };
}

export function buildEmptyChannels(count: number): BrowserChannels {
  return {
    equity: new Float32Array(count),
    clusterId: new Int16Array(count),
    categoryIndex: new Uint8Array(count),
    pNuts: new Float32Array(count),
    equityVariance: new Float32Array(count),
    boardConnectivity: new Float32Array(count),
    boardRainbow: new Uint8Array(count),
    boardTwoTone: new Uint8Array(count),
    boardMonotone: new Uint8Array(count),
    boardPairedness: new Float32Array(count),
  };
}
