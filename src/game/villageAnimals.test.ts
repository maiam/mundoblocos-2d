import { describe, expect, it } from 'vitest';
import { SUBDIV } from '../config';
import { World } from '../world/world';
import { Player } from './player';
import { Entities, VILLAGE_ANIMALS_EACH } from './entities';
import { Block } from '../world/blocks';
import { inRect } from '../world/dungeon';

function wildlife(seed: number) {
  const w = new World(seed);
  const [sx, sy] = w.findSpawn();
  const e = new Entities(new Player(sx + 0.5, sy + 0.5), () => 0.5);
  e.spawnWildlife(w);
  return { w, e };
}

describe.runIf(SUBDIV === 2)('animais domésticos na Vila Camponesa (v0.93.91)', () => {
  it('3 de cada: ovelhas, vacas, galinhas, capivaras e cavalos nascem dentro da vila, em grama', () => {
    const { w, e } = wildlife(42);
    const v = w.village!;
    const sheep = e.npcs;
    const by = (k: string) => e.horses.filter((h) => h.kind === k);
    expect(sheep).toHaveLength(VILLAGE_ANIMALS_EACH);
    for (const k of ['cow', 'chicken', 'capybara', 'horse']) expect(by(k), k).toHaveLength(VILLAGE_ANIMALS_EACH);
    expect(VILLAGE_ANIMALS_EACH).toBe(3);
    for (const a of [...sheep, ...e.horses]) {
      expect(inRect(v.area, Math.floor(a.x), Math.floor(a.y)), `${a.constructor.name} em ${a.x},${a.y}`).toBe(true);
      expect(w.getGround(Math.floor(a.x), Math.floor(a.y))).toBe(Block.GRASS);
    }
    expect(e.npcs.every((n) => n.constructor.name === 'Sheep')).toBe(true);
    expect(e.horses).toHaveLength(4 * VILLAGE_ANIMALS_EACH); // nenhum cavalo extra no campo
  });

  it('é determinístico pela seed e as galinhas ficam perto do galinheiro (nordeste da vila)', () => {
    const a = wildlife(7), b = wildlife(7);
    expect(a.e.horses.map((h) => [h.kind, h.x, h.y])).toEqual(b.e.horses.map((h) => [h.kind, h.x, h.y]));
    const v = a.w.village!;
    for (const c of a.e.horses.filter((h) => h.kind === 'chicken')) {
      expect(c.x).toBeGreaterThan(v.area.x0 + 30);
      expect(c.y).toBeLessThan(v.area.y0 + 17);
    }
  });
});

describe.runIf(SUBDIV !== 2)('sem a vila (grade 1)', () => {
  it('o rebanho e os animais seguem nascendo no campo diante do portão', () => {
    const { w, e } = wildlife(42);
    expect(w.village).toBeNull();
    expect(e.npcs.length).toBeGreaterThan(0);
  });
});
