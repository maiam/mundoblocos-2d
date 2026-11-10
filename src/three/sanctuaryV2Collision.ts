import type { World } from '../world/world';
import type { SanctuaryV2Cell, SanctuarySector } from './sanctuaryV2Plan';

/**
 * Experimental 80×32 support-height field for the Three.js V2 preview.
 * Walker already owns AABB collision, 1-block ascent and smooth visualZ.
 * Only its standHeight lookup is adapted here; World/Chunk/save stay untouched.
 */
export interface V2Heightfield {
  /** 0 = world floor; 1..5 = walkable upper surfaces; null = world boundary. */
  standHeight(x: number, y: number): number | null;
  /** Returns the support height for the entire player's foot hitbox. */
  supportHeight(x: number, y: number, halfW?: number, halfD?: number): number | null;
  /** Duck-typed bridge to Walker.move; has no World mutation methods. */
  walkerWorld: World;
}

export const V2_WALKABLE_STEP = 1;

/**
 * Floating preview islands at y=3.5 have no ramp or stair connection.
 * They remain overpasses (player can walk beneath), not ground supports.
 */
export function makeV2Heightfield(
  cells: readonly SanctuaryV2Cell[],
  worldX0: number,
  worldY0: number,
): V2Heightfield {
  const heights = new Int8Array(80 * 32);
  for (const cell of cells) {
    if (!Number.isInteger(cell.x) || !Number.isInteger(cell.y)
      || cell.x < 0 || cell.x >= 80 || cell.y < 0 || cell.y >= 32) {
      throw new Error('Coordenada inválida na colisão do laboratório V2.');
    }
    if (!Number.isInteger(cell.height) || cell.height < 1 || cell.height > 5)
      throw new Error('Altura inválida na colisão do laboratório V2.');
    if (!cell.floating) heights[cell.y * 80 + cell.x] = cell.height;
  }
  const standHeight = (x: number, y: number): number | null => {
    const localX = x - worldX0, localY = y - worldY0;
    if (!Number.isInteger(localX) || !Number.isInteger(localY)
      || localX < 0 || localX >= 80 || localY < 0 || localY >= 32) return null;
    return heights[localY * 80 + localX];
  };
  const supportHeight = (x: number, y: number, halfW = 0.27, halfD = 0.15): number | null => {
    let result = 0;
    for (let cy = Math.floor(y - halfD); cy <= Math.floor(y + halfD); cy++) {
      for (let cx = Math.floor(x - halfW); cx <= Math.floor(x + halfW); cx++) {
        const h = standHeight(cx, cy);
        if (h === null) return null;
        result = Math.max(result, h);
      }
    }
    return result;
  };
  return {
    standHeight,
    supportHeight,
    walkerWorld: { standHeight } as World,
  };
}

/**
 * Safe approach points on level-zero ground beside each sector.
 * The C entrance aligns with the 1→5 stone/marble walking ramp.
 */
export const V2_VISIT_POINTS: Record<SanctuarySector, readonly [number, number]> = {
  A: [2.5, 7.5],
  B: [54.0, 7.5],
  C: [13.5, 24.5],
  D: [55.5, 24.5],
};
