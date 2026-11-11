import { describe, expect, it } from 'vitest';
import { Player } from '../game/player';
import { FreeBuildFive, makeFreeBuildNavigation } from './freeBuildFive';
import { externalFreeBuildMovement, shouldFollowFreeBuildOnMove } from './freeBuildCameraMovement';
import { adjacentFreeBuildCell } from './adaptiveHorizontalWalls';

describe('Santuário — subida nos blocos com câmeras externas', () => {
  it.each([false, true])(
    'uses the same 1-to-5 stair physics in %s isometric camera mode',
    (isometric) => {
      const build = new FreeBuildFive();
      build.example();
      const player = new Player(34.5, 15.5);
      const world = makeFreeBuildNavigation(build, 0, 0, () => player.z);
      const walk = (target: number) => {
        for (let i = 0; i < 240 && Math.abs(player.x - target) > 0.07; i++) {
          const sign = Math.sign(target - player.x);
          const [sx, sy] = isometric
            ? [sign * Math.SQRT1_2, sign * Math.SQRT1_2]
            : [sign, 0];
          const [ux, uy] = externalFreeBuildMovement(sx, sy, isometric);
          player.move(1/60, ux, uy, world);
        }
        expect(Math.abs(player.x - target)).toBeLessThan(0.12);
      };
      for (let level = 1; level <= 5; level++) {
        walk(34.5 + level);
        expect(player.z).toBe(level);
      }
      // The camera switch changes neither foot support nor saved player Z.
      for (let level = 4; level >= 0; level--) {
        walk(34.5 + level);
        expect(player.z).toBe(level);
      }
    },
  );

  it('stacks by clicking the block top in either external camera without changing edit layer', () => {
    const build = new FreeBuildFive();
    build.set(35, 12, 0, 84);
    for (let level = 0; level < 4; level++) {
      // Orthographic and isometric raycasters both return the same
      // upward-facing voxel normal, so the next cell is one level higher.
      const candidate = adjacentFreeBuildCell(
        { x: 35, y: 12, z: level }, { x: 0, y: 1, z: 0 }, false,
      );
      expect(candidate).toEqual({ x: 35, y: 12, z: level + 1 });
      expect(build.set(candidate.x, candidate.y, candidate.z, 84).ok).toBe(true);
    }
    expect(build.get(35, 12, 4)?.id).toBe(84);
    expect(build.size).toBe(5);
  });

  it('starts following the goddess after moving out of the static overview', () => {
    expect(shouldFollowFreeBuildOnMove(true, false, true, 0, -1)).toBe(true);
    expect(shouldFollowFreeBuildOnMove(true, false, true, 0.7, 0.7)).toBe(true);
    expect(shouldFollowFreeBuildOnMove(true, false, true, 0, 0)).toBe(false);
    expect(shouldFollowFreeBuildOnMove(true, true, true, 1, 0)).toBe(false);
    expect(shouldFollowFreeBuildOnMove(false, false, true, 1, 0)).toBe(false);
    expect(shouldFollowFreeBuildOnMove(true, false, false, 1, 0)).toBe(false);
  });
});
