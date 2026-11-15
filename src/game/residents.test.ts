import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../world/random';
import { World } from '../world/world';
import { Entities, RESIDENTS_TOWN, RESIDENTS_VILLAGE } from './entities';
import { NAMED_NPC_NAMES, RESIDENT_BASES, RESIDENT_NAMES, makeResidents } from './residents';
import { Player } from './player';

describe('moradores sorteados (ADR 0034)', () => {
  it('mesma seed = mesmas pessoas; seeds diferentes = pessoas diferentes', () => {
    expect(makeResidents(42, 'town', 8)).toEqual(makeResidents(42, 'town', 8));
    expect(makeResidents(42, 'town', 8)).not.toEqual(makeResidents(43, 'town', 8));
  });

  it('nomes não repetem os dos NPCs nomeados nem entre si; folha + cores não repetem; falas existem', () => {
    for (const n of RESIDENT_NAMES) expect(NAMED_NPC_NAMES.has(n)).toBe(false);
    const rs = makeResidents(7, 'town', 12);
    expect(new Set(rs.map((r) => r.name)).size).toBe(12);
    expect(new Set(rs.map((r) => `${r.base}|${r.look.hue}`)).size).toBe(12);
    for (const r of rs) {
      expect(RESIDENT_BASES).toContain(r.base);
      expect(r.look.hue).toBeGreaterThan(0.05); // sempre diferente da arte original
      expect(r.lines).toHaveLength(2);
      for (const l of r.lines) expect(l.length).toBeGreaterThan(30);
    }
  });

  it('a vila evita os nomes da cidade', () => {
    const town = makeResidents(42, 'town', 8);
    const vil = makeResidents(42, 'village', 5, town.map((r) => r.name));
    for (const r of vil) expect(town.some((t) => t.name === r.name)).toBe(false);
  });

  it('no mundo: 8 na cidade e 5 na vila, além dos 16 nomeados; conversam com nome e fala próprios; mesma seed = mesmos lugares', () => {
    const build = (seed: number) => {
      const w = new World(seed);
      const [sx, sy] = w.town!.start;
      const e = new Entities(new Player(sx + 0.5, sy + 0.6), mulberry32(seed));
      e.spawnVillagers(w);
      e.spawnResidents(w);
      return { w, e };
    };
    const { w, e } = build(42);
    const rs = e.villagers.filter((v) => v.resident && v.resident.id !== 'guild');
    expect(e.villagers.filter((v) => !v.resident)).toHaveLength(16);
    expect(e.villagers.some((v) => v.resident?.id === 'guild')).toBe(true); // o Mestre da Guilda não conta entre os sorteados
    const inVillage = rs.filter((v) => w.village && v.cellY >= w.village.area.y0);
    expect(inVillage).toHaveLength(w.village ? RESIDENTS_VILLAGE : 0);
    expect(rs).toHaveLength(RESIDENTS_TOWN + (w.village ? RESIDENTS_VILLAGE : 0));
    const v = rs[0];
    const c = v.conversation();
    expect(c.name).toBe(v.resident!.name);
    expect(c.npc).toBe(v.resident!.base); // retrato emprestado
    expect(c.text).toBe(v.resident!.lines[0]);
    expect(e.actors.find((a) => a.look)?.look).toBeTruthy();
    expect(build(42).e.villagers.map((x) => [x.name, x.cellX, x.cellY])).toEqual(e.villagers.map((x) => [x.name, x.cellX, x.cellY]));
  });

  it('os sorteados passeiam e ficam dentro das ruas (cidade) ou do muro (vila)', () => {
    const w = new World(42);
    const [sx, sy] = w.town!.start;
    const e = new Entities(new Player(sx + 0.5, sy + 0.6), mulberry32(42));
    e.spawnVillagers(w);
    e.spawnResidents(w);
    for (let i = 0; i < 400; i++) e.update(0.1, w);
    for (const v of e.villagers.filter((x) => x.resident)) expect(v.allowedAt(v.x, v.y)).toBe(true);
  });
});
