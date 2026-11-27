import { describe, expect, it } from 'vitest';
import { breakOrCollect, collectItem, placeFromSlot } from '../actions';
import { blockToolOf, hardnessOf } from '../breaking';
import { type Crop, FRUIT_BLOCK, fruitGround, GARDEN_FRAMES, GARDEN_MESHES, gardenFrame, gardenSpeciesOf, isStem, maxAgeOf, seedOf, STEM_DIRS, STEM_MAX_AGE, stemFruitTick, wildSeedAt } from '../crops';
import { sweep } from '../dropTestUtil';
import { foodOf, isItem, Item, ITEM_NAMES, itemOfBlock, blockOfItem } from '../items';
import { smeltRecipe } from '../furnace';
import { RECIPES } from '../recipes';
import { MemoryTitanStorage } from '../save';
import { flush, openSession, standingCrops, tickCrops } from '../session';
import { AFTERNOON } from '../sky';
import { BLOCK_NAMES, isFull, T, tileFor } from '../voxel';
import { ORVALIS_GENERATOR_VERSION, OrvalisGenerator, orvalisGeneratorFor } from './generator';

/** Abóbora e melancia do Orvalis (ADR 0128, Minecraft Wiki): caule de 8 idades, fruto como bloco vizinho, caule conectado, 3–7 fatias, sementes. */
const open = async (st = new MemoryTitanStorage()) => ({ st, s: await openSession(st, 42, () => 1, orvalisGeneratorFor, ORVALIS_GENERATOR_VERSION, (sd, v) => new OrvalisGenerator(sd, v)) });
const Y = 150;
const field = (s: Awaited<ReturnType<typeof open>>['s']) => { const a = s.volume.gen.arrival, x = Math.floor(a.x) + 8, z = Math.floor(a.z) + 8; for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) { s.volume.set(x + dx, Y, z + dz, T.GRASS); for (const yy of [Y + 1, Y + 2]) s.volume.set(x + dx, yy, z + dz, T.AIR); } s.volume.set(x, Y, z, T.FARMLAND_WET); return { x, z, hit: { x, y: Y, z, nx: 0, ny: 1, nz: 0 } }; };
const hold = (s: Awaited<ReturnType<typeof open>>['s'], item: number, n = 1) => { s.inventory.add(item, n); s.selected = [...Array(9).keys()].find((i) => s.inventory.get(i)?.item === item)!; };

describe('Itens, blocos e ferramenta', () => {
  it('itens 102–105, nomes, comida da fatia e blocos 152–153 (cubos opacos com tile próprio)', () => {
    expect([Item.SEMENTE_ABOBORA, Item.SEMENTE_MELANCIA, Item.FATIA_MELANCIA, Item.BLOCO_ABOBORA]).toEqual([102, 103, 104, 105]);
    for (let i = 102; i <= 105; i++) expect(isItem(i)).toBe(true);
    expect(ITEM_NAMES[104]).toBe('Fatia de Melancia'); expect(ITEM_NAMES[105]).toBe('Bloco de Abóbora');
    expect(foodOf(Item.FATIA_MELANCIA)).toEqual({ hunger: 2, saturation: 1.2 }); expect(foodOf(Item.SEMENTE_MELANCIA)).toBeNull();
    expect(T.MELON).toBe(152); expect(T.PUMPKIN).toBe(153); expect(BLOCK_NAMES[T.MELON]).toBe('Melancia'); expect(BLOCK_NAMES[T.PUMPKIN]).toBe('Abóbora');
    expect(isFull(T.MELON) && isFull(T.PUMPKIN)).toBe(true);
    expect(tileFor(T.MELON, 'top')).not.toBe(tileFor(T.MELON, 'side')); expect(tileFor(T.PUMPKIN, 'top')).not.toBe(tileFor(T.MELON, 'top'));
  });
  it('a abóbora volta como bloco; a melancia nunca é item (solta fatias) e a fatia não se coloca', () => {
    expect(blockOfItem(Item.BLOCO_ABOBORA)).toBe(T.PUMPKIN); expect(itemOfBlock(T.PUMPKIN)).toBe(Item.BLOCO_ABOBORA);
    expect(itemOfBlock(T.MELON)).toBe(Item.FATIA_MELANCIA); expect(blockOfItem(Item.FATIA_MELANCIA)).toBeNull();
  });
  it('dureza 1 e machado (Wiki)', () => { expect(hardnessOf(T.MELON)).toBe(1); expect(hardnessOf(T.PUMPKIN)).toBe(1); expect(blockToolOf(T.MELON)).toBe('axe'); expect(blockToolOf(T.PUMPKIN)).toBe('axe'); });
  it('fabricação: bloco de abóbora → 4 sementes; fatia de melancia → 1 semente (do Orvalis, no inventário)', () => {
    const a = RECIPES.find((r) => r.id === 'semente-abobora')!, b = RECIPES.find((r) => r.id === 'semente-melancia')!;
    expect(a.result).toEqual({ item: Item.SEMENTE_ABOBORA, count: 4 }); expect(a.ingredients).toEqual([{ item: Item.BLOCO_ABOBORA, count: 1 }]); expect(a.world).toBe('orvalis'); expect(a.station).toBe('personal');
    expect(b.result).toEqual({ item: Item.SEMENTE_MELANCIA, count: 1 }); expect(b.ingredients).toEqual([{ item: Item.FATIA_MELANCIA, count: 1 }]);
    expect(smeltRecipe(Item.FATIA_MELANCIA, 'furnace')).toBeNull();
  });
  it('sementes silvestres raras no capim (1 de 24 cada)', () => {
    const seen = new Set<number | null>(); for (let x = 0; x < 60; x++) for (let z = 0; z < 60; z++) seen.add(wildSeedAt(x, 70, z));
    expect(seen.has(Item.SEMENTE_ABOBORA) && seen.has(Item.SEMENTE_MELANCIA)).toBe(true);
  });
});

describe('Caule: 8 idades e quadros', () => {
  it('abóbora e melancia são caules de 8 idades, plantados com a semente', () => {
    for (const sp of ['abobora', 'melancia'] as const) { expect(isStem(sp)).toBe(true); expect(maxAgeOf(sp, 'umido')).toBe(STEM_MAX_AGE); }
    expect(STEM_MAX_AGE).toBe(7); expect(isStem('trigo')).toBe(false);
    expect(gardenSpeciesOf(Item.SEMENTE_ABOBORA)).toBe('abobora'); expect(gardenSpeciesOf(Item.SEMENTE_MELANCIA)).toBe('melancia'); expect(seedOf('melancia')).toBe(Item.SEMENTE_MELANCIA);
  });
  it('quadros: 8 idades de cada, depois o conectado por direção (malhas extras)', () => {
    expect(GARDEN_FRAMES).toBe(34); expect(GARDEN_MESHES).toBe(42);
    expect([0, 1, 7].map((a) => gardenFrame('abobora', a))).toEqual([4 + 16, 4 + 17, 4 + 23]);
    expect([0, 7].map((a) => gardenFrame('melancia', a))).toEqual([4 + 24, 4 + 31]);
    expect([0, 1, 2, 3].map((d) => gardenFrame('abobora', 7, d))).toEqual([38, 39, 40, 41]); expect([0, 3].map((d) => gardenFrame('melancia', 7, d))).toEqual([42, 45]);
    expect(Math.max(...[0, 1, 2, 3].map((d) => gardenFrame('melancia', 7, d))) - 4).toBe(GARDEN_MESHES - 1);
  });
});

describe('Fruto: o caule maduro gera o bloco numa célula vizinha', () => {
  const mk = (age = 7, dir?: number): Crop => ({ x: 0, y: 70, z: 0, age, species: 'melancia', ...(dir !== undefined ? { dir } : {}) });
  it('só maduro, sem fruto, com luz ≥ 9 e dentro da chance; escolhe uma das 4 direções e só se a célula está livre', () => {
    const seq = (...v: number[]) => () => v.shift() ?? 0.99;
    expect(stemFruitTick(mk(6), 6, 15, seq(0, 0), () => true)).toBeNull(); // verde
    expect(stemFruitTick(mk(7, 0), 6, 15, seq(0, 0), () => true)).toBeNull(); // já tem fruto
    expect(stemFruitTick(mk(), 6, 8, seq(0, 0), () => true)).toBeNull(); // escuro
    expect(stemFruitTick(mk(), 6, 15, seq(0.99), () => true)).toBeNull(); // fora da chance
    expect(stemFruitTick(mk(), 6, 15, seq(0, 0.6), () => true)).toBe(2);
    expect(stemFruitTick(mk(), 6, 15, seq(0, 0.6), (d) => d !== 2)).toBeNull(); // célula ocupada
  });
  it('terra onde o fruto nasce: grama, terra, terra infértil e terra arada', () => {
    for (const b of [T.GRASS, T.DIRT, T.DIRT_INFERTILE, T.FARMLAND_DRY, T.FARMLAND_WET]) expect(fruitGround(b)).toBe(true);
    for (const b of [T.SAND, T.STONE, T.AIR, T.LAKE]) expect(fruitGround(b)).toBe(false);
    expect(FRUIT_BLOCK).toEqual({ abobora: T.PUMPKIN, melancia: T.MELON }); expect(STEM_DIRS).toHaveLength(4);
  });
  it('na sessão: gera o fruto vizinho, o caule vira conectado e, sem o fruto, volta a tentar', async () => {
    const { s } = await open(); const f = field(s); hold(s, Item.SEMENTE_MELANCIA, 2);
    expect(placeFromSlot(s, f.hit, s.selected).ok).toBe(true);
    const c = s.crops.get(`${f.x},${Y + 1},${f.z}`)!; expect(c.species).toBe('melancia'); c.age = 7;
    s.time = AFTERNOON; // dia
    let n = 0; const rng = () => (n++ % 2 === 0 ? 0 : 0.05); // a terra arada seca sem água (2 pontos): chance 1/13
    for (let i = 0; i < 40 && c.dir === undefined; i++) tickCrops(s, 1000, rng, { x: f.x, z: f.z });
    expect(c.dir).toBeDefined();
    const [dx, dz] = STEM_DIRS[c.dir!]; expect(s.volume.get(f.x + dx, Y + 1, f.z + dz)).toBe(T.MELON);
    expect(standingCrops(s).find((q) => q.x === f.x && q.z === f.z)!.frame).toBe(gardenFrame('melancia', 7, c.dir));
    s.volume.set(f.x + dx, Y + 1, f.z + dz, T.AIR); // o fruto sumiu
    tickCrops(s, 1000, () => 0.99, { x: f.x, z: f.z });
    expect(c.dir).toBeUndefined();
  });
  it('o caule não se colhe e a direção vai ao save e volta', async () => {
    const { st, s } = await open(); const f = field(s); hold(s, Item.SEMENTE_ABOBORA, 1);
    placeFromSlot(s, f.hit, s.selected);
    const c = s.crops.get(`${f.x},${Y + 1},${f.z}`)!; c.age = 7; c.dir = 3;
    expect(collectItem(s, `crop:${f.x},${Y + 1},${f.z}`).ok).toBe(false);
    s.volume.set(f.x, Y + 1, f.z - 1, T.PUMPKIN); s.metaRev++; await flush(st, s);
    const o = await open(st);
    expect(o.s.crops.get(`${f.x},${Y + 1},${f.z}`)).toMatchObject({ species: 'abobora', age: 7, dir: 3 });
  });
});

describe('Rendimento (Wiki)', () => {
  it('a melancia solta de 3 a 7 fatias e a abóbora, o bloco', async () => {
    const { s } = await open(); const f = field(s);
    const seen = new Set<number>();
    for (let k = 0; k < 40; k++) {
      const x = f.x + (k % 5) - 2, z = f.z + 3 + Math.floor(k / 5); s.volume.set(x, Y, z, T.GRASS); s.volume.set(x, Y + 1, z, T.MELON);
      s.drops.clear(); expect(breakOrCollect(s, { x, y: Y + 1, z, nx: 0, ny: 1, nz: 0 }).ok).toBe(true); sweep(s);
      seen.add(s.inventory.total(Item.FATIA_MELANCIA)); s.inventory.take(0);
      for (let i = 0; i < 36; i++) { const st = s.inventory.get(i); if (st?.item === Item.FATIA_MELANCIA) s.inventory.take(i); }
    }
    expect(Math.min(...seen)).toBeGreaterThanOrEqual(3); expect(Math.max(...seen)).toBeLessThanOrEqual(7);
    s.volume.set(f.x, Y + 1, f.z, T.PUMPKIN); s.drops.clear(); breakOrCollect(s, { x: f.x, y: Y + 1, z: f.z, nx: 0, ny: 1, nz: 0 }); sweep(s);
    expect(s.inventory.total(Item.BLOCO_ABOBORA)).toBe(1);
  });
  it('quebrar a terra sob o caule solta de 0 a 3 sementes', async () => {
    const { s } = await open(); const counts = new Set<number>();
    for (let k = 0; k < 40; k++) {
      const f = field(s); const x = f.x + (k % 3), z = f.z + 4 + k; s.volume.set(x, Y, z, T.FARMLAND_WET); for (const yy of [Y + 1, Y + 2]) s.volume.set(x, yy, z, T.AIR);
      s.crops.set(`${x},${Y + 1},${z}`, { x, y: Y + 1, z, age: 3, species: 'abobora' }); s.days = k;
      s.drops.clear(); breakOrCollect(s, { x, y: Y, z, nx: 0, ny: 1, nz: 0 });
      counts.add([...s.drops.values()].filter((d) => d.item === Item.SEMENTE_ABOBORA).reduce((a, d) => a + (d.count ?? 1), 0));
    }
    expect(Math.min(...counts)).toBe(0); expect(Math.max(...counts)).toBeLessThanOrEqual(3); expect(Math.max(...counts)).toBeGreaterThanOrEqual(2);
  });
});
