import type { World } from '../world/world';
import { SANCTUARY_V2_IDS, type SanctuaryV2Id } from './sanctuaryV2Materials';

/**
 * Isolated voxel editor for the Santuário Three.js lab, not the game's
 * World/Chunk/save system. Five occupied cube layers: z=0..4 (top surface=5).
 * Adjacent blocks, gaps and elevated slabs are independent coordinates.
 */
export const FREE_BUILD = {
  x: 32, y: 9, width: 16, depth: 14,
  maxLevels: 5,
  visit: [34.5, 15.5] as const,
  camera: [40, 16] as const,
} as const;

export interface FreeBuildVoxel {
  x: number;
  y: number;
  z: number;
  id: SanctuaryV2Id;
}

export type FreeBuildResult =
  | { ok: true; action: 'placed' | 'removed' }
  | { ok: false; reason: 'outside' | 'invalid-level' | 'invalid-material' | 'occupied' | 'empty' | 'limit' };

export class FreeBuildFive {
  private readonly voxels = new Map<string, FreeBuildVoxel>();

  key(x: number, y: number, z: number): string { return x + ':' + y + ':' + z; }
  contains(x: number, y: number): boolean {
    return Number.isInteger(x) && Number.isInteger(y)
      && x >= FREE_BUILD.x && x < FREE_BUILD.x + FREE_BUILD.width
      && y >= FREE_BUILD.y && y < FREE_BUILD.y + FREE_BUILD.depth;
  }
  validLevel(z: number): boolean { return Number.isInteger(z) && z >= 0 && z < FREE_BUILD.maxLevels; }
  get(x: number, y: number, z: number): FreeBuildVoxel | undefined {
    return this.voxels.get(this.key(x, y, z));
  }
  set(x: number, y: number, z: number, id: number): FreeBuildResult {
    if (!this.contains(x, y)) return { ok: false, reason: 'outside' };
    if (!this.validLevel(z)) return { ok: false, reason: 'invalid-level' };
    if (!(SANCTUARY_V2_IDS as readonly number[]).includes(id)) return { ok: false, reason: 'invalid-material' };
    const key = this.key(x, y, z);
    if (this.voxels.has(key)) return { ok: false, reason: 'occupied' };
    if (this.voxels.size >= FREE_BUILD.width * FREE_BUILD.depth * FREE_BUILD.maxLevels)
      return { ok: false, reason: 'limit' };
    this.voxels.set(key, { x, y, z, id: id as SanctuaryV2Id });
    return { ok: true, action: 'placed' };
  }
  remove(x: number, y: number, z: number): FreeBuildResult {
    if (!this.contains(x, y)) return { ok: false, reason: 'outside' };
    if (!this.validLevel(z)) return { ok: false, reason: 'invalid-level' };
    if (!this.voxels.delete(this.key(x, y, z))) return { ok: false, reason: 'empty' };
    return { ok: true, action: 'removed' };
  }
  clear(): void { this.voxels.clear(); }
  list(): FreeBuildVoxel[] {
    return [...this.voxels.values()].sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x);
  }
  get size(): number { return this.voxels.size; }

  /** A literal 5-step adjacent staircase joined to a 5-high suspended slab. */
  example(stairId: SanctuaryV2Id = 84, slabId: SanctuaryV2Id = 82): void {
    this.clear();
    for (let step = 0; step < 5; step++) {
      const x = 35 + step;
      for (let z = 0; z <= step; z++) this.set(x, 15, z, stairId);
    }
    for (let x = 40; x <= 44; x++) for (let y = 13; y <= 17; y++) {
      this.set(x, y, 4, slabId);
    }
    // Adjacent flat testing area, separate from the staircase.
    for (let x = 35; x <= 38; x++) for (let y = 19; y <= 20; y++)
      this.set(x, y, 0, 85);
  }

  /**
   * Physically accessible support for a feet-only Walker with headroom.
   * A 5-block tower cannot be climbed directly from level zero. Sparse upper
   * slabs do not magically lift the player; they can be walked underneath
   * when at least 2 blocks of clear air remain above the current support.
   */
  support(x: number, y: number, currentHeight: number): number | null {
    if (!this.contains(x, y)) return 0;
    const occupied = (z: number) => this.get(x, y, z) !== undefined;
    // Candidate supports from ground and tops of solid blocks, no stepping > 1.
    let h = 0;
    for (let z = 0; z < FREE_BUILD.maxLevels; z++) {
      if (occupied(z) && z + 1 <= currentHeight + 1) h = z + 1;
    }
    // Character clearance: cannot move into a block intersecting the standing body.
    for (let z = 0; z < FREE_BUILD.maxLevels; z++) {
      if (occupied(z) && z < h + 2 && z + 1 > h) return null;
    }
    return h;
  }
}

export function makeFreeBuildNavigation(
  free: FreeBuildFive, worldX0: number, worldY0: number,
  currentLevel: () => number,
): World {
  return {
    standHeight(worldX: number, worldY: number): number | null {
      const x = worldX - worldX0, y = worldY - worldY0;
      if (x < 0 || x >= 80 || y < 0 || y >= 32) return null;
      return free.support(x, y, currentLevel());
    },
  } as World;
}
