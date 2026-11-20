import { describe, expect, it } from 'vitest';
import { biomeAt, MARGEM_SILENCIOSA } from './biomes';
import { attackCreature, tickRespawn, RESPAWN_S } from './combat';
import { creatureSpecs } from './creature';
import { TitanGenerator } from './generator';
import { Item } from './items';
import { MemoryTitanStorage } from './save';
import { flush, openSession } from './session';
import { T } from './voxel';

const SEEDS = [42, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

describe('Margem como bioma: noz em 1 % da areia seca e animais por planta (ADR 0074, gerador v12)', () => {
  it('a Margem Silenciosa é o bioma do mundo todo, com 1 % de plantas, espaçamento 4, 1 pequeno por planta e 1 grande a cada 5', () => {
    expect(biomeAt(0, 0)).toBe(MARGEM_SILENCIOSA); expect(biomeAt(-60, 55)).toBe(MARGEM_SILENCIOSA);
    expect(MARGEM_SILENCIOSA).toMatchObject({ nutRate: 0.01, nutSpacing: 4, pequenoPerPlant: 1, plantsPerGrande: 5 });
  });
  it('plantas só em areia seca, ~1 % da areia seca elegível (de 20 a 30 por seed), espaçadas, com 2 perto da chegada e a enseada da toca; v11 ainda tem 6 e aceita úmida', () => {
    for (const seed of SEEDS) {
      const g = new TitanGenerator(seed, 12), a = g.arrival, n = g.nutPlants.length;
      expect(n).toBeGreaterThanOrEqual(18); expect(n).toBeLessThanOrEqual(34);
      for (const p of g.nutPlants) { expect(g.blockAt(p.x, p.y - 1, p.z)).toBe(T.SAND); expect(g.blockAt(p.x, p.y, p.z)).toBe(T.AIR); }
      expect(g.nutPlants.filter((p) => { const d = Math.hypot(p.x - a.x, p.z - a.z); return d >= 7 && d <= 16; }).length).toBeGreaterThanOrEqual(2);
      expect(g.den).not.toBeNull();
      const plants = g.nutPlants.slice(6); // as de preenchimento (depois das 2 seguras e da enseada): espaçamento mínimo de 4
      for (let i = 0; i < plants.length; i++) for (let j = i + 1; j < plants.length; j++) expect(Math.hypot(plants[i].x - plants[j].x, plants[i].z - plants[j].z)).toBeGreaterThanOrEqual(4);
      for (const p of g.nutPlants.slice(6)) { expect(Math.hypot(p.x - a.x, p.z - a.z)).toBeGreaterThanOrEqual(18); expect(g.copperSites.every((s) => Math.hypot(s.x - p.x, s.z - p.z) >= 22)).toBe(true); }
    }
    expect(new TitanGenerator(42, 11).nutPlants).toHaveLength(6);
  });
  it('um Farejador pequeno por planta, perto dela, e um grande a cada 5 plantas (o primeiro na toca); partidas antigas só têm o par da toca', () => {
    for (const seed of SEEDS) {
      const g = new TitanGenerator(seed, 12), specs = creatureSpecs(g), small = specs.filter((s) => s.kind === 'pequeno'), big = specs.filter((s) => s.kind === 'grande');
      expect(small).toHaveLength(g.nutPlants.length); expect(big).toHaveLength(Math.max(1, Math.floor(g.nutPlants.length / 5)));
      expect(new Set(specs.map((s) => s.id)).size).toBe(specs.length);
      expect(big[0]).toMatchObject({ id: 'g0', x: g.den!.x, z: g.den!.z });
      small.forEach((s, i) => { const p = g.nutPlants[i]; expect(Math.hypot(s.x - p.x, s.z - p.z)).toBeLessThanOrEqual(3.2); expect(g.column(s.x, s.z).top + 1).toBe(s.y); });
      for (let i = 1; i < big.length; i++) for (let j = 0; j < i; j++) expect(Math.hypot(big[i].x - big[j].x, big[i].z - big[j].z)).toBeGreaterThanOrEqual(9.9);
    }
    expect(creatureSpecs(new TitanGenerator(42, 11)).map((s) => s.id)).toEqual(['grande', 'pequeno']);
  });
  it('abater um pequeno agenda a volta DELE (por id), grava no save e os outros seguem vivos; a volta recria no ninho', async () => {
    const st = new MemoryTitanStorage();
    const s = await openSession(st, 42, () => 1);
    const n = s.creatures.length; expect(n).toBe(creatureSpecs(s.volume.gen).length);
    s.inventory.add(Item.STONE_DAGGER); s.selected = Array.from({ length: 9 }, (_, i) => i).find((i) => s.inventory.get(i)?.item === Item.STONE_DAGGER)!;
    const idx = s.creatures.findIndex((c) => c.id === 'p3'), spec = creatureSpecs(s.volume.gen).find((c) => c.id === 'p3')!;
    s.creatures[idx].hp = 1; expect(attackCreature(s, idx).dead).toBe(true);
    expect(s.creatures).toHaveLength(n - 1); expect([...s.respawn.keys()]).toEqual(['p3']);
    await flush(st, s);
    const o = await openSession(st, null, () => 1);
    expect(o.creatures).toHaveLength(n - 1); expect(o.creatures.some((c) => c.id === 'p3')).toBe(false); expect(o.respawn.get('p3')).toBe(RESPAWN_S);
    expect(tickRespawn(o, RESPAWN_S + 1).map((c) => c.id)).toEqual(['p3']);
    const back = o.creatures.find((c) => c.id === 'p3')!; expect([Math.floor(back.body.x), Math.floor(back.body.z)]).toEqual([spec.x, spec.z]); expect(o.creatures).toHaveLength(n);
  });
});
