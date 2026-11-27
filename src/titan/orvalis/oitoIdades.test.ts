import { describe, expect, it } from 'vitest';
import { collectItem, placeFromSlot } from '../actions';
import { cropKey, EIGHT_AGE_SPECIES, GARDEN_LAYOUT, gardenFrame, harvestOf, isEightAge, maxAgeOf, randomTick, type Crop } from '../crops';
import { Item } from '../items';
import { MemoryTitanStorage, TITAN_SAVE_VERSION } from '../save';
import { flush, openSession } from '../session';
import { T } from '../voxel';
import { ORVALIS_GENERATOR_VERSION, OrvalisGenerator, orvalisGeneratorFor } from './generator';

/** As 8 idades da horta antiga (ADR 0129, Minecraft Wiki): trigo, cenoura e batata, rendimento da Wiki e migração do save. */
const open = async (st = new MemoryTitanStorage()) => ({ st, s: await openSession(st, 42, () => 1, orvalisGeneratorFor, ORVALIS_GENERATOR_VERSION, (sd, v) => new OrvalisGenerator(sd, v)) });
const Y = 150;
const field = (s: Awaited<ReturnType<typeof open>>['s'], dx = 8) => { const a = s.volume.gen.arrival, x = Math.floor(a.x) + dx, z = Math.floor(a.z) + 8; s.volume.set(x, Y, z, T.FARMLAND_WET); for (const yy of [Y + 1, Y + 2]) s.volume.set(x, yy, z, T.AIR); return { x, z, hit: { x, y: Y, z, nx: 0, ny: 1, nz: 0 } }; };
const hold = (s: Awaited<ReturnType<typeof open>>['s'], item: number, n = 1) => { s.inventory.add(item, n); s.selected = [...Array(9).keys()].find((i) => s.inventory.get(i)?.item === item)!; };

describe('Idades', () => {
  it('trigo, cenoura e batata têm 8 idades; o tomate 3 e a beterraba 4', () => {
    expect(EIGHT_AGE_SPECIES).toEqual(['trigo', 'cenoura', 'batata']);
    for (const sp of EIGHT_AGE_SPECIES) { expect(isEightAge(sp)).toBe(true); expect(maxAgeOf(sp, 'umido')).toBe(7); }
    expect(isEightAge('tomate')).toBe(false); expect(maxAgeOf('tomate', 'umido')).toBe(2); expect(maxAgeOf('beterraba', 'umido')).toBe(3);
  });
  it('cresce idade por idade até a 7 e para', () => {
    const c: Crop = { x: 0, y: 70, z: 0, age: 0, species: 'cenoura' };
    const ctx = { soilAt: () => 'umido' as const, sameAt: () => false, light: 15 };
    for (let i = 0; i < 7; i++) expect(randomTick(c, ctx, () => 0)).toBe(true);
    expect(c.age).toBe(7); expect(randomTick(c, ctx, () => 0)).toBe(false);
  });
  it('quadros do atlas: cada espécie com as suas colunas, sem sobrepor', () => {
    const faixas = Object.entries(GARDEN_LAYOUT).sort((a, b) => a[1].start - b[1].start);
    let fim = 0; for (const [, l] of faixas) { expect(l.start).toBe(fim); fim = l.start + l.count; }
    expect(fim).toBe(47);
    expect([0, 3, 7, 9].map((a) => gardenFrame('trigo', a))).toEqual([4, 7, 11, 11]); expect(gardenFrame('cenoura', 0)).toBe(12); expect(gardenFrame('batata', 7)).toBe(27);
  });
});

describe('Colheita da Wiki', () => {
  it('trigo: 1 trigo e 1–4 sementes; cenoura e batata: 2–5; tomate: 2', () => {
    expect(harvestOf('trigo', 'umido')).toMatchObject({ item: Item.TRIGO, count: 1, extra: { item: Item.SEMENTE_TRIGO, min: 1, max: 4 } });
    for (const [sp, it] of [['cenoura', Item.CENOURA], ['batata', Item.BATATA]] as const) expect(harvestOf(sp, 'umido')).toMatchObject({ item: it, count: 2, countMax: 5 });
    expect(harvestOf('tomate', 'umido')).toMatchObject({ item: Item.TOMATE, count: 2 }); expect(harvestOf('tomate', 'umido').countMax).toBeUndefined();
  });
  it('na sessão: a cenoura rende de 2 a 5 e o trigo, 1 e de 1 a 4 sementes; a planta volta a broto', async () => {
    const { s } = await open(); const got = new Set<number>(), seeds = new Set<number>();
    for (let k = 0; k < 40; k++) {
      s.days = k; const f = field(s, 8 + (k % 3));
      hold(s, Item.CENOURA); expect(placeFromSlot(s, f.hit, s.selected).ok).toBe(true);
      const c = s.crops.get(cropKey(f.x, Y + 1, f.z))!; c.age = 7;
      const before = s.inventory.total(Item.CENOURA); expect(collectItem(s, `crop:${f.x},${Y + 1},${f.z}`).ok).toBe(true);
      got.add(s.inventory.total(Item.CENOURA) - before); expect(c.age).toBe(0); s.crops.delete(cropKey(f.x, Y + 1, f.z));
    }
    expect(Math.min(...got)).toBeGreaterThanOrEqual(2); expect(Math.max(...got)).toBeLessThanOrEqual(5); expect(got.size).toBeGreaterThan(1);
    for (let k = 0; k < 40; k++) {
      s.days = 100 + k; const f = field(s, 12); hold(s, Item.SEMENTE_TRIGO);
      placeFromSlot(s, f.hit, s.selected); const c = s.crops.get(cropKey(f.x, Y + 1, f.z))!; c.age = 7;
      const t0 = s.inventory.total(Item.TRIGO), s0 = s.inventory.total(Item.SEMENTE_TRIGO); collectItem(s, `crop:${f.x},${Y + 1},${f.z}`);
      expect(s.inventory.total(Item.TRIGO) - t0).toBe(1); seeds.add(s.inventory.total(Item.SEMENTE_TRIGO) - s0); s.crops.delete(cropKey(f.x, Y + 1, f.z));
    }
    expect(Math.min(...seeds)).toBeGreaterThanOrEqual(1); expect(Math.max(...seeds)).toBeLessThanOrEqual(4);
  });
});

describe('Migração do save (v6 → v7)', () => {
  it('a versão do save é 7', () => expect(TITAN_SAVE_VERSION).toBe(7));
  it('plantas antigas de trigo, cenoura e batata: idade 0 → 0, 1 → 3, 2 → 7 (a madura continua madura); tomate e beterraba ficam', async () => {
    const st = new MemoryTitanStorage(); const { s } = await open(st);
    const cells: Array<[string, number, number]> = []; let dx = 6;
    for (const [sp, a] of [['trigo', 0], ['trigo', 1], ['trigo', 2], ['cenoura', 2], ['batata', 1], ['tomate', 2], ['beterraba', 3]] as const) {
      const f = field(s, dx++); s.crops.set(cropKey(f.x, Y + 1, f.z), { x: f.x, y: Y + 1, z: f.z, age: a, species: sp }); cells.push([sp, a, f.x]);
    }
    await flush(st, s);
    const save = (await st.load(42))!; save.header.v = 6; await st.commit(save.header, [], []); // um save da v6: as idades são as antigas
    const o = (await open(st)).s;
    const age = (x: number) => [...o.crops.values()].find((c) => c.x === x)!.age;
    expect(cells.map(([, , x]) => age(x))).toEqual([0, 3, 7, 7, 3, 2, 3]);
  });
  it('save já na v7 não muda as idades', async () => {
    const st = new MemoryTitanStorage(); const { s } = await open(st); const f = field(s);
    s.crops.set(cropKey(f.x, Y + 1, f.z), { x: f.x, y: Y + 1, z: f.z, age: 2, species: 'trigo' }); await flush(st, s);
    const o = (await open(st)).s; expect([...o.crops.values()].find((c) => c.x === f.x)!.age).toBe(2);
  });
});
