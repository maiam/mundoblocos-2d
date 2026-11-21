import { describe, expect, it } from 'vitest';
import { breakOrCollect, collectItem, placeFromSlot } from './actions';
import { cropId, cropKey } from './crops';
import { Item } from './items';
import { MemoryTitanStorage } from './save';
import { flush, openSession, standingCrops, tickCrops } from './session';
import { AFTERNOON, FIXED_HOURS } from './sky';
import { T } from './voxel';

/** Cultivo do junco na sessão (ADR 0083): plantar, crescer por sorteio, colher, perder o apoio e persistir. */
const open = async (st = new MemoryTitanStorage()) => ({ st, s: await openSession(st, 42, () => 1, undefined, 2) });
const Y = 150;
const field = (s: Awaited<ReturnType<typeof openSession>>, block: number = T.DAMP_SAND) => {
  const a = s.volume.gen.arrival, x = Math.floor(a.x) + 6, z = Math.floor(a.z) + 6;
  s.volume.set(x, Y, z, block);
  return { x, z, hit: { x, y: Y, z, nx: 0, ny: 1, nz: 0 } };
};
const hold = (s: Awaited<ReturnType<typeof openSession>>, item: number) => { s.inventory.add(item, 3); s.inventory.move([...Array(36).keys()].find((i) => s.inventory.get(i)?.item === item)!, 0); };
const near = (x: number, z: number) => ({ x, z });

describe('cultivo do junco na sessão', () => {
  it('planta a muda no topo da areia úmida: gasta 1 e a planta nasce na fase 0', async () => {
    const { s } = await open(); const f = field(s); hold(s, Item.GLASS_REED);
    expect(placeFromSlot(s, f.hit, 0).ok).toBe(true);
    expect(s.inventory.total(Item.GLASS_REED)).toBe(2);
    expect(s.crops.get(cropKey(f.x, Y + 1, f.z))).toMatchObject({ age: 0 });
    expect(standingCrops(s)).toEqual([{ x: f.x, y: Y + 1, z: f.z, frame: 0 }]);
    expect(s.items.at(f.x, Y + 1, f.z)).toBe(cropId(f.x, Y + 1, f.z));
    expect(placeFromSlot(s, f.hit, 0).ok).toBe(false); // a célula já está ocupada
  });
  it('só planta no topo de areia', async () => {
    const { s } = await open(); const f = field(s, T.DARK_ROCK); hold(s, Item.GLASS_REED);
    expect(placeFromSlot(s, f.hit, 0)).toMatchObject({ ok: false, msg: 'A muda se planta no topo da areia' });
    s.volume.set(f.x, Y, f.z, T.SAND);
    expect(placeFromSlot(s, { ...f.hit, ny: 0, nx: 1 }, 0).ok).toBe(false); // na lateral não
    expect(s.crops.size).toBe(0);
  });
  it('cresce por sorteio de dia e colhe 2 mudas: a planta fica e recua a "crescendo"', async () => {
    const { s } = await open(); const f = field(s); hold(s, Item.GLASS_REED); placeFromSlot(s, f.hit, 0);
    const id = cropId(f.x, Y + 1, f.z);
    expect(collectItem(s, id)).toMatchObject({ ok: false, msg: 'Ainda está crescendo' });
    expect(tickCrops(s, 1000, () => 0, near(f.x, f.z))).toBe(true); expect(tickCrops(s, 1000, () => 0, near(f.x, f.z))).toBe(true);
    expect(s.crops.get(cropKey(f.x, Y + 1, f.z))!.age).toBe(2);
    expect(standingCrops(s)[0].frame).toBe(2);
    const antes = s.inventory.total(Item.GLASS_REED);
    expect(collectItem(s, id)).toMatchObject({ ok: true });
    expect(s.inventory.total(Item.GLASS_REED)).toBe(antes + 2);
    expect(s.crops.get(cropKey(f.x, Y + 1, f.z))!.age).toBe(1); // planta-mãe preservada
  });
  it('areia ocre: o ressecado rende 2 hastes secas e volta a muda', async () => {
    const { s } = await open(); const f = field(s, T.SAND); hold(s, Item.GLASS_REED); placeFromSlot(s, f.hit, 0);
    tickCrops(s, 1000, () => 0, near(f.x, f.z));
    expect(standingCrops(s)[0].frame).toBe(3);
    const antes = s.inventory.total(Item.DRY_REED);
    expect(collectItem(s, cropId(f.x, Y + 1, f.z)).ok).toBe(true);
    expect(s.inventory.total(Item.DRY_REED)).toBe(antes + 2);
    expect(s.crops.get(cropKey(f.x, Y + 1, f.z))!.age).toBe(0);
  });
  it('à noite não cresce, a não ser com uma lanterna acesa por perto; debaixo de teto também não', async () => {
    const { s } = await open(); const f = field(s); hold(s, Item.GLASS_REED); placeFromSlot(s, f.hit, 0);
    s.time = FIXED_HOURS.noite;
    expect(tickCrops(s, 1000, () => 0, near(f.x, f.z))).toBe(false);
    s.volume.set(f.x + 1, Y + 1, f.z, T.LANTERN);
    expect(tickCrops(s, 1000, () => 0, near(f.x, f.z))).toBe(true);
    s.time = AFTERNOON; s.volume.set(f.x, Y + 4, f.z, T.DARK_ROCK); s.volume.remove(f.x + 1, Y + 1, f.z);
    expect(tickCrops(s, 1000, () => 0, near(f.x, f.z))).toBe(false); // sem céu aberto (e sem lanterna)
  });
  it('só cresce perto do viajante', async () => {
    const { s } = await open(); const f = field(s); hold(s, Item.GLASS_REED); placeFromSlot(s, f.hit, 0);
    expect(tickCrops(s, 1000, () => 0, near(f.x + 200, f.z))).toBe(false);
  });
  it('mochila cheia: a colheita não acontece e a planta fica como está', async () => {
    const { s } = await open(); const f = field(s); hold(s, Item.GLASS_REED); placeFromSlot(s, f.hit, 0);
    tickCrops(s, 1000, () => 0, near(f.x, f.z)); tickCrops(s, 1000, () => 0, near(f.x, f.z));
    let n = 0; while (s.inventory.canAdd(Item.SAND) && n++ < 5000) s.inventory.add(Item.SAND, 1);
    while (s.inventory.canAdd(Item.GLASS_REED, 2) && n++ < 5000) s.inventory.add(Item.GLASS_REED, 1); // enche também a pilha de mudas
    expect(collectItem(s, cropId(f.x, Y + 1, f.z))).toEqual({ ok: false, msg: 'Mochila cheia' });
    expect(s.crops.get(cropKey(f.x, Y + 1, f.z))!.age).toBe(2);
  });
  it('quebrar a areia de baixo derruba a planta e devolve a muda no chão', async () => {
    const { s } = await open(); const f = field(s); hold(s, Item.GLASS_REED); placeFromSlot(s, f.hit, 0);
    expect(breakOrCollect(s, f.hit).ok).toBe(true);
    expect(s.crops.size).toBe(0);
    expect([...s.drops.values()].some((d) => d.item === Item.GLASS_REED)).toBe(true);
  });
  it('persiste a idade e descarta planta sem areia sob ela', async () => {
    const { st, s } = await open(); const f = field(s); hold(s, Item.GLASS_REED); placeFromSlot(s, f.hit, 0);
    tickCrops(s, 1000, () => 0, near(f.x, f.z));
    await flush(st, s);
    const r = await openSession(st, null, () => 1);
    expect(r.crops.get(cropKey(f.x, Y + 1, f.z))).toMatchObject({ age: 1 });
    expect(standingCrops(r)).toHaveLength(1);
    const h = st.games.get(42)!;
    h.crops = { ...(h.crops ?? {}), [cropKey(f.x + 9, Y + 1, f.z)]: 1, [cropKey(f.x, Y + 1, f.z)]: 9 };
    const r2 = await openSession(st, null, () => 1);
    expect(r2.crops.size).toBe(0); // uma sem areia, outra com idade acima do limite
  });
});
