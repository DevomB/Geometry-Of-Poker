import type { PointCloudBuffers } from "@geometry-of-poker/shared";

export const BINARY_MAGIC = 0x4b504f47; // "GOPK" as little-endian u32
export const BINARY_VERSION = 1;
export const HEADER_BYTES = 16;

export interface ParsedPointsBin {
  version: number;
  count: number;
  dim: number;
  positions: Float32Array;
}

export function parsePointsBin(buffer: ArrayBuffer): ParsedPointsBin {
  const view = new DataView(buffer);
  if (buffer.byteLength < HEADER_BYTES) {
    throw new Error("Invalid GOPK buffer: too short for header.");
  }

  const magic = view.getUint32(0, true);
  if (magic !== BINARY_MAGIC) {
    throw new Error(`Invalid GOPK magic: expected GOPK, got 0x${magic.toString(16)}`);
  }

  const version = view.getUint32(4, true);
  const count = view.getUint32(8, true);
  const dim = view.getUint32(12, true);

  if (version !== BINARY_VERSION) {
    throw new Error(`Unsupported GOPK version: ${version}`);
  }
  if (dim !== 3) {
    throw new Error(`Expected 3D coordinates, got dim=${dim}`);
  }

  const expectedBytes = HEADER_BYTES + count * dim * 4;
  if (buffer.byteLength < expectedBytes) {
    throw new Error(
      `GOPK body truncated: expected ${expectedBytes} bytes, got ${buffer.byteLength}`,
    );
  }

  const positions = new Float32Array(buffer, HEADER_BYTES, count * 3);
  return { version, count, dim, positions };
}

export function createPointCloudBuffers(
  positions: Float32Array,
  count: number,
): PointCloudBuffers {
  const colors = new Float32Array(count * 3);
  colors.fill(0.75);
  return { positions, colors, count };
}

export function computeBounds(positions: Float32Array, count: number) {
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;

  for (let i = 0; i < count; i++) {
    const x = positions[i * 3]!;
    const y = positions[i * 3 + 1]!;
    const z = positions[i * 3 + 2]!;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  }

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const cz = (minZ + maxZ) / 2;
  const radius = Math.max(maxX - minX, maxY - minY, maxZ - minZ) / 2 || 1;

  return {
    min: [minX, minY, minZ] as [number, number, number],
    max: [maxX, maxY, maxZ] as [number, number, number],
    center: [cx, cy, cz] as [number, number, number],
    radius,
  };
}
