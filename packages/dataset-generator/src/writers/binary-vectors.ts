import { open, writeFile } from "node:fs/promises";
import { BINARY_MAGIC, BINARY_VERSION } from "../types.js";

export interface BinaryVectorHeader {
  magic: string;
  version: number;
  count: number;
  dimension: number;
}

export function encodeBinaryVectors(vectors: Float32Array, count: number, dimension: number): Buffer {
  const header = Buffer.alloc(16);
  header.write(BINARY_MAGIC, 0, 4, "ascii");
  header.writeUInt32LE(BINARY_VERSION, 4);
  header.writeUInt32LE(count, 8);
  header.writeUInt32LE(dimension, 12);
  const body = Buffer.from(vectors.buffer, vectors.byteOffset, vectors.byteLength);
  return Buffer.concat([header, body]);
}

export async function writeBinaryVectors(
  filePath: string,
  vectors: Float32Array,
  count: number,
  dimension: number,
): Promise<void> {
  await writeFile(filePath, encodeBinaryVectors(vectors, count, dimension));
}

export async function appendBinaryVectors(
  filePath: string,
  chunk: Float32Array,
  count: number,
  dimension: number,
  append: boolean,
): Promise<void> {
  if (!append) {
    await writeBinaryVectors(filePath, chunk, count, dimension);
    return;
  }

  const fh = await open(filePath, "r+");
  try {
    const header = Buffer.alloc(16);
    await fh.read(header, 0, 16, 0);
    const prevCount = header.readUInt32LE(8);
    const dim = header.readUInt32LE(12);
    if (dim !== dimension) {
      throw new Error(`Vector dimension mismatch during append: ${dim} vs ${dimension}`);
    }
    const nextCount = prevCount + count;
    const countHeader = Buffer.alloc(4);
    countHeader.writeUInt32LE(nextCount, 0);
    await fh.write(countHeader, 0, countHeader.length, 8);
    const body = Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength);
    await fh.write(body, 0, body.length, 16 + prevCount * dimension * 4);
  } finally {
    await fh.close();
  }
}

export async function readBinaryVectorHeader(filePath: string): Promise<BinaryVectorHeader> {
  const fh = await open(filePath, "r");
  try {
    const buf = Buffer.alloc(16);
    await fh.read(buf, 0, 16, 0);
    const magic = buf.toString("ascii", 0, 4);
    if (magic !== BINARY_MAGIC) {
      throw new Error(`Invalid vector binary magic: ${magic}`);
    }
    return {
      magic,
      version: buf.readUInt32LE(4),
      count: buf.readUInt32LE(8),
      dimension: buf.readUInt32LE(12),
    };
  } finally {
    await fh.close();
  }
}

export function vectorsToFloat32(records: { vector: number[] }[], dimension: number): Float32Array {
  const out = new Float32Array(records.length * dimension);
  for (let i = 0; i < records.length; i++) {
    const vec = records[i]!.vector;
    for (let d = 0; d < dimension; d++) {
      out[i * dimension + d] = vec[d] ?? 0;
    }
  }
  return out;
}
