import type { World } from '../world/world';
import type { V2Heightfield } from './sanctuaryV2Collision';

/**
 * Experimental 5×5 celestial home within sector D, away from the island
 * and the sacred path. Pure geometric/layout data: NO chunk/save changes.
 *
 * Coordinates are local to the 80×32 Sanctuary.
 * Entrance: (72,29) facing south; staircase climbs 1→2→3→4 in four tiles.
 */
export const HOUSE5 = {
  x: 70, y: 25, size: 5, entranceX: 72, entranceY: 29,
  ground: 0, upstairs: 4,
  visit: [72.5, 30.5] as const,
} as const;

export const HOUSE5_STAIRS: ReadonlyArray<Readonly<{ x: number; y: number; height: number }>> = [
  { x: 71, y: 28, height: 1 },
  { x: 71, y: 27, height: 2 },
  { x: 71, y: 26, height: 3 },
  { x: 72, y: 26, height: 4 },
];

export function isHouseWall(x: number, y: number, playerLevel: number): boolean {
  if (x < HOUSE5.x || x >= HOUSE5.x + HOUSE5.size
    || y < HOUSE5.y || y >= HOUSE5.y + HOUSE5.size) return false;
  const onBoundary = x === HOUSE5.x || x === HOUSE5.x + 4
    || y === HOUSE5.y || y === HOUSE5.y + 4;
  if (!onBoundary) return false;
  // Opening reaches only the ground floor. Upper door area remains a wall.
  return x !== HOUSE5.entranceX || y !== HOUSE5.entranceY || playerLevel >= 3;
}

export function houseSupportLevel(x: number, y: number, playerLevel: number): number | null | undefined {
  if (x < HOUSE5.x || x > HOUSE5.x + 4 || y < HOUSE5.y || y > HOUSE5.y + 4)
    return undefined; // Use the normal V2 terrain outside the house
  if (isHouseWall(x, y, playerLevel)) return null;
  const stair = HOUSE5_STAIRS.find((cell) => cell.x === x && cell.y === y);
  if (stair) return stair.height;
  if (x === HOUSE5.entranceX && y === HOUSE5.entranceY) return 0;
  // One footprint supports two independent walkable elevations.
  // The Walker moves to the upper layer ONLY via the 1→4 staircase.
  return playerLevel >= 3 ? HOUSE5.upstairs : HOUSE5.ground;
}

export function houseFloorName(playerHeight: number, x: number, y: number): string {
  const localX = Math.floor(x), localY = Math.floor(y);
  if (localX < HOUSE5.x || localX > HOUSE5.x + 4 ||
    localY < HOUSE5.y || localY > HOUSE5.y + 4) return 'Exterior';
  if (HOUSE5_STAIRS.some(c => c.x === localX && c.y === localY))
    return 'Escada';
  return playerHeight >= 3 ? '2º pavimento' : 'Térreo';
}

export interface HouseNavigation {
  /** Same Walker collision contract, but with level-dependent floor support. */
  walkerWorld: World;
  standHeight(x: number, y: number): number | null;
  /** Outside fallback is unchanged: important for the old sectors A–C. */
  readonly base: V2Heightfield;
}

export function makeHouseNavigation(
  base: V2Heightfield, worldX0: number, worldY0: number,
  playerLevel: () => number,
): HouseNavigation {
  const standHeight = (worldX: number, worldY: number): number | null => {
    const height = houseSupportLevel(worldX - worldX0, worldY - worldY0, playerLevel());
    return height === undefined ? base.standHeight(worldX, worldY) : height;
  };
  return { base, standHeight, walkerWorld: { standHeight } as World };
}
