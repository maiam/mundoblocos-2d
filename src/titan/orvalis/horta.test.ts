import { describe, expect, it } from 'vitest';
import { breakOrCollect, collectItem, placeFromSlot } from '../actions';
import { cropId, cropKey, gardenFrame, gardenSpeciesOf, harvestOf, isFarmland, maxAgeOf, plantableSoil, seedOf, soilKindFor, wildSeedAt, GARDEN_SPECIES } from '../crops';
import { foodOf, isItem, Item, ITEM_NAMES } from '../items';
import { craft, recipeById } from '../recipes';
import { MemoryTitanStorage } from '../save';
import { flush, openSession, standingCrops, tickCrops } from '../session';
import { T } from '../voxel';
import { ORVALIS_GENERATOR_VERSION, OrvalisGenerator, orvalisGeneratorFor } from './generator';

/** Horta do Orvalis em voxel (ADR 0113): trigo, cenoura, batata e tomate na terra arada, em 3 fases. */
const open = async (st = new MemoryTitanStorage()) => ({ st, s: await openSession(st, 42, () => 1, orvalisGeneratorFor, ORVALIS_GENERATOR_VERSION, (sd, v) => new OrvalisGenerator(sd, v)) });
type S = Awaited<ReturnType<typeof open>>['s'];
const Y = 150;
const field = (s: S, block: number = T.FARMLAND_WET, dx = 0) => {
  const a = s.volume.gen.arrival, x = Math.floor(a.x) + 6 + dx, z = Math.floor(a.z) + 6;
  s.volume.set(x, Y, z, block);
  return { x, z, hit: { x, y: Y, z, nx: 0, ny: 1, nz: 0 } };
};
const hold = (s: S, item: number) => { s.inventory.add(item, 3); s.inventory.move([...Array(36).keys()].find((i) => s.inventory.get(i)?.item === item)!, 0); s.selected = 0; };
const near = (x: number, z: number) => ({ x, z });
const SEEDS: ReadonlyArray<[string, number]> = [['trigo', Item.SEMENTE_TRIGO], ['cenoura', Item.CENOURA], ['batata', Item.BATATA], ['tomate', Item.TOMATE]];

describe('horta do Orvalis (ADR 0113)', () => {
  it('itens 78–82, nomes, comida (cenoura, batata, tomate) e o que cada um semeia', () => {
    for (const i of [78, 79, 80, 81, 82]) expect(isItem(i)).toBe(true);
    expect(isItem(86)).toBe(false);
    expect([78, 79, 80, 81, 82].map((i) => ITEM_NAMES[i])).toEqual(['Semente de Trigo', 'Trigo', 'Cenoura', 'Batata', 'Tomate']);
    expect(foodOf(Item.CENOURA)).toEqual({ hunger: 3, saturation: 3.6 }); expect(foodOf(Item.BATATA)).toEqual({ hunger: 1, saturation: 0.6 }); expect(foodOf(Item.TOMATE)).not.toBeNull();
    expect(foodOf(Item.TRIGO)).toBeNull(); expect(foodOf(Item.SEMENTE_TRIGO)).toBeNull();
    for (const [sp, item] of SEEDS) { expect(gardenSpeciesOf(item)).toBe(sp); expect(seedOf(sp as never)).toBe(item); expect(maxAgeOf(sp as never, 'seco')).toBe(sp === 'tomate' ? 2 : 7); }
    expect(gardenSpeciesOf(Item.TRIGO)).toBeNull(); expect(gardenSpeciesOf(Item.NOZ)).toBeNull();
    expect(['trigo', 'cenoura', 'batata'].flatMap((sp) => [0, 7].map((a) => gardenFrame(sp as never, a)))).toEqual([4, 11, 12, 19, 20, 27]); // atlas da horta (ADR 0129): 8 idades cada, depois das 4 do junco
    expect([0, 1, 2].map((a) => gardenFrame('tomate', a))).toEqual([28, 29, 30]); // o tomate segue com 3 fases
  });

  it('solo: a horta só na terra arada (úmida ou seca), o junco só na areia; a terra arada conta como solo só para a horta', () => {
    expect(isFarmland(T.FARMLAND_DRY) && isFarmland(T.FARMLAND_WET) && !isFarmland(T.DIRT)).toBe(true);
    for (const sp of GARDEN_SPECIES) { expect(plantableSoil(sp, T.FARMLAND_WET) && plantableSoil(sp, T.FARMLAND_DRY)).toBe(true); expect(plantableSoil(sp, T.SAND) || plantableSoil(sp, T.DIRT) || plantableSoil(sp, T.GRASS)).toBe(false); }
    expect(plantableSoil('junco', T.FARMLAND_WET)).toBe(false); expect(plantableSoil('noz', T.FARMLAND_DRY)).toBe(false); expect(plantableSoil('junco', T.DAMP_SAND)).toBe(true);
    expect(soilKindFor('trigo', T.FARMLAND_WET)).toBe('umido'); expect(soilKindFor('trigo', T.FARMLAND_DRY)).toBe('seco'); expect(soilKindFor('trigo', T.SAND)).toBeNull(); expect(soilKindFor('junco', T.FARMLAND_WET)).toBeNull();
  });

  it('planta cada espécie na terra arada, cresce por sorteio até a idade madura (7; o tomate, 2), colhe pelas regras da Wiki e a planta volta a broto', async () => {
    const { s } = await open();
    for (const [i, [sp, item]] of SEEDS.entries()) {
      const f = field(s, T.FARMLAND_WET, i * 3); hold(s, item);
      expect(placeFromSlot(s, f.hit, 0).ok).toBe(true);
      let c = s.crops.get(cropKey(f.x, Y + 1, f.z))!; expect(c).toMatchObject({ age: 0, species: sp });
      expect(standingCrops(s).find((q) => q.x === f.x)).toMatchObject({ frame: gardenFrame(sp as never, 0) });
      const id = cropId(f.x, Y + 1, f.z);
      const antes = s.inventory.total(item); // planta imatura (ADR 0144): colher a arranca e devolve 1 item da própria semente (a cenoura e a batata, o próprio produto)
      expect(collectItem(s, id)).toMatchObject({ ok: true }); expect(s.crops.has(cropKey(f.x, Y + 1, f.z))).toBe(false); expect(s.inventory.total(item)).toBe(antes + 1);
      hold(s, item); expect(placeFromSlot(s, f.hit, 0).ok).toBe(true); c = s.crops.get(cropKey(f.x, Y + 1, f.z))!; // replanta para seguir o ciclo
      const max = sp === 'tomate' ? 2 : 7;
      for (let k = 0; k < max + 1; k++) tickCrops(s, 1000, () => 0, near(f.x, f.z));
      expect(c.age).toBe(max); expect(standingCrops(s).find((q) => q.x === f.x)!.frame).toBe(gardenFrame(sp as never, max));
      const out = harvestOf(sp as never, 'umido').item, before = s.inventory.total(out);
      expect(collectItem(s, id)).toMatchObject({ ok: true }); const got = s.inventory.total(out) - before; expect(c.age).toBe(0);
      if (sp === 'trigo') expect(got).toBe(1); else if (sp === 'tomate') expect(got).toBe(2); else { expect(got).toBeGreaterThanOrEqual(2); expect(got).toBeLessThanOrEqual(5); }
    }
  });

  it('só semeia na face de cima da terra arada; cenoura/batata/tomate onde não dá para plantar se comem; semente de trigo avisa', async () => {
    const { s } = await open(); const f = field(s, T.DIRT); hold(s, Item.SEMENTE_TRIGO);
    expect(placeFromSlot(s, f.hit, 0)).toMatchObject({ ok: false }); expect(s.crops.size).toBe(0);
    s.volume.set(f.x, Y, f.z, T.FARMLAND_DRY);
    expect(placeFromSlot(s, { ...f.hit, ny: 0, nx: 1 }, 0).ok).toBe(false); expect(s.crops.size).toBe(0);
    hold(s, Item.CENOURA); s.vitals.hunger = 5;
    expect(placeFromSlot(s, f.hit, 0).ok).toBe(true); expect(s.crops.size).toBe(1); // plantou, não comeu
    hold(s, Item.CENOURA);
    expect(placeFromSlot(s, { x: f.x + 1, y: Y, z: f.z, nx: 0, ny: 1, nz: 0 }, 0).ok).toBe(true); // sem terra arada aqui: o toque come (ar sob o alvo é só o teste)
  });

  it('seca ou umedece a terra arada conforme a água ao alcance; sem água cresce mais devagar', async () => {
    const { s } = await open(); const f = field(s, T.FARMLAND_DRY); hold(s, Item.SEMENTE_TRIGO); placeFromSlot(s, f.hit, 0);
    s.volume.set(f.x + 3, Y, f.z, T.LAKE); // água a 3 células, no nível da terra
    tickCrops(s, 1000, () => 0.999, near(f.x, f.z)); // o sorteio de crescimento falha, mas a terra se umedece
    expect(s.volume.get(f.x, Y, f.z)).toBe(T.FARMLAND_WET);
    s.volume.set(f.x + 3, Y, f.z, T.AIR);
    tickCrops(s, 1000, () => 0.999, near(f.x, f.z));
    expect(s.volume.get(f.x, Y, f.z)).toBe(T.FARMLAND_DRY);
  });

  it('quebrar a terra sob a planta devolve a semente solta; quebrar grama pode soltar semente silvestre (hash da célula, sempre igual); semente de trigo sai do trigo', async () => {
    const { s } = await open(); const f = field(s, T.FARMLAND_WET); hold(s, Item.TOMATE); placeFromSlot(s, f.hit, 0);
    expect(breakOrCollect(s, f.hit).ok).toBe(true);
    expect(s.crops.size).toBe(0); expect([...s.drops.values()].some((d) => d.item === Item.TOMATE)).toBe(true);
    const seen = new Set<number | null>(); for (let x = 0; x < 30; x++) for (let z = 0; z < 30; z++) seen.add(wildSeedAt(x, 70, z));
    expect([...seen].sort()).toEqual([null, Item.SEMENTE_TRIGO, Item.CENOURA, Item.BATATA, Item.TOMATE, Item.SEMENTE_BETERRABA, Item.SEMENTE_ABOBORA, Item.SEMENTE_MELANCIA].sort());
    expect(wildSeedAt(5, 70, 9)).toBe(wildSeedAt(5, 70, 9));
    s.inventory.add(Item.TRIGO, 1);
    expect(craft(s.inventory, recipeById('semente-trigo')!, null).ok).toBe(true); expect(s.inventory.total(Item.SEMENTE_TRIGO)).toBeGreaterThan(0);
    expect(recipeById('semente-trigo')!.world).toBe('orvalis');
  });

  it('persiste a espécie e a idade; descarta planta sem terra arada e a de horta sobre areia', async () => {
    const { st, s } = await open(); const f = field(s, T.FARMLAND_WET); hold(s, Item.BATATA); placeFromSlot(s, f.hit, 0);
    tickCrops(s, 1000, () => 0, near(f.x, f.z));
    await flush(st, s);
    const h = [...st.games.values()][0];
    expect(h.crops?.[cropKey(f.x, Y + 1, f.z)]).toEqual({ s: 'batata', a: 1 });
    const r = await openSession(st, null, () => 1, orvalisGeneratorFor, ORVALIS_GENERATOR_VERSION, (sd, v) => new OrvalisGenerator(sd, v));
    expect(r.crops.get(cropKey(f.x, Y + 1, f.z))).toMatchObject({ species: 'batata', age: 1 });
    expect(standingCrops(r)).toHaveLength(1);
    h.crops = { ...(h.crops ?? {}), [cropKey(f.x + 9, Y + 1, f.z)]: { s: 'trigo', a: 1 }, [cropKey(f.x, Y + 1, f.z)]: { s: 'batata', a: 9 } };
    const r2 = await openSession(st, null, () => 1, orvalisGeneratorFor, ORVALIS_GENERATOR_VERSION, (sd, v) => new OrvalisGenerator(sd, v));
    expect(r2.crops.size).toBe(0); // uma sem terra arada, outra com idade acima do limite
  });
});
