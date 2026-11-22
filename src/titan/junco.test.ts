import { describe, expect, it } from 'vitest';
import { breakOrCollect, placeFromSlot } from './actions';
import { Item, blockOfItem, dropCountOf, isItem, itemOfBlock } from './items';
import { recipeById } from './recipes';
import { MemoryTitanStorage } from './save';
import { openSession } from './session';
import { resolveSlabPlacement } from './slabs';
import { sweep } from './dropTestUtil';
import { T, blockSpan, isFull, isSlab, isSlabBottom, isSolid, slabPartner, tileFor } from './voxel';

/** Família do Junco (ADR 0100): Bloco de Junco e Laje de Junco. */
const open = async () => openSession(new MemoryTitanStorage(), 42, () => 1, undefined, 2);
type S = Awaited<ReturnType<typeof openSession>>;
const Y = 150;
const floor = (s: S) => {
  const a = s.volume.gen.arrival, x = Math.floor(a.x) + 6, z = Math.floor(a.z) + 6;
  for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) { s.volume.set(x + dx, Y - 1, z + dz, T.DARK_ROCK); for (let yy = Y; yy < Y + 4; yy++) s.volume.set(x + dx, yy, z + dz, T.AIR); }
  s.body.x = x + 20.5; s.body.z = z + 20.5; s.body.y = Y;
  return { x, z };
};
const hold = (s: S, item: number, n = 6): void => { s.inventory.add(item, n); const k = [...Array(36).keys()].find((i) => s.inventory.get(i)?.item === item)!; s.inventory.move(k, 0); s.selected = 0; };

describe('bloco e laje de junco', () => {
  it('itens 37 e 38, blocos 47–49 e as receitas na Mesa', () => {
    expect(isItem(Item.BLOCO_JUNCO) && isItem(Item.LAJE_JUNCO)).toBe(true);
    expect(blockOfItem(Item.BLOCO_JUNCO)).toBe(T.REED_BLOCK); expect(blockOfItem(Item.LAJE_JUNCO)).toBe(T.REED_SLAB);
    expect(itemOfBlock(T.REED_BLOCK)).toBe(Item.BLOCO_JUNCO); expect(itemOfBlock(T.REED_SLAB)).toBe(Item.LAJE_JUNCO); expect(itemOfBlock(T.REED_SLAB_TOP)).toBe(Item.LAJE_JUNCO);
    expect(dropCountOf(T.REED_BLOCK)).toBe(1);
    const b = recipeById('bloco-junco')!, l = recipeById('laje-junco')!;
    expect(b.station).toBe('workbench'); expect(b.ingredients).toEqual([{ item: Item.DRY_REED, count: 6 }]); expect(b.result).toEqual({ item: Item.BLOCO_JUNCO, count: 1 });
    expect(l.ingredients).toEqual([{ item: Item.BLOCO_JUNCO, count: 3 }]); expect(l.result).toEqual({ item: Item.LAJE_JUNCO, count: 6 });
  });
  it('o bloco é cubo inteiro e a laje ocupa meia célula, como a de rocha; os tiles são os da trama', () => {
    expect(isSolid(T.REED_BLOCK) && isFull(T.REED_BLOCK)).toBe(true); expect(blockSpan(T.REED_BLOCK)).toEqual([0, 1]);
    expect(isSlab(T.REED_SLAB) && isSlab(T.REED_SLAB_TOP) && !isFull(T.REED_SLAB)).toBe(true);
    expect(blockSpan(T.REED_SLAB)).toEqual([0, 0.5]); expect(blockSpan(T.REED_SLAB_TOP)).toEqual([0.5, 1]);
    expect(isSlabBottom(T.REED_SLAB) && !isSlabBottom(T.REED_SLAB_TOP) && isSlabBottom(T.SLAB)).toBe(true);
    expect(slabPartner(T.REED_SLAB)).toBe(T.REED_SLAB_TOP); expect(slabPartner(T.SLAB_TOP)).toBe(T.SLAB);
    expect(tileFor(T.REED_BLOCK, 'top')).not.toBe(tileFor(T.DARK_ROCK, 'top'));
    expect(tileFor(T.REED_SLAB, 'side')).not.toBe(tileFor(T.REED_SLAB, 'top')); // a lateral é o tile de 32 × 16
  });
  it('a fusão só acontece com a laje da mesma família; duas lajes de junco viram o bloco', () => {
    expect(resolveSlabPlacement(T.REED_SLAB, 1, 0.5, T.REED_SLAB)).toEqual({ merge: true, block: T.REED_BLOCK });
    expect(resolveSlabPlacement(T.REED_SLAB_TOP, -1, 0.5, T.REED_SLAB)).toEqual({ merge: true, block: T.REED_BLOCK });
    expect(resolveSlabPlacement(T.SLAB, 1, 0.5, T.REED_SLAB).merge).toBe(false); // laje de rocha embaixo: não funde com a de junco
    expect(resolveSlabPlacement(T.REED_SLAB, 1, 0.5, T.SLAB).merge).toBe(false);
    expect(resolveSlabPlacement(T.SLAB, 1, 0.5, T.SLAB)).toEqual({ merge: true, block: T.SLAB_DOUBLE }); // a de rocha segue igual
    expect(resolveSlabPlacement(T.DARK_ROCK, -1, 0.5, T.REED_SLAB)).toEqual({ merge: false, block: T.REED_SLAB_TOP });
  });
  it('colocar e quebrar: bloco, laje inferior e superior, fusão em bloco; quebrar devolve o item de junco', async () => {
    const s = await open(); const f = floor(s);
    hold(s, Item.BLOCO_JUNCO);
    expect(placeFromSlot(s, { x: f.x, y: Y - 1, z: f.z, nx: 0, ny: 1, nz: 0 }, 0).ok).toBe(true);
    expect(s.volume.get(f.x, Y, f.z)).toBe(T.REED_BLOCK); expect(s.inventory.total(Item.BLOCO_JUNCO)).toBe(5);
    s.inventory.add(Item.LAJE_JUNCO, 6); const k = [...Array(36).keys()].find((i) => s.inventory.get(i)?.item === Item.LAJE_JUNCO)!; s.inventory.move(k, 1); s.selected = 1;
    expect(placeFromSlot(s, { x: f.x + 1, y: Y - 1, z: f.z, nx: 0, ny: 1, nz: 0 }, 1).ok).toBe(true);
    expect(s.volume.get(f.x + 1, Y, f.z)).toBe(T.REED_SLAB);
    expect(placeFromSlot(s, { x: f.x + 1, y: Y, z: f.z, nx: 0, ny: 1, nz: 0 }, 1).ok).toBe(true); // por cima da inferior: funde
    expect(s.volume.get(f.x + 1, Y, f.z)).toBe(T.REED_BLOCK);
    expect(placeFromSlot(s, { x: f.x + 2, y: Y - 1, z: f.z, nx: 0, ny: 1, nz: 0 }, 1).ok).toBe(true);
    expect(placeFromSlot(s, { x: f.x + 2, y: Y, z: f.z, nx: 0, ny: 0, nz: 1, hy: 0.8 }, 1).ok).toBe(true); // metade de cima da lateral: superior na célula vizinha
    expect(s.volume.get(f.x + 2, Y, f.z + 1)).toBe(T.REED_SLAB_TOP);
    expect(breakOrCollect(s, { x: f.x, y: Y, z: f.z, nx: 0, ny: 1, nz: 0 }).ok).toBe(true); sweep(s);
    expect(s.inventory.total(Item.BLOCO_JUNCO)).toBe(6);
  });
  it('persiste no save', async () => {
    const { flush } = await import('./session');
    const st = new MemoryTitanStorage(); const s = await openSession(st, 42, () => 1, undefined, 2); const f = floor(s);
    s.volume.set(f.x, Y, f.z, T.REED_BLOCK); s.volume.set(f.x + 1, Y, f.z, T.REED_SLAB); s.volume.set(f.x + 2, Y, f.z, T.REED_SLAB_TOP);
    await flush(st, s);
    const r = await openSession(st, null, () => 1);
    expect([r.volume.get(f.x, Y, f.z), r.volume.get(f.x + 1, Y, f.z), r.volume.get(f.x + 2, Y, f.z)]).toEqual([T.REED_BLOCK, T.REED_SLAB, T.REED_SLAB_TOP]);
  });
});
