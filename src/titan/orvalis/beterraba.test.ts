import { describe, expect, it } from 'vitest';
import { collectItem, placeFromSlot } from '../actions';
import { BEET_MAX_AGE, BEET_SEEDS, BEET_SKIP, type Crop, gardenFrame, GARDEN_FRAMES, gardenSpeciesOf, harvestOf, maxAgeOf, randomTick, seedOf, wildSeedAt } from '../crops';
import { isBreedFood } from '../fauna';
import { foodOf, isItem, Item, ITEM_NAMES, maxStack } from '../items';
import { MemoryTitanStorage } from '../save';
import { openSession } from '../session';
import { T } from '../voxel';
import { ORVALIS_GENERATOR_VERSION, OrvalisGenerator, orvalisGeneratorFor } from './generator';

/** Beterraba do Orvalis (ADR 0127, Minecraft Wiki "Beetroot"): 4 idades, 1/3 dos sorteios falha, madura rende 1 beterraba e 1–4 sementes, comida do porco. */
const open = async () => openSession(new MemoryTitanStorage(), 42, () => 1, orvalisGeneratorFor, ORVALIS_GENERATOR_VERSION, (sd, v) => new OrvalisGenerator(sd, v));

describe('Beterraba: itens, comida e porco', () => {
  it('itens 100 e 101, nomes, pilha 64 e comida da Wiki (1 de fome, 1,2 de saciedade)', () => {
    expect(Item.BETERRABA).toBe(100); expect(Item.SEMENTE_BETERRABA).toBe(101);
    expect(isItem(100) && isItem(101)).toBe(true); expect(isItem(106)).toBe(false);
    expect(ITEM_NAMES[100]).toBe('Beterraba'); expect(ITEM_NAMES[101]).toBe('Semente de Beterraba'); expect(maxStack(100)).toBe(64);
    expect(foodOf(Item.BETERRABA)).toEqual({ hunger: 1, saturation: 1.2 }); expect(foodOf(Item.SEMENTE_BETERRABA)).toBeNull();
  });
  it('a beterraba é comida do porco (Wiki), e só dele', () => {
    expect(isBreedFood('porco', Item.BETERRABA)).toBe(true); expect(isBreedFood('vaca', Item.BETERRABA)).toBe(false); expect(isBreedFood('galinha', Item.SEMENTE_BETERRABA)).toBe(false);
  });
});

describe('Beterraba: planta de 4 idades', () => {
  it('semeia com a semente, 4 idades (0 a 3), quadros depois dos 12 das outras', () => {
    expect(gardenSpeciesOf(Item.SEMENTE_BETERRABA)).toBe('beterraba'); expect(seedOf('beterraba')).toBe(Item.SEMENTE_BETERRABA); expect(gardenSpeciesOf(Item.BETERRABA)).toBeNull();
    expect(maxAgeOf('beterraba', 'umido')).toBe(BEET_MAX_AGE); expect(BEET_MAX_AGE).toBe(3); expect(maxAgeOf('trigo', 'umido')).toBe(7); expect(maxAgeOf('tomate', 'umido')).toBe(2);
    expect([0, 1, 2, 3].map((a) => gardenFrame('beterraba', a))).toEqual([31, 32, 33, 34]); expect(gardenFrame('beterraba', 9)).toBe(34); expect(GARDEN_FRAMES).toBe(49);
  });
  it('1/3 dos sorteios não avança (Wiki): sorteio abaixo de 1/3 nunca sobe; acima, segue a chance normal', () => {
    const mk = (): Crop => ({ x: 0, y: 70, z: 0, age: 0, species: 'beterraba' });
    const ctx = { soilAt: () => 'umido' as const, sameAt: () => false, light: 15 };
    const a = mk(); expect(randomTick(a, ctx, () => BEET_SKIP - 0.01)).toBe(false); expect(a.age).toBe(0);
    const b = mk(); const seq = [BEET_SKIP + 0.1, 0]; expect(randomTick(b, ctx, () => seq.shift()!)).toBe(true); expect(b.age).toBe(1);
    const t = { x: 0, y: 70, z: 0, age: 0, species: 'trigo' as const }; let n = 0; expect(randomTick(t, ctx, () => (n++ === 0 ? 0 : 1))).toBe(true); // o trigo não tem o descarte
  });
  it('não passa da idade 3', () => {
    const c: Crop = { x: 0, y: 70, z: 0, age: 3, species: 'beterraba' };
    expect(randomTick(c, { soilAt: () => 'umido', sameAt: () => false, light: 15 }, () => 0.99)).toBe(false);
  });
  it('a colheita é 1 beterraba e de 1 a 4 sementes', () => {
    const h = harvestOf('beterraba', 'umido');
    expect(h).toMatchObject({ item: Item.BETERRABA, count: 1, backTo: 0 }); expect(h.extra).toEqual({ item: Item.SEMENTE_BETERRABA, ...BEET_SEEDS }); expect(BEET_SEEDS).toEqual({ min: 1, max: 4 });
  });
});

describe('Beterraba na sessão', () => {
  const field = (s: Awaited<ReturnType<typeof open>>) => { const a = s.volume.gen.arrival, x = Math.floor(a.x) + 7, z = Math.floor(a.z) + 7, y = 150; s.volume.set(x, y, z, T.FARMLAND_WET); for (const yy of [y + 1, y + 2]) s.volume.set(x, yy, z, T.AIR); return { x, y, z, hit: { x, y, z, nx: 0, ny: 1, nz: 0 } }; };
  const hold = (s: Awaited<ReturnType<typeof open>>, item: number, n = 1) => { s.inventory.add(item, n); s.selected = [...Array(9).keys()].find((i) => s.inventory.get(i)?.item === item)!; };
  it('planta, só madura colhe: 1 beterraba e 1–4 sementes, e volta a broto', async () => {
    const s = await open(); const f = field(s); hold(s, Item.SEMENTE_BETERRABA, 3);
    expect(placeFromSlot(s, f.hit, s.selected).ok).toBe(true);
    const c = s.crops.get(`${f.x},${f.y + 1},${f.z}`)!; expect(c.species).toBe('beterraba'); expect(c.age).toBe(0);
    expect(collectItem(s, `crop:${f.x},${f.y + 1},${f.z}`)).toMatchObject({ ok: false, msg: 'Ainda está crescendo' }); // verde não colhe
    c.age = 3;
    const crop = { x: f.x, y: f.y + 1, z: f.z };
    const antes = s.inventory.total(Item.SEMENTE_BETERRABA);
    const r = collectItem(s, `crop:${crop.x},${crop.y},${crop.z}`);
    expect(r.ok).toBe(true); expect(s.inventory.total(Item.BETERRABA)).toBe(1);
    const ganhou = s.inventory.total(Item.SEMENTE_BETERRABA) - antes; expect(ganhou).toBeGreaterThanOrEqual(1); expect(ganhou).toBeLessThanOrEqual(4); expect(r.msg).toContain('beterraba');
    expect(c.age).toBe(0);
  });
  it('semente silvestre rara no capim (hash da célula) e sempre igual', () => {
    const seen = new Set<number | null>(); for (let x = 0; x < 40; x++) for (let z = 0; z < 40; z++) seen.add(wildSeedAt(x, 70, z));
    expect(seen.has(Item.SEMENTE_BETERRABA)).toBe(true); expect(wildSeedAt(5, 70, 9)).toBe(wildSeedAt(5, 70, 9));
  });
});
