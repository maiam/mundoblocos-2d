import { describe, expect, it } from 'vitest';
import { placeFromSlot } from './actions';
import { Item, isBucket, isItem, maxStack } from './items';
import { raycast } from './physics';
import { recipeById } from './recipes';
import { MemoryTitanStorage } from './save';
import { flush, openSession } from './session';
import { LAKE_LAST_Y, T } from './voxel';

/** Balde de Cobre (ADR 0091): recolhe e despeja uma célula do lago. */
const open = async (st = new MemoryTitanStorage()) => ({ st, s: await openSession(st, 42, () => 1, undefined, 2) });
type S = Awaited<ReturnType<typeof openSession>>;
/** Uma coluna de lago com ar em cima (a superfície) e ao menos 3 de água embaixo. */
const lakeCell = (s: S): { x: number; z: number } => {
  for (let x = -60; x < 60; x++) for (let z = -60; z < 60; z++) {
    const v = s.volume;
    if (v.get(x, LAKE_LAST_Y, z) === T.LAKE && v.get(x, LAKE_LAST_Y + 1, z) === T.AIR && v.get(x, LAKE_LAST_Y - 1, z) === T.LAKE && v.get(x, LAKE_LAST_Y - 2, z) === T.LAKE) return { x, z };
  }
  throw new Error('sem lago');
};
const hold = (s: S, item: number): void => { s.inventory.add(item, 1); const k = [...Array(36).keys()].find((i) => s.inventory.get(i)?.item === item)!; s.inventory.move(k, 0); s.selected = 0; };

describe('balde de cobre', () => {
  it('itens 35 e 36, pilha de 1 e receita de 3 lingotes na Mesa', () => {
    expect(isItem(Item.BALDE) && isItem(Item.BALDE_CHEIO)).toBe(true); expect(isItem(78)).toBe(false);
    expect(isBucket(Item.BALDE) && isBucket(Item.BALDE_CHEIO) && !isBucket(Item.COPPER_INGOT)).toBe(true);
    expect(maxStack(Item.BALDE)).toBe(1); expect(maxStack(Item.BALDE_CHEIO)).toBe(1);
    const r = recipeById('balde')!;
    expect(r.station).toBe('workbench'); expect(r.result).toEqual({ item: Item.BALDE, count: 1 }); expect(r.ingredients).toEqual([{ item: Item.COPPER_INGOT, count: 3 }]);
  });
  it('a mira só acerta o líquido com `liquid`', async () => {
    const { s } = await open(); const c = lakeCell(s);
    const ox = c.x + 0.5, oz = c.z + 0.5, oy = LAKE_LAST_Y + 1.8;
    const sem = raycast(s.volume, ox, oy, oz, 0, -1, 0, 6);
    expect(sem === null || s.volume.get(sem.x, sem.y, sem.z) !== T.LAKE).toBe(true);
    const com = raycast(s.volume, ox, oy, oz, 0, -1, 0, 6, undefined, 0, true)!;
    expect([com.x, com.y, com.z, com.ny]).toEqual([c.x, LAKE_LAST_Y, c.z, 1]);
  });
  it('vazio recolhe a superfície (vira ar) e fica cheio; cheio despeja e volta a vazio', async () => {
    const { s } = await open(); const c = lakeCell(s); hold(s, Item.BALDE);
    const r = placeFromSlot(s, { x: c.x, y: LAKE_LAST_Y, z: c.z, nx: 0, ny: 1, nz: 0 }, 0);
    expect(r.ok).toBe(true);
    expect(s.volume.get(c.x, LAKE_LAST_Y, c.z)).toBe(T.AIR);
    expect(s.inventory.get(0)).toEqual({ item: Item.BALDE_CHEIO, count: 1 });
    // despeja de volta na cavidade (a face de cima da célula de baixo)
    const p = placeFromSlot(s, { x: c.x, y: LAKE_LAST_Y - 1, z: c.z, nx: 0, ny: 1, nz: 0 }, 0);
    expect(p.ok).toBe(true);
    expect(s.volume.get(c.x, LAKE_LAST_Y, c.z)).toBe(T.LAKE);
    expect(s.inventory.get(0)).toEqual({ item: Item.BALDE, count: 1 });
  });
  it('recusa: célula que não é a superfície, bloco que não é líquido, e despejo acima do nível do lago ou sobre célula ocupada', async () => {
    const { s } = await open(); const c = lakeCell(s); hold(s, Item.BALDE);
    expect(placeFromSlot(s, { x: c.x, y: LAKE_LAST_Y - 1, z: c.z, nx: 0, ny: 1, nz: 0 }, 0)).toMatchObject({ ok: false }); // há água em cima
    expect(s.volume.get(c.x, LAKE_LAST_Y - 1, c.z)).toBe(T.LAKE);
    s.volume.set(c.x, LAKE_LAST_Y + 3, c.z, T.DARK_ROCK);
    expect(placeFromSlot(s, { x: c.x, y: LAKE_LAST_Y + 3, z: c.z, nx: 0, ny: 1, nz: 0 }, 0)).toMatchObject({ ok: false, msg: 'Aponte o balde para o lago' });
    expect(s.inventory.get(0)?.item).toBe(Item.BALDE);
    s.inventory.replace(0, Item.BALDE_CHEIO);
    const alto = placeFromSlot(s, { x: c.x, y: LAKE_LAST_Y + 3, z: c.z, nx: 0, ny: 1, nz: 0 }, 0);
    expect(alto.ok).toBe(false); expect(s.volume.get(c.x, LAKE_LAST_Y + 4, c.z)).toBe(T.AIR);
    expect(placeFromSlot(s, { x: c.x, y: LAKE_LAST_Y - 2, z: c.z, nx: 0, ny: 1, nz: 0 }, 0)).toMatchObject({ ok: false }); // a célula de cima já é líquido
    expect(s.inventory.get(0)?.item).toBe(Item.BALDE_CHEIO);
  });
  it('colocar sólido sobre o líquido despejado o desloca e retirar devolve ar', async () => {
    const { s } = await open(); const c = lakeCell(s); hold(s, Item.BALDE);
    placeFromSlot(s, { x: c.x, y: LAKE_LAST_Y, z: c.z, nx: 0, ny: 1, nz: 0 }, 0);
    placeFromSlot(s, { x: c.x, y: LAKE_LAST_Y - 1, z: c.z, nx: 0, ny: 1, nz: 0 }, 0);
    expect(s.volume.place(c.x, LAKE_LAST_Y, c.z, T.DARK_ROCK)).toBe(true);
    expect(s.volume.remove(c.x, LAKE_LAST_Y, c.z)).toBe(true);
    expect(s.volume.get(c.x, LAKE_LAST_Y, c.z)).toBe(T.LAKE); // a base é lago: a célula original volta (regra do lago)
  });
  it('persiste a cavidade e o balde cheio', async () => {
    const { st, s } = await open(); const c = lakeCell(s); hold(s, Item.BALDE);
    placeFromSlot(s, { x: c.x, y: LAKE_LAST_Y, z: c.z, nx: 0, ny: 1, nz: 0 }, 0);
    await flush(st, s);
    const r = await openSession(st, null, () => 1);
    expect(r.volume.get(c.x, LAKE_LAST_Y, c.z)).toBe(T.AIR);
    expect(r.inventory.get(0)).toEqual({ item: Item.BALDE_CHEIO, count: 1 });
  });
});
