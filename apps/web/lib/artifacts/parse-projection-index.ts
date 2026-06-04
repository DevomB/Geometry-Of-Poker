export const PROJECTION_INDEX_MAGIC = "GOPI";
export const PROJECTION_INDEX_VERSION = 1;
export const PROJECTION_INDEX_HEADER_BYTES = 24;

export interface ProjectionIndexMetadata {
  retainedFeatures: string[];
  scalerMean: number[];
  scalerScale: number[];
  pcaMean: number[];
  pcaComponents: number[];
  ids: string[];
}

export interface ProjectionIndex {
  version: number;
  count: number;
  pcaDimension: number;
  featureCount: number;
  retainedFeatures: string[];
  scalerMean: Float64Array;
  scalerScale: Float64Array;
  pcaMean: Float64Array;
  pcaComponents: Float64Array;
  ids: string[];
  pcaTrain: Float32Array;
  embeddingTrain: Float32Array;
  labels: Int16Array;
}

function readMagic(view: DataView): string {
  return String.fromCharCode(
    view.getUint8(0),
    view.getUint8(1),
    view.getUint8(2),
    view.getUint8(3),
  );
}

function numberArray(name: string, value: unknown, expectedLength: number): Float64Array {
  if (!Array.isArray(value) || value.length !== expectedLength) {
    throw new Error(`${name} length mismatch: expected ${expectedLength}.`);
  }
  return Float64Array.from(value.map((v) => Number(v)));
}

export function parseProjectionIndex(buffer: ArrayBuffer): ProjectionIndex {
  if (buffer.byteLength < PROJECTION_INDEX_HEADER_BYTES) {
    throw new Error("Projection index is too small for a GOPI header.");
  }

  const view = new DataView(buffer);
  const magic = readMagic(view);
  if (magic !== PROJECTION_INDEX_MAGIC) {
    throw new Error(`Invalid projection index magic: ${magic}`);
  }

  const version = view.getUint32(4, true);
  const count = view.getUint32(8, true);
  const pcaDimension = view.getUint32(12, true);
  const featureCount = view.getUint32(16, true);
  const jsonBytes = view.getUint32(20, true);

  if (version !== PROJECTION_INDEX_VERSION) {
    throw new Error(`Unsupported projection index version: ${version}`);
  }
  if (count === 0 || pcaDimension === 0 || featureCount === 0) {
    throw new Error("Projection index dimensions must be non-zero.");
  }

  const jsonStart = PROJECTION_INDEX_HEADER_BYTES;
  const jsonEnd = jsonStart + jsonBytes;
  const pcaStart = Math.ceil(jsonEnd / 4) * 4;
  const paddingBytes = pcaStart - jsonEnd;
  const pcaBytes = count * pcaDimension * 4;
  const embeddingBytes = count * 3 * 4;
  const labelBytes = count * 2;
  const expectedBytes = jsonEnd + paddingBytes + pcaBytes + embeddingBytes + labelBytes;
  if (buffer.byteLength !== expectedBytes) {
    throw new Error(
      `Projection index size mismatch: expected ${expectedBytes}, got ${buffer.byteLength}.`,
    );
  }

  const jsonText = new TextDecoder().decode(buffer.slice(jsonStart, jsonEnd));
  const metadata = JSON.parse(jsonText) as ProjectionIndexMetadata;

  if (!Array.isArray(metadata.retainedFeatures) || metadata.retainedFeatures.length !== featureCount) {
    throw new Error(`retainedFeatures length mismatch: expected ${featureCount}.`);
  }
  if (!Array.isArray(metadata.ids) || metadata.ids.length !== count) {
    throw new Error(`ids length mismatch: expected ${count}.`);
  }

  const embeddingStart = pcaStart + pcaBytes;
  const labelStart = embeddingStart + embeddingBytes;

  return {
    version,
    count,
    pcaDimension,
    featureCount,
    retainedFeatures: metadata.retainedFeatures,
    scalerMean: numberArray("scalerMean", metadata.scalerMean, featureCount),
    scalerScale: numberArray("scalerScale", metadata.scalerScale, featureCount),
    pcaMean: numberArray("pcaMean", metadata.pcaMean, featureCount),
    pcaComponents: numberArray("pcaComponents", metadata.pcaComponents, pcaDimension * featureCount),
    ids: metadata.ids,
    pcaTrain: new Float32Array(buffer, pcaStart, count * pcaDimension),
    embeddingTrain: new Float32Array(buffer, embeddingStart, count * 3),
    labels: new Int16Array(buffer, labelStart, count),
  };
}
