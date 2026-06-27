/**
 * Uniform grid spatial index for fast nearest-neighbor queries in 3D.
 */
type NeighborCandidate = { index: number; distanceSq: number };
type CellOffset = readonly [dx: number, dy: number, dz: number];
type Point3 = readonly [x: number, y: number, z: number];
type CellIndex = readonly [x: number, y: number, z: number];

interface NearestQuery {
  point: Point3;
  k: number;
  maxDistanceSq: number;
  excludeIndex?: number;
}

export interface RayPointQuery {
  positions: Float32Array;
  count: number;
  rayOrigin: Point3;
  rayDirection: Point3;
  threshold?: number;
  sizes?: Float32Array;
  sampleStep?: number;
}

export class GridSpatialIndex {
  private readonly cellSize: number;
  private readonly cells = new Map<string, number[]>();
  private positions: Float32Array | null = null;
  private count = 0;
  private minCellX = 0;
  private maxCellX = 0;
  private minCellY = 0;
  private maxCellY = 0;
  private minCellZ = 0;
  private maxCellZ = 0;

  constructor(cellSize = 0.5) {
    this.cellSize = cellSize;
  }

  build(positions: Float32Array, count: number) {
    this.positions = positions;
    this.count = count;
    this.cells.clear();

    for (let i = 0; i < count; i++) {
      const cellX = Math.floor(positions[i * 3]! / this.cellSize);
      const cellY = Math.floor(positions[i * 3 + 1]! / this.cellSize);
      const cellZ = Math.floor(positions[i * 3 + 2]! / this.cellSize);
      if (i === 0) {
        this.minCellX = cellX;
        this.maxCellX = cellX;
        this.minCellY = cellY;
        this.maxCellY = cellY;
        this.minCellZ = cellZ;
        this.maxCellZ = cellZ;
      } else {
        this.minCellX = Math.min(this.minCellX, cellX);
        this.maxCellX = Math.max(this.maxCellX, cellX);
        this.minCellY = Math.min(this.minCellY, cellY);
        this.maxCellY = Math.max(this.maxCellY, cellY);
        this.minCellZ = Math.min(this.minCellZ, cellZ);
        this.maxCellZ = Math.max(this.maxCellZ, cellZ);
      }

      const key = this.cellKeyFromIndices(cellX, cellY, cellZ);
      const bucket = this.cells.get(key);
      if (bucket) bucket.push(i);
      else this.cells.set(key, [i]);
    }
  }

  nearest(x: number, y: number, z: number, maxDistance = Infinity): number {
    return (
      this.collectNearest({
        point: [x, y, z],
        k: 1,
        maxDistanceSq: maxDistance * maxDistance,
      })[0]?.index ?? -1
    );
  }

  nearestK(
    x: number,
    y: number,
    z: number,
    k: number,
    excludeIndex?: number,
  ): { index: number; distance: number }[] {
    return this.collectNearest({
      point: [x, y, z],
      k,
      maxDistanceSq: Infinity,
      excludeIndex,
    }).map(
      ({ index, distanceSq }) => ({
        index,
        distance: Math.sqrt(distanceSq),
      }),
    );
  }

  private collectNearest(query: NearestQuery): NeighborCandidate[] {
    const limit = Math.floor(query.k);
    if (!this.positions || limit <= 0) return [];

    const [x, y, z] = query.point;
    const results: NeighborCandidate[] = [];
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    const maxRadius = this.maxSearchRadius(cx, cy, cz);

    for (let radius = 0; radius <= maxRadius; radius++) {
      this.visitShell(cx, cy, cz, radius, (index) => {
        if (index === query.excludeIndex) return;

        const distanceSq = this.distanceSqToPoint(index, query.point);
        this.insertCandidate(results, { index, distanceSq }, limit, query.maxDistanceSq);
      });

      const nextRadius = radius + 1;
      const worstDistanceSq =
        results.length >= limit ? results[results.length - 1]!.distanceSq : query.maxDistanceSq;
      if (
        nextRadius > maxRadius ||
        this.minDistanceSqToShell([cx, cy, cz], nextRadius, query.point) >= worstDistanceSq
      ) {
        break;
      }
    }

    return results;
  }

  private insertCandidate(
    results: NeighborCandidate[],
    candidate: NeighborCandidate,
    k: number,
    maxDistanceSq: number,
  ) {
    if (candidate.distanceSq >= maxDistanceSq) return;
    if (results.length === k && candidate.distanceSq >= results[k - 1]!.distanceSq) {
      return;
    }

    let insertAt = results.length;
    while (insertAt > 0 && results[insertAt - 1]!.distanceSq > candidate.distanceSq) {
      insertAt -= 1;
    }
    results.splice(insertAt, 0, candidate);
    if (results.length > k) results.pop();
  }

  private visitShell(
    cx: number,
    cy: number,
    cz: number,
    radius: number,
    visit: (index: number) => void,
  ) {
    for (const [dx, dy, dz] of shellOffsets(radius)) {
      const bucket = this.cells.get(this.cellKeyFromIndices(cx + dx, cy + dy, cz + dz));
      if (!bucket) continue;
      for (const index of bucket) visit(index);
    }
  }

  private maxSearchRadius(cx: number, cy: number, cz: number) {
    return Math.max(
      Math.abs(cx - this.minCellX),
      Math.abs(cx - this.maxCellX),
      Math.abs(cy - this.minCellY),
      Math.abs(cy - this.maxCellY),
      Math.abs(cz - this.minCellZ),
      Math.abs(cz - this.maxCellZ),
    );
  }

  private minDistanceSqToShell([cx, cy, cz]: CellIndex, radius: number, [x, y, z]: Point3) {
    return Math.min(
      this.axisDistanceSqToShell(cx, radius, x),
      this.axisDistanceSqToShell(cy, radius, y),
      this.axisDistanceSqToShell(cz, radius, z),
    );
  }

  private distanceSqToPoint(index: number, [x, y, z]: Point3) {
    const px = this.positions![index * 3]!;
    const py = this.positions![index * 3 + 1]!;
    const pz = this.positions![index * 3 + 2]!;
    return (px - x) ** 2 + (py - y) ** 2 + (pz - z) ** 2;
  }

  private axisDistanceSqToShell(cell: number, radius: number, value: number) {
    const positiveMin = (cell + radius) * this.cellSize;
    const negativeMax = (cell - radius + 1) * this.cellSize;
    const distance = Math.min(positiveMin - value, value - negativeMax);
    return distance * distance;
  }

  private cellKeyFromIndices(x: number, y: number, z: number) {
    return `${x},${y},${z}`;
  }
}

function shellOffsets(radius: number): CellOffset[] {
  const offsets: CellOffset[] = [];

  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      pushMirroredOffset(offsets, [dx, dy, -radius], [dx, dy, radius], radius);
    }
  }

  for (let dx = -radius; dx <= radius; dx++) {
    for (let dz = -radius + 1; dz < radius; dz++) {
      pushMirroredOffset(offsets, [dx, -radius, dz], [dx, radius, dz], radius);
    }
  }

  for (let dy = -radius + 1; dy < radius; dy++) {
    for (let dz = -radius + 1; dz < radius; dz++) {
      pushMirroredOffset(offsets, [-radius, dy, dz], [radius, dy, dz], radius);
    }
  }

  return offsets;
}

function pushMirroredOffset(
  offsets: CellOffset[],
  primary: CellOffset,
  mirrored: CellOffset,
  radius: number,
) {
  offsets.push(primary);
  if (radius > 0) offsets.push(mirrored);
}

/**
 * Screen-space nearest point via ray-sphere intersection approximation.
 */
export function nearestPointToRay(
  {
    positions,
    count,
    rayOrigin,
    rayDirection,
    threshold = 0.15,
    sizes,
    sampleStep = 1,
  }: RayPointQuery,
): number {
  let bestIndex = -1;
  let bestDistSq = threshold * threshold;
  const [ox, oy, oz] = rayOrigin;
  const [dx, dy, dz] = rayDirection;

  const step = Math.max(1, Math.floor(sampleStep));
  for (let i = 0; i < count; i += step) {
    if (sizes && sizes[i]! <= 0) continue;
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
