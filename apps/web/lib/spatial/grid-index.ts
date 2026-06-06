/**
 * Uniform grid spatial index for fast nearest-neighbor queries in 3D.
 */
export class GridSpatialIndex {
  private readonly cellSize: number;
  private readonly cells = new Map<string, number[]>();
  private positions: Float32Array | null = null;
  private count = 0;

  constructor(cellSize = 0.5) {
    this.cellSize = cellSize;
  }

  build(positions: Float32Array, count: number) {
    this.positions = positions;
    this.count = count;
    this.cells.clear();

    for (let i = 0; i < count; i++) {
      const key = this.cellKey(
        positions[i * 3]!,
        positions[i * 3 + 1]!,
        positions[i * 3 + 2]!,
      );
      const bucket = this.cells.get(key);
      if (bucket) bucket.push(i);
      else this.cells.set(key, [i]);
    }
  }

  nearest(x: number, y: number, z: number, maxDistance = Infinity): number {
    if (!this.positions) return -1;

    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    const cz = Math.floor(z / this.cellSize);

    let bestIndex = -1;
    let bestDistSq = maxDistance * maxDistance;

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const key = `${cx + dx},${cy + dy},${cz + dz}`;
          const bucket = this.cells.get(key);
          if (!bucket) continue;

          for (const i of bucket) {
            const px = this.positions[i * 3]!;
            const py = this.positions[i * 3 + 1]!;
            const pz = this.positions[i * 3 + 2]!;
            const distSq = (px - x) ** 2 + (py - y) ** 2 + (pz - z) ** 2;
            if (distSq < bestDistSq) {
              bestDistSq = distSq;
              bestIndex = i;
            }
          }
        }
      }
    }

    return bestIndex;
  }

  nearestK(x: number, y: number, z: number, k: number): { index: number; distance: number }[] {
    if (!this.positions) return [];

    const results: { index: number; distance: number }[] = [];
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    const radius = Math.ceil(Math.sqrt(k / 10)) + 2;

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dz = -radius; dz <= radius; dz++) {
          const key = `${cx + dx},${cy + dy},${cz + dz}`;
          const bucket = this.cells.get(key);
          if (!bucket) continue;

          for (const i of bucket) {
            const px = this.positions[i * 3]!;
            const py = this.positions[i * 3 + 1]!;
            const pz = this.positions[i * 3 + 2]!;
            const dist = Math.sqrt((px - x) ** 2 + (py - y) ** 2 + (pz - z) ** 2);
            results.push({ index: i, distance: dist });
          }
        }
      }
    }

    results.sort((a, b) => a.distance - b.distance);
    return results.slice(0, k);
  }

  private cellKey(x: number, y: number, z: number) {
    return `${Math.floor(x / this.cellSize)},${Math.floor(y / this.cellSize)},${Math.floor(z / this.cellSize)}`;
  }
}

/**
 * Screen-space nearest point via ray-sphere intersection approximation.
 */
export function nearestPointToRay(
  positions: Float32Array,
  count: number,
  rayOrigin: [number, number, number],
  rayDirection: [number, number, number],
  threshold = 0.15,
): number {
  let bestIndex = -1;
  let bestDistSq = threshold * threshold;
  const [ox, oy, oz] = rayOrigin;
  const [dx, dy, dz] = rayDirection;

  for (let i = 0; i < count; i++) {
    const px = positions[i * 3]!;
    const py = positions[i * 3 + 1]!;
    const pz = positions[i * 3 + 2]!;

    const vx = px - ox;
    const vy = py - oy;
    const vz = pz - oz;
    const t = vx * dx + vy * dy + vz * dz;
    if (t < 0) continue;

    const cx = ox + dx * t;
    const cy = oy + dy * t;
    const cz = oz + dz * t;
    const distSq = (px - cx) ** 2 + (py - cy) ** 2 + (pz - cz) ** 2;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      bestIndex = i;
    }
  }

  return bestIndex;
}
