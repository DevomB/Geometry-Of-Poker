/** Mulberry32 — fast seeded PRNG with deterministic output. */
export class SeededRng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextInt(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }

  shuffle<T>(items: readonly T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = this.nextInt(i + 1);
      [copy[i], copy[j]] = [copy[j]!, copy[i]!];
    }
    return copy;
  }

  fork(offset: number): SeededRng {
    const child = new SeededRng((this.state ^ offset) >>> 0);
    child.next();
    return child;
  }
}

export function shardSeed(baseSeed: number, street: string, batchIndex: number): number {
  let h = baseSeed >>> 0;
  for (const ch of street) {
    h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0;
  }
  return (h ^ batchIndex) >>> 0;
}
