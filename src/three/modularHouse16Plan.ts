import type { World } from '../world/world';
import type { V2Heightfield } from './sanctuaryV2Collision';

/**
 * Construction V1 — genuinely separate block-level data for the ground and
 * upper floor. 16×12 fits the Santuário sector D (80×32 world); each element
 * owns an integer (x, y, level) independent from World/Chunk/save.
 */
export const HOUSE16 = {
  x: 54, y: 18, width: 16, depth: 12,
  entrance: [61, 62] as const,
  southY: 29,
  upperLevel: 4,
  visit: [61.5, 30.5] as const,
} as const;

export type HouseLevel = 0 | 4;
export type HouseBuildPiece = 'wall' | 'floor';
export type HouseStair = Readonly<{ x: number; y: number; height: number }>;
export const HOUSE16_STAIRS: readonly HouseStair[] = [
  { x: 65, y: 26, height: 1 }, { x: 66, y: 26, height: 1 },
  { x: 65, y: 25, height: 2 }, { x: 66, y: 25, height: 2 },
  { x: 65, y: 24, height: 3 }, { x: 66, y: 24, height: 3 },
  { x: 65, y: 23, height: 4 }, { x: 66, y: 23, height: 4 },
];

export interface HousePiece {
  x: number; y: number; level: HouseLevel; kind: HouseBuildPiece;
}

/** Fresh, in-memory model; can be rebuilt and edited without affecting World. */
export class ModularHouse16 {
  readonly walls = new Set<string>();
  readonly floors = new Set<string>();
  readonly stairs = new Map<string, number>();
  constructor() {
    for (const cell of HOUSE16_STAIRS) this.stairs.set(this.cellKey(cell.x, cell.y), cell.height);
    for (let y = HOUSE16.y; y < HOUSE16.y + HOUSE16.depth; y++) {
      for (let x = HOUSE16.x; x < HOUSE16.x + HOUSE16.width; x++) {
        const perimeter = this.isBoundary(x, y);
        const door = this.isDoor(x, y);
        if (perimeter && !door) this.walls.add(this.key(x, y, 0));
        if (perimeter) this.walls.add(this.key(x, y, 4));
        // Interior can be modified cell by cell without recreating a monolithic house.
        if (!perimeter && !this.stairHole(x, y)) this.floors.add(this.key(x, y, 4));
      }
    }
    // Ground-floor inner partitions with door passages.
    for (let x = 55; x <= 61; x++) if (x !== 58) this.walls.add(this.key(x, 23, 0));
    for (let y = 19; y <= 23; y++) if (y !== 21) this.walls.add(this.key(61, y, 0));
    for (let x = 55; x <= 59; x++) if (x !== 57) this.walls.add(this.key(x, 26, 0));
    // Upstairs rooms, with clear hall and a two-cell opening to the stair landing.
    for (let x = 55; x <= 63; x++) if (x !== 60 && x !== 61) this.walls.add(this.key(x, 23, 4));
    for (let y = 24; y <= 27; y++) if (y !== 26) this.walls.add(this.key(61, y, 4));
  }

  key(x: number, y: number, level: HouseLevel): string { return x + ':' + y + ':' + level; }
  cellKey(x: number, y: number): string { return x + ':' + y; }
  contains(x: number, y: number): boolean {
    return Number.isInteger(x) && Number.isInteger(y)
      && x >= HOUSE16.x && x < HOUSE16.x + HOUSE16.width
      && y >= HOUSE16.y && y < HOUSE16.y + HOUSE16.depth;
  }
  isBoundary(x: number, y: number): boolean {
    return x === HOUSE16.x || x === HOUSE16.x + HOUSE16.width - 1
      || y === HOUSE16.y || y === HOUSE16.y + HOUSE16.depth - 1;
  }
  isDoor(x: number, y: number): boolean {
    return y === HOUSE16.southY && HOUSE16.entrance.some(dx => dx === x);
  }
  stairHole(x: number, y: number): boolean {
    // Keep the 2×4 stairwell open, even after editing upper-floor tiles.
    return (x === 65 || x === 66) && y >= 24 && y <= 27;
  }
  stairHeight(x: number, y: number): number | undefined { return this.stairs.get(this.cellKey(x, y)); }
  hasWall(x: number, y: number, level: HouseLevel): boolean {
    return this.walls.has(this.key(x, y, level));
  }
  hasFloor(x: number, y: number, level: HouseLevel): boolean {
    return level === 0 ? this.contains(x, y) : this.floors.has(this.key(x, y, level));
  }
  /** Edit walls or upper slab tiles (both genuinely 1-cell, not prefab). */
  toggle(x: number, y: number, level: HouseLevel, kind: HouseBuildPiece): boolean {
    if (!this.contains(x, y)) return false;
    if (this.stairHeight(x, y) !== undefined) return false; // Protect the stair path.
    if (kind === 'floor' && (level === 0 || this.isBoundary(x, y) || this.stairHole(x, y))) return false;
    const store = kind === 'wall' ? this.walls : this.floors;
    const key = this.key(x, y, level);
    if (store.has(key)) store.delete(key);
    else store.add(key);
    return true;
  }
  pieces(): HousePiece[] {
    const result: HousePiece[] = [];
    for (const s of this.walls) {
      const [x, y, level] = s.split(':').map(Number);
      result.push({ x, y, level: level as HouseLevel, kind: 'wall' });
    }
    for (const s of this.floors) {
      const [x, y, level] = s.split(':').map(Number);
      result.push({ x, y, level: level as HouseLevel, kind: 'floor' });
    }
    return result.sort((a, b) => a.level - b.level || a.y - b.y || a.x - b.x || a.kind.localeCompare(b.kind));
  }

  /** 0 and 4 may coexist at exactly the same (x,y). */
  support(x: number, y: number, currentLevel: number): number | null | undefined {
    if (!this.contains(x, y)) return undefined;
    const layer: HouseLevel = currentLevel >= 3 ? 4 : 0;
    if (this.hasWall(x, y, layer)) return null;
    const stair = this.stairHeight(x, y);
    if (stair !== undefined) return stair;
    // Upper floor is independent from ground; gaps lead down to ground.
    return layer === 4 && this.hasFloor(x, y, 4) ? 4 : 0;
  }
  floorName(x: number, y: number, z: number): string {
    if (!this.contains(x, y)) return 'Exterior';
    if (this.stairHeight(x, y) !== undefined) return 'Escadaria';
    return z >= 3 ? '2º pavimento' : 'Térreo';
  }
}

export function makeHouse16Navigation(
  house: ModularHouse16,
  base: V2Heightfield,
  worldX0: number, worldY0: number,
  level: () => number,
): World {
  return {
    standHeight(worldX: number, worldY: number): number | null {
      const h = house.support(worldX - worldX0, worldY - worldY0, level());
      return h === undefined ? base.standHeight(worldX, worldY) : h;
    },
  } as World;
}
