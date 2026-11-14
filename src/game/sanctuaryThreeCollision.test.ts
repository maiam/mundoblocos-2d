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

describe('Santuário Three.js — colisões físicas', () => {
  it('sobe um bloco de altura e depois desce normalmente', () => {
    const world = new World(42, WORLD_PROFILES.santuario);
    const [sx, sy] = world.findSpawn();
    world.setObject(sx + 2, sy, Block.STONE);
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
    for (const x of [sx + 1, sx + 2, sx + 3]) {
      world.setObject(x, sy + 2, Block.STONE);
      world.placeBlock(x, sy + 2, Block.STONE_SMOOTH);
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
    world.setObject(sx + 2, sy, Block.STONE);
    const player = new Player(sx + 0.5, sy + 0.5);
    configureSanctuaryThreeCollision(player, 'santuario', false);
    // After ~25 frames the player is ON the 1-block step; later frames
    // already carry them beyond the block and back down to ground level.
    for (let i = 0; i < Math.round(25 / SUBDIV); i++) player.update(1/60, 1, 0, world); // (a velocidade dobra com a grade)
    expect(player.x).toBeGreaterThan(sx + 2);
    expect(player.z).toBe(1);
  });
});

describe('Mundo em 2.5D — física sem degrau no piloto (ADR 0031, M5; `?fisica=solida`)', () => {
  it('só liga com o render 3D, a flag e o mundo principal; sem isso o degrau de 1 nível continua', () => {
    const on = new Player(0.5, 0.5);
    configureSanctuaryThreeCollision(on, 'principal', true, true);
    expect(on.spec.stepHeight).toBe(0);
    for (const [three, solid] of [[true, false], [false, true], [false, false]] as const) {
      const p = new Player(0.5, 0.5);
      configureSanctuaryThreeCollision(p, 'principal', three, solid);
      expect(p.spec.stepHeight).toBe(1); // 3D sem a flag, flag sem 3D (2D) e 2D comum: regra antiga
    }
    const sanctuary = new Player(0.5, 0.5);
    configureSanctuaryThreeCollision(sanctuary, 'santuario', true); // o Santuário 3D não depende da flag
    expect(sanctuary.spec.stepHeight).toBe(1);
  });

  it('com a flag o jogador não sobe num cubo, mas anda em terreno plano (e a regra antiga sobe)', () => {
    const world = new World(42);
    const [gx, gy] = world.outsideGate();
    // trecho plano e livre de 6 células ao sul do portão (fora da cidade)
    let spot: [number, number] | null = null;
    for (let dy = 6; dy < 60 && !spot; dy++) for (let dx = -20; dx < 20 && !spot; dx++) {
      const x = gx + dx, y = gy + dy;
      let ok = true;
      // (e também a fileira dois ao sul, onde o teste põe a personagem do terreno plano: na grade fina nem sempre está livre)
      for (let i = 0; i < 6 && ok; i++) ok = world.standHeight(x + i, y) === 0 && world.getObject(x + i, y) === Block.AIR && world.standHeight(x + i, y + 2) === 0 && world.getObject(x + i, y + 2) === Block.AIR;
      if (ok) spot = [x, y];
    }
    expect(spot).not.toBeNull();
    const [x, y] = spot!;
    world.setObject(x + 3, y, Block.STONE);
    expect(world.standHeight(x + 3, y)).toBe(1);

    const solid = new Player(x + 0.5, y + 0.5);
    configureSanctuaryThreeCollision(solid, 'principal', true, true);
    traverse(solid, world, 1, 0);
    expect(solid.x).toBeLessThanOrEqual(x + 3 - solid.spec.halfW + 1e-6); // parou diante do cubo
    expect(solid.z).toBe(0);

    const flat = new Player(x + 0.5, y + 2.5);
    configureSanctuaryThreeCollision(flat, 'principal', true, true);
    const before = flat.x;
    traverse(flat, world, 1, 0);
    expect(flat.x).toBeGreaterThan(before + 2); // terreno plano: anda livre

    const legacy = new Player(x + 0.5, y + 0.5);
    configureSanctuaryThreeCollision(legacy, 'principal', true, false);
    traverse(legacy, world, 1, 0);
    expect(legacy.x).toBeGreaterThan(x + 3); // a regra antiga passa por cima do cubo
  });
});

