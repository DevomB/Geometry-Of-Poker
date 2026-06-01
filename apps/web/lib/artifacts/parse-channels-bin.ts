import type { StreetDataset } from "@/lib/types";

const MAGIC = "GOPC";
const VERSION = 1;
const HEADER_BYTES = 16;

export type BrowserChannels = StreetDataset["channels"];

export function parseChannelsBin(buffer: ArrayBuffer): { count: number; channels: BrowserChannels } {
  const view = new DataView(buffer);
  if (buffer.byteLength < HEADER_BYTES) {
    throw new Error("Channel artifact is too small.");
  }

  const magic = String.fromCharCode(
    view.getUint8(0),
    view.getUint8(1),
    view.getUint8(2),
    view.getUint8(3),
  );
  const version = view.getUint32(4, true);
  const count = view.getUint32(8, true);
  const channelCount = view.getUint32(12, true);

  if (magic !== MAGIC) throw new Error(`Invalid channel magic: ${magic}`);
  if (version !== VERSION) throw new Error(`Unsupported channel version: ${version}`);
  if (channelCount !== 10) throw new Error(`Unsupported channel count: ${channelCount}`);

  const expectedBytes =
    HEADER_BYTES +
    count * 4 +
    count * 2 +
    count +
    count * 4 +
    count * 4 +
    count * 4 +
    count +
    count +
    count +
    count * 4;
  if (buffer.byteLength !== expectedBytes) {
    throw new Error(
      `Channel artifact size mismatch: expected ${expectedBytes}, got ${buffer.byteLength}`,
    );
  }

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

  let offset = HEADER_BYTES;
  for (let i = 0; i < count; i++, offset += 4) equity[i] = view.getFloat32(offset, true);
  for (let i = 0; i < count; i++, offset += 2) clusterId[i] = view.getInt16(offset, true);
  for (let i = 0; i < count; i++, offset += 1) categoryIndex[i] = view.getUint8(offset);
  for (let i = 0; i < count; i++, offset += 4) pNuts[i] = view.getFloat32(offset, true);
  for (let i = 0; i < count; i++, offset += 4) equityVariance[i] = view.getFloat32(offset, true);
  for (let i = 0; i < count; i++, offset += 4) boardConnectivity[i] = view.getFloat32(offset, true);
  for (let i = 0; i < count; i++, offset += 1) boardRainbow[i] = view.getUint8(offset);
  for (let i = 0; i < count; i++, offset += 1) boardTwoTone[i] = view.getUint8(offset);
  for (let i = 0; i < count; i++, offset += 1) boardMonotone[i] = view.getUint8(offset);
  for (let i = 0; i < count; i++, offset += 4) boardPairedness[i] = view.getFloat32(offset, true);

  return {
    count,
    channels: {
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
    },
  };
}
