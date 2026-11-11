import { describe, expect, it } from 'vitest';
import { Block } from '../world/blocks';
import { WORLD_PROFILES } from '../world/profiles';
import { World } from '../world/world';
import { Player } from './player';
import { configureSanctuaryThreeCollision } from './sanctuaryThreeCollision';

const traverse = (player: Player, world: World, dx: number, dy: number) => {
  for (let i = 0; i < 160; i++) player.update(1/60, dx, dy, world);
};

describe('Santuário Three.js — colisões físicas', () => {
  it('não atravessa nem sobe automaticamente um cubo sólido de um nível', () => {
    const world = new World(42, WORLD_PROFILES.santuario);
    const [sx, sy] = world.findSpawn();
    world.setObject(sx + 2, sy, Block.STONE_CELESTIAL);
    expect(world.standHeight(sx + 2, sy)).toBe(1);

    const player = new Player(sx + 0.5, sy + 0.5);
    configureSanctuaryThreeCollision(player, 'santuario', true);
    expect(player.spec.stepHeight).toBe(0);

    traverse(player, world, 1, 0);
    expect(player.x).toBeLessThanOrEqual(sx + 2 - player.spec.halfW);
    expect(player.z).toBe(0);
  });

  it('não atravessa paredes horizontais finas nem pilares com dois blocos', () => {
    const world = new World(42, WORLD_PROFILES.santuario);
    const [sx, sy] = world.findSpawn();
    for (const x of [sx + 1, sx + 2, sx + 3]) {
      world.setObject(x, sy + 2, Block.STONE_CELESTIAL);
    }
    world.placeBlock(sx + 1, sy + 2, Block.STONE_GOLDEN);
    expect(world.stackHeight(sx + 1, sy + 2)).toBe(2);
    const front = new Player(sx + 2.5, sy + 0.5);
    configureSanctuaryThreeCollision(front, 'santuario', true);

    traverse(front, world, 0, 1);
    expect(front.y).toBeLessThanOrEqual(sy + 2 - front.spec.halfD);
    expect(front.z).toBe(0);

    const side = new Player(sx + 0.5, sy + 2.5);
    configureSanctuaryThreeCollision(side, 'santuario', true);
    traverse(side, world, 1, 0);
    expect(side.x).toBeLessThanOrEqual(sx + 1 - side.spec.halfW);
    expect(side.z).toBe(0);
  });

  it('mantém a movimentação livre em nuvens vazias', () => {
    const world = new World(42, WORLD_PROFILES.santuario);
    const [sx, sy] = world.findSpawn();
    const player = new Player(sx + 0.5, sy + 0.5);
    configureSanctuaryThreeCollision(player, 'santuario', true);
    traverse(player, world, 1, 0);
    expect(player.x).toBeGreaterThan(sx + 3);
    expect(player.z).toBe(0);
  });

  it('mantém STEP_HEIGHT do Santuário Canvas2D e do Mundo principal', () => {
    const main = new Player(0.5, 0.5);
    configureSanctuaryThreeCollision(main, 'principal', true);
    expect(main.spec.stepHeight).toBe(1);

    const fallback = new Player(0.5, 0.5);
    configureSanctuaryThreeCollision(fallback, 'santuario', false);
    expect(fallback.spec.stepHeight).toBe(1);

    const webgl = new Player(0.5, 0.5);
    configureSanctuaryThreeCollision(webgl, 'santuario', true);
    expect(webgl.spec.stepHeight).toBe(0);
  });

  it('preserva o mecanismo anterior de degraus nos perfis 2D', () => {
    const world = new World(42, WORLD_PROFILES.santuario);
    const [sx, sy] = world.findSpawn();
    world.setObject(sx + 2, sy, Block.STONE_CELESTIAL);
    const player = new Player(sx + 0.5, sy + 0.5);
    configureSanctuaryThreeCollision(player, 'santuario', false);
    // After ~25 frames the player is ON the 1-block step; later frames
    // already carry them beyond the block and back down to ground level.
    for (let i = 0; i < 25; i++) player.update(1/60, 1, 0, world);
    expect(player.x).toBeGreaterThan(sx + 2);
    expect(player.z).toBe(1);
  });
});
