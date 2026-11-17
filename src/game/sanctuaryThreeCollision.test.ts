import { SUBDIV } from '../config';
import { describe, expect, it } from 'vitest';
import { Block } from '../world/blocks';
import { WORLD_PROFILES } from '../world/profiles';
import { World } from '../world/world';
import { Player } from './player';
import { configureSanctuaryThreeCollision } from './sanctuaryThreeCollision';

const traverse = (player: Player, world: World, dx: number, dy: number) => {
  for (let i = 0; i < 160; i++) player.update(1/60, dx, dy, world);
};

/** Os testes de física criam sua própria pista sem modificar a seed em produção. */
function clearTestArea(world: World, sx: number, sy: number, rows = 1): void {
  for (let y = sy; y < sy + rows; y++) for (let x = sx; x < sx + 18; x++) {
    while (world.topBlock(x, y)) world.breakBlock(x, y);
  }
}

describe('Santuário Three.js — colisões físicas', () => {
  it('sobe um bloco de altura e depois desce normalmente', () => {
    const world = new World(42, WORLD_PROFILES.santuario);
    const [sx, sy] = world.findSpawn();
    clearTestArea(world, sx, sy);
    world.setObject(sx + 2, sy, Block.ISO_G_STONE);
    expect(world.standHeight(sx + 2, sy)).toBe(1);

    const player = new Player(sx + 0.5, sy + 0.5);
    configureSanctuaryThreeCollision(player, 'santuario', true);
    expect(player.spec.stepHeight).toBe(1);

    for (let i = 0; i < Math.round(25 / SUBDIV); i++) player.update(1/60, 1, 0, world);
    expect(player.x).toBeGreaterThan(sx + 2);
    expect(player.z).toBe(1);
    traverse(player, world, 1, 0);
    expect(player.z).toBe(0);
  });

  it('não atravessa paredes horizontais finas nem pilares com dois blocos', () => {
    const world = new World(42, WORLD_PROFILES.santuario);
    const [sx, sy] = world.findSpawn();
    clearTestArea(world, sx, sy, 4);
    for (const x of [sx + 1, sx + 2, sx + 3]) {
      world.setObject(x, sy + 2, Block.ISO_G_STONE);
      world.placeBlock(x, sy + 2, Block.ISO_G_STONE_PLAIN);
    }
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
    clearTestArea(world, sx, sy);
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
    expect(webgl.spec.stepHeight).toBe(1);
  });

  it('preserva o mecanismo anterior de degraus nos perfis 2D', () => {
    const world = new World(42, WORLD_PROFILES.santuario);
    const [sx, sy] = world.findSpawn();
    clearTestArea(world, sx, sy);
    world.setObject(sx + 2, sy, Block.ISO_G_STONE);
    const player = new Player(sx + 0.5, sy + 0.5);
    configureSanctuaryThreeCollision(player, 'santuario', false);
    // After ~25 frames the player is ON the 1-block step; later frames
    // already carry them beyond the block and back down to ground level.
    for (let i = 0; i < Math.round(25 / SUBDIV); i++) player.update(1/60, 1, 0, world); // (a velocidade dobra com a grade)
    expect(player.x).toBeGreaterThan(sx + 2);
    expect(player.z).toBe(1);
  });
});

describe('Mundo em 2.5D — blocos de 1/4 (ADR 0033)', () => {
  it('o 3D não altera o degrau do Mundo: a regra de 1 a 3 blocos é do World.stepLevels', () => {
    for (const [three, solid] of [[true, true], [true, false], [false, true], [false, false]] as const) {
      const p = new Player(0.5, 0.5);
      configureSanctuaryThreeCollision(p, 'principal', three, solid);
      expect(p.spec.stepHeight).toBe(1);
    }
  });

  it('sobe de 1 a 3 blocos empilhados e para diante da pilha de 4', () => {
    const world = new World(42);
    const [gx, gy] = world.outsideGate();
    let spot: [number, number] | null = null;
    for (let dy = 6; dy < 60 && !spot; dy++) for (let dx = -20; dx < 20 && !spot; dx++) {
      const x = gx + dx, y = gy + dy;
      let ok = true;
      for (let i = 0; i < 8 && ok; i++) ok = world.standHeight(x + i, y) === 0 && world.getObject(x + i, y) === Block.AIR;
      if (ok) spot = [x, y];
    }
    expect(spot).not.toBeNull();
    const [x, y] = spot!;
    for (let i = 0; i < 3; i++) world.placeBlock(x + 3, y, Block.STONE);
    for (let i = 0; i < 4; i++) world.placeBlock(x + 6, y, Block.STONE);
    const p = new Player(x + 0.5, y + 0.5);
    configureSanctuaryThreeCollision(p, 'principal', true);
    traverse(p, world, 1, 0);
    expect(p.x).toBeGreaterThan(x + 3); // passou por cima dos 3 blocos
    expect(p.x).toBeLessThanOrEqual(x + 6 - p.spec.halfW + 1e-6); // parou diante da pilha de 4
  });
});
