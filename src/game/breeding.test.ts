import { describe, expect, it } from 'vitest';
import { Block } from '../world/blocks';
import { mulberry32 } from '../world/random';
import { World } from '../world/world';
import { Drops } from './drops';
import { Entities, MAX_SHEEP } from './entities';
import { Inventory } from './inventory';
import { Player } from './player';
import { BREED_COOLDOWN, COURTSHIP_SECONDS, GROW_UP_SECONDS, Sheep } from './sheep';

/** Campo aberto 9×5 limpo ao redor do spawn. */
function field(seed = 7): [World, number, number] {
  const w = new World(seed);
  const [sx, sy] = w.findSpawn();
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -4; dx <= 4; dx++) {
      while (w.topBlock(sx + dx, sy + dy)) w.breakBlock(sx + dx, sy + dy);
      if (w.getGround(sx + dx, sy + dy) === Block.WATER) w.placeBlock(sx + dx, sy + dy, Block.OAK_PLANKS);
    }
  }
  return [w, sx, sy];
}

describe('Inventário e itens caídos', () => {
  it('gasta só o que tem', () => {
    const inv = new Inventory({ wheat: 1 });
    expect(inv.take('wheat')).toBe(true);
    expect(inv.take('wheat')).toBe(false);
    expect(inv.count('wheat_seed')).toBe(0);
  });

  it('personagem coleta itens caídos por perto', () => {
    const [w, sx, sy] = field();
    const p = new Player(sx + 0.5, sy + 0.5);
    const inv = new Inventory({});
    const drops = new Drops();
    drops.spawn(sx + 1.2, sy + 0.5, [{ item: 'wheat', count: 1 }, { item: 'wheat_seed', count: 2 }], mulberry32(1));
    for (let i = 0; i < 120; i++) drops.update(1 / 60, p, inv);
    expect(inv.count('wheat')).toBe(1);
    expect(inv.count('wheat_seed')).toBe(2);
    expect(drops.list.length).toBe(0);
    void w;
  });
});

describe('Ovelhas: comer, namorar e ter filhote', () => {
  it('só adulta sem espera come; fica apaixonada', () => {
    const s = new Sheep(0.5, 0.5, 0.5, 0.5, () => 0.5);
    expect(s.feed()).toBe(true);
    expect(s.inLove).toBe(true);
    expect(s.feed()).toBe(false); // já apaixonada
    const lamb = new Sheep(0.5, 0.5, 0.5, 0.5, () => 0.5, true);
    expect(lamb.feed()).toBe(false);
  });

  it('duas alimentadas por perto se encontram, namoram e nasce um filhote', () => {
    const [w, sx, sy] = field();
    const e = new Entities(new Player(sx - 3.5, sy - 1.5), mulberry32(3));
    const a = new Sheep(sx - 1.5, sy + 0.5, sx, sy, mulberry32(4));
    const b = new Sheep(sx + 2.5, sy + 0.5, sx, sy, mulberry32(5));
    e.npcs.push(a, b);
    a.feed();
    b.feed();
    let sawCourtship = false;
    for (let i = 0; i < 60 * 20 && e.npcs.length === 2; i++) {
      e.update(1 / 60, w);
      if (e.actors.some((x) => x.kind === 'sheep-love')) sawCourtship = true;
    }
    expect(sawCourtship).toBe(true);
    expect(e.npcs.length).toBe(3);
    const lamb = e.npcs[2];
    expect(lamb.baby).toBe(true);
    expect(w.isWalkable(lamb.cellX, lamb.cellY)).toBe(true);
    for (const s of [a, b]) {
      expect(s.inLove).toBe(false);
      expect(s.cooldown).toBeGreaterThan(BREED_COOLDOWN - COURTSHIP_SECONDS - 1);
      expect(s.feed()).toBe(false); // em espera
    }
  });

  it('contornam um bloco entre elas para namorar', () => {
    const [w, sx, sy] = field();
    w.placeBlock(sx, sy, Block.STONE);
    const e = new Entities(new Player(sx - 3.5, sy - 1.5), mulberry32(3));
    const a = new Sheep(sx - 1.5, sy + 0.5, sx, sy, mulberry32(8));
    const b = new Sheep(sx + 2.5, sy + 0.5, sx, sy, mulberry32(9));
    e.npcs.push(a, b);
    a.feed();
    b.feed();
    for (let i = 0; i < 60 * 20 && e.npcs.length === 2; i++) e.update(1 / 60, w);
    expect(e.npcs.length).toBe(3);
  });

  it('uma só alimentada não tem filhote', () => {
    const [w, sx, sy] = field();
    const e = new Entities(new Player(sx - 3.5, sy - 1.5), mulberry32(3));
    const a = new Sheep(sx - 1.5, sy + 0.5, sx, sy, mulberry32(4));
    const b = new Sheep(sx + 1.5, sy + 0.5, sx, sy, mulberry32(5));
    e.npcs.push(a, b);
    a.feed();
    for (let i = 0; i < 60 * 30; i++) e.update(1 / 60, w);
    expect(e.npcs.length).toBe(2);
  });

  it('filhote cresce e vira adulta', () => {
    const [w, sx, sy] = field();
    const lamb = new Sheep(sx + 0.5, sy + 0.5, sx + 0.5, sy + 0.5, mulberry32(6), true);
    for (let t = 0; t < GROW_UP_SECONDS + 1; t += 0.5) lamb.update(0.5, w);
    expect(lamb.baby).toBe(false);
    expect(lamb.spec.halfW).toBeCloseTo(0.3);
  });

  it('respeita o limite de população', () => {
    const [w, sx, sy] = field();
    const e = new Entities(new Player(sx - 3.5, sy - 1.5), mulberry32(3));
    for (let i = 0; i < MAX_SHEEP; i++) e.npcs.push(new Sheep(sx + (i % 5) - 2 + 0.5, sy + 0.5, sx, sy, mulberry32(i)));
    e.npcs[0].feed();
    e.npcs[1].feed();
    for (let i = 0; i < 60 * 10; i++) e.update(1 / 60, w);
    expect(e.npcs.length).toBe(MAX_SHEEP);
  });
});
