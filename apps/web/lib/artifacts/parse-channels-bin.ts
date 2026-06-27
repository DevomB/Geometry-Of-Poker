const MAGIC = "GOPC";
const VERSION = 1;
const HEADER_BYTES = 16;
const CHANNEL_COUNT = 10;
const CHANNEL_BYTES = 4 + 2 + 1 + 4 + 4 + 4 + 1 + 1 + 1 + 4;

export interface BrowserChannels {
  equity: Float32Array;
  clusterId: Int16Array;
  categoryIndex: Uint8Array;
  pNuts: Float32Array;
  equityVariance: Float32Array;
  boardConnectivity: Float32Array;
  boardRainbow: Uint8Array;
  boardTwoTone: Uint8Array;
  boardMonotone: Uint8Array;
  boardPairedness: Float32Array;
}

export function parseChannelsBin(buffer: ArrayBuffer): { count: number; channels: BrowserChannels } {
  const view = new DataView(buffer);
  const count = readHeader(view, buffer.byteLength);
  const reader = new ChannelReader(view, count);

  return {
    count,
    channels: {
      equity: reader.float32Array(),
      clusterId: reader.int16Array(),
      categoryIndex: reader.uint8Array(),
      pNuts: reader.float32Array(),
      equityVariance: reader.float32Array(),
      boardConnectivity: reader.float32Array(),
      boardRainbow: reader.uint8Array(),
      boardTwoTone: reader.uint8Array(),
      boardMonotone: reader.uint8Array(),
      boardPairedness: reader.float32Array(),
    },
  };
}

function readHeader(view: DataView, byteLength: number): number {
  if (byteLength < HEADER_BYTES) {
    throw new Error("Channel artifact is too small.");
  }

  const magic = readMagic(view);
  const version = view.getUint32(4, true);
  const count = view.getUint32(8, true);
  const channelCount = view.getUint32(12, true);
  const expectedBytes = HEADER_BYTES + count * CHANNEL_BYTES;

  if (magic !== MAGIC) throw new Error(`Invalid channel magic: ${magic}`);
  if (version !== VERSION) throw new Error(`Unsupported channel version: ${version}`);
  if (channelCount !== CHANNEL_COUNT) throw new Error(`Unsupported channel count: ${channelCount}`);
  if (byteLength !== expectedBytes) {
    throw new Error(`Channel artifact size mismatch: expected ${expectedBytes}, got ${byteLength}`);
  }

  return count;
}

function readMagic(view: DataView): string {
  return String.fromCharCode(
    view.getUint8(0),
    view.getUint8(1),
    view.getUint8(2),
    view.getUint8(3),
  );
}

class ChannelReader {
  private offset = HEADER_BYTES;

  constructor(
    private readonly view: DataView,
    private readonly count: number,
  ) {}

  float32Array(): Float32Array {
    const values = new Float32Array(this.count);
    for (let i = 0; i < this.count; i++, this.offset += 4) {
      values[i] = this.view.getFloat32(this.offset, true);
    }
    return values;
  }

  int16Array(): Int16Array {
    const values = new Int16Array(this.count);
    for (let i = 0; i < this.count; i++, this.offset += 2) {
      values[i] = this.view.getInt16(this.offset, true);
    }
    return values;
  }

  uint8Array(): Uint8Array {
    const values = new Uint8Array(this.count);
    for (let i = 0; i < this.count; i++, this.offset += 1) {
      values[i] = this.view.getUint8(this.offset);
    }
    return values;
  }
}
