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
  // A door occupies a full structural cell and must NEVER become a thin panel.
  if (!enabled || cell.kind === 'door' || !HORIZONTAL_WALL_IDS.includes(cell.id)) return 'solid';
  const { x, y, z, id } = cell;
  const left = data.get(x - 1, y, z);
  const right = data.get(x + 1, y, z);
  // A door is a universal structural pillar for the experimental wall family.
  // Regular neighboring blocks still require exactly the same stone material.
  const joins = (neighbor: FreeBuildVoxel | undefined) =>
    neighbor?.kind === 'door' && HORIZONTAL_WALL_IDS.includes(neighbor.id)
      || neighbor?.kind !== 'door' && neighbor?.id === id;
  if (!joins(left) || !joins(right)) return 'solid';
  if (data.get(x, y - 1, z) || data.get(x, y + 1, z)) return 'solid';
  return 'thin';
}

/** Repeatable comparison: isolated horizontal runs versus filled stone masses. */
export function buildHorizontalWallDemo(
  editor: Pick<FreeBuildFive, 'clear' | 'set' | 'remove'>,
  id: SanctuaryV2Id = 84,
): void {
  editor.clear();
  for (const [x0, y, size] of [[33, 10, 3], [33, 12, 4], [33, 14, 5]] as const) {
    for (let x = x0; x < x0 + size; x++) editor.set(x, y, 0, id);
  }
  for (let y = 10; y < 12; y++) for (let x = 40; x < 42; x++) editor.set(x, y, 0, id);
  for (let y = 14; y < 17; y++) for (let x = 43; x < 46; x++) editor.set(x, y, 0, id);
  // Door (in another stone material) becomes a pillar between two thin panels.
  for (let x = 33; x <= 39; x++) editor.set(x, 18, 0, id);
  editor.remove(36, 18, 0);
  editor.set(36, 18, 0, 83, 'door');
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
