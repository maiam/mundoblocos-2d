import type { FreeBuildFive, FreeBuildVoxel } from './freeBuildFive';
import type { SanctuaryV2Id } from './sanctuaryV2Materials';

/** Only decorative stone/marble construction blocks qualify; never clouds or terrain. */
export const HORIZONTAL_WALL_IDS: readonly SanctuaryV2Id[] = [82, 83, 84, 85];
export const HORIZONTAL_WALL_THICKNESS = 0.5;

/** In the existing superior camera the visible/front face is the +Z edge. */
export function horizontalWallZBounds(z: number, thin: boolean): { rearZ: number; frontZ: number } {
  return {
    rearZ: thin ? z + 1 - HORIZONTAL_WALL_THICKNESS : z,
    frontZ: z + 1,
  };
}
export type HorizontalWallShape = 'solid' | 'thin';

/**
 * A block becomes a horizontal panel only when it is strictly between two
 * blocks of the same construction material, and has no north/south neighbour.
 * This is visual-only and local to the ephemeral Five-Level Santuário editor.
 */
export function horizontalWallShape(
  data: Pick<FreeBuildFive, 'get'>,
  cell: FreeBuildVoxel,
  enabled: boolean,
): HorizontalWallShape {
  if (!enabled || !HORIZONTAL_WALL_IDS.includes(cell.id)) return 'solid';
  const { x, y, z, id } = cell;
  const left = data.get(x - 1, y, z);
  const right = data.get(x + 1, y, z);
  if (left?.id !== id || right?.id !== id) return 'solid';
  if (data.get(x, y - 1, z) || data.get(x, y + 1, z)) return 'solid';
  return 'thin';
}

/** Repeatable comparison: isolated horizontal runs versus filled stone masses. */
export function buildHorizontalWallDemo(
  editor: Pick<FreeBuildFive, 'clear' | 'set'>,
  id: SanctuaryV2Id = 84,
): void {
  editor.clear();
  for (const [x0, y, size] of [[33, 10, 3], [33, 12, 4], [33, 14, 5]] as const) {
    for (let x = x0; x < x0 + size; x++) editor.set(x, y, 0, id);
  }
  for (let y = 10; y < 12; y++) for (let x = 40; x < 42; x++) editor.set(x, y, 0, id);
  for (let y = 14; y < 17; y++) for (let x = 43; x < 46; x++) editor.set(x, y, 0, id);
}

/**
 * Place against the original logical voxel, rather than floor(hit.point):
 * a recessed thin-wall face is not at the cell boundary.
 */
export function adjacentFreeBuildCell(
  cell: Pick<FreeBuildVoxel, 'x' | 'y' | 'z'>,
  normal: { x: number; y: number; z: number },
  remove: boolean,
): {x: number; y: number; z: number} {
  if (remove) return { x: cell.x, y: cell.y, z: cell.z };
  const ax = Math.abs(normal.x), ay = Math.abs(normal.y), az = Math.abs(normal.z);
  if (ax >= ay && ax >= az) return { x: cell.x + Math.sign(normal.x), y: cell.y, z: cell.z };
  if (ay >= az) return { x: cell.x, y: cell.y, z: cell.z + Math.sign(normal.y) };
  return { x: cell.x, y: cell.y + Math.sign(normal.z), z: cell.z };
}
