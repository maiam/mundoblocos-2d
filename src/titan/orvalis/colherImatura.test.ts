import { describe, expect, it } from 'vitest';
import { collectItem, placeFromSlot } from '../actions';
import { cropId, cropKey } from '../crops';
import { Item } from '../items';
import { MemoryTitanStorage } from '../save';
import { openSession } from '../session';
import { T } from '../voxel';
import { ORVALIS_GENERATOR_VERSION, OrvalisGenerator, orvalisGeneratorFor } from './generator';

/** Colher planta imatura (Wiki, ADR 0144): arranca e devolve 1 item da própria semente; só a madura rebrota. */
const open = () => openSession(new MemoryTitanStorage(), 42, () => 1, orvalisGeneratorFor, ORVALIS_GENERATOR_VERSION, (s, v) => new OrvalisGenerator(s, v));
const Y = 150;
const plant = async (item: number, species: string) => {
  const s = await open(), a = s.volume.gen.arrival, x = Math.floor(a.x) + 7, z = Math.floor(a.z) + 7;
  s.volume.set(x, Y, z, T.FARMLAND_WET); for (const yy of [Y + 1, Y + 2]) s.volume.set(x, yy, z, T.AIR);
  s.inventory.add(item, 3); s.selected = [...Array(9).keys()].find((i) => s.inventory.get(i)?.item === item)!;
  expect(placeFromSlot(s, { x, y: Y, z, nx: 0, ny: 1, nz: 0 }, s.selected).ok).toBe(true);
  expect(s.crops.get(cropKey(x, Y + 1, z))).toMatchObject({ species, age: 0 });
  return { s, x, z, id: cropId(x, Y + 1, z), key: cropKey(x, Y + 1, z) };
};

describe('colher a planta imatura (ADR 0144)', () => {
  it('cenoura e batata se plantam com o próprio item e, verdes, devolvem 1 item e somem; sem item de semente próprio', async () => {
    for (const [item, species] of [[Item.CENOURA, 'cenoura'], [Item.BATATA, 'batata'], [Item.TOMATE, 'tomate']] as const) {
      const { s, id, key } = await plant(item, species), antes = s.inventory.total(item);
      expect(collectItem(s, id)).toMatchObject({ ok: true }); // o próprio item volta: o plantio gastou 1, a colheita devolve 1
      expect(s.crops.has(key)).toBe(false); expect(s.inventory.total(item)).toBe(antes + 1);
    }
  });

  it('trigo e beterraba verdes devolvem 1 semente (não o produto)', async () => {
    for (const [seed, species, product] of [[Item.SEMENTE_TRIGO, 'trigo', Item.TRIGO], [Item.SEMENTE_BETERRABA, 'beterraba', Item.BETERRABA]] as const) {
      const { s, id, key } = await plant(seed, species), antes = s.inventory.total(seed);
      expect(collectItem(s, id).msg).toContain('arrancada'); expect(s.crops.has(key)).toBe(false);
      expect(s.inventory.total(seed)).toBe(antes + 1); expect(s.inventory.total(product)).toBe(0);
    }
  });

  it('a madura segue rebrotando (não é arrancada): rende o produto e volta a broto', async () => {
    const { s, id, key } = await plant(Item.CENOURA, 'cenoura');
    s.crops.get(key)!.age = 7;
    expect(collectItem(s, id)).toMatchObject({ ok: true }); expect(s.crops.get(key)!.age).toBe(0); expect(s.inventory.total(Item.CENOURA)).toBeGreaterThanOrEqual(2 + 2); // as 2 que sobraram + 2–5
  });
});
