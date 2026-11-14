import { describe, expect, it } from 'vitest';
import { SUBDIV } from '../config';
import { World } from '../world/world';
import { Player } from './player';
import { Entities } from './entities';
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
  it('ovelhas, vacas, galinhas e capivaras nascem dentro da vila, em grama; o cavalo fica no campo', () => {
    const { w, e } = wildlife(42);
    const v = w.village!;
    const sheep = e.npcs;
    const by = (k: string) => e.horses.filter((h) => h.kind === k);
    expect(sheep).toHaveLength(4);
    expect(by('cow')).toHaveLength(2);
    expect(by('chicken')).toHaveLength(4);
    expect(by('capybara')).toHaveLength(3);
    for (const a of [...sheep, ...by('cow'), ...by('chicken'), ...by('capybara')]) {
      expect(inRect(v.area, Math.floor(a.x), Math.floor(a.y)), `${a.kind} em ${a.x},${a.y}`).toBe(true);
      expect(w.getGround(Math.floor(a.x), Math.floor(a.y))).toBe(Block.GRASS);
    }
    expect(e.npcs.every((n) => n.constructor.name === 'Sheep')).toBe(true);
    const horse = by('horse');
    expect(horse).toHaveLength(1);
    expect(inRect(v.area, Math.floor(horse[0].x), Math.floor(horse[0].y))).toBe(false);
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
