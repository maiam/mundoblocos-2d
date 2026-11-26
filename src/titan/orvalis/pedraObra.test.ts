import { describe, expect, it } from 'vitest';
import { breakOrCollect, placeFromSlot } from '../actions';
import { breakTotalMs } from '../breaking';
import { sweep } from '../dropTestUtil';
import { BAG, HOTBAR } from '../inventory';
import { blockOfItem, isItem, Item, ITEM_NAMES, itemOfBlock } from '../items';
import { craft, recipeById } from '../recipes';
import { MemoryTitanStorage } from '../save';
import { openSession } from '../session';
import { resolveSlabPlacement } from '../slabs';
import { surfaceOf } from '../sounds';
import { blockSpan, isFull, isSlab, isSlabBottom, isSolid, slabPartner, T, tileFor } from '../voxel';
import { ORVALIS_GENERATOR_VERSION, OrvalisGenerator, orvalisGeneratorFor } from './generator';

/** Pedra de obra do Orvalis em voxel (ADR 0108): Pedra Lisa, Tijolo de Pedra e Laje de Pedra (que funde na Pedra Lisa). */
const open = () => openSession(new MemoryTitanStorage(), 42, () => 1, orvalisGeneratorFor, ORVALIS_GENERATOR_VERSION, (s, v) => new OrvalisGenerator(s, v));
const slotOf = (s: Awaited<ReturnType<typeof open>>, item: number): number => [...Array(HOTBAR + BAG).keys()].find((i) => s.inventory.get(i)?.item === item) ?? -1;

describe('pedra de obra (ADR 0108)', () => {
  it('receitas: 1 Pedra → 1 Pedra Lisa, 4 Pedra → 4 Tijolos, 3 Pedra Lisa → 6 Lajes; todas pedem a mesa', async () => {
    const s = await open();
    s.inventory.add(Item.STONE, 6);
    expect(craft(s.inventory, recipeById('pedra-lisa')!, null)).toEqual({ ok: false, reason: 'station' }); // na mão não
    expect(craft(s.inventory, recipeById('pedra-lisa')!, 'workbench').ok).toBe(true);
    expect(s.inventory.total(Item.STONE)).toBe(5); expect(s.inventory.total(Item.PEDRA_LISA)).toBe(1);
    expect(craft(s.inventory, recipeById('tijolo-pedra')!, 'workbench').ok).toBe(true);
    expect(s.inventory.total(Item.TIJOLO_PEDRA)).toBe(4); expect(s.inventory.total(Item.STONE)).toBe(1);
    s.inventory.add(Item.PEDRA_LISA, 2);
    expect(craft(s.inventory, recipeById('laje-pedra')!, 'workbench').ok).toBe(true);
    expect(s.inventory.total(Item.LAJE_PEDRA)).toBe(6); expect(s.inventory.total(Item.PEDRA_LISA)).toBe(0);
    for (const id of ['pedra-lisa', 'tijolo-pedra', 'laje-pedra']) expect(recipeById(id)!.world).toBe('orvalis');
  });

  it('itens ↔ blocos: lisa e tijolo são cubos; a laje (inferior e superior) é meia altura e devolve a mesma laje', () => {
    expect(blockOfItem(Item.PEDRA_LISA)).toBe(T.STONE_SMOOTH); expect(itemOfBlock(T.STONE_SMOOTH)).toBe(Item.PEDRA_LISA);
    expect(blockOfItem(Item.TIJOLO_PEDRA)).toBe(T.STONE_BRICK); expect(itemOfBlock(T.STONE_BRICK)).toBe(Item.TIJOLO_PEDRA);
    expect(blockOfItem(Item.LAJE_PEDRA)).toBe(T.STONE_SLAB); expect(itemOfBlock(T.STONE_SLAB)).toBe(Item.LAJE_PEDRA); expect(itemOfBlock(T.STONE_SLAB_TOP)).toBe(Item.LAJE_PEDRA);
    for (const [i, n] of [[Item.PEDRA_LISA, 'Pedra Lisa'], [Item.TIJOLO_PEDRA, 'Tijolo de Pedra'], [Item.LAJE_PEDRA, 'Laje de Pedra']] as const) { expect(isItem(i)).toBe(true); expect(ITEM_NAMES[i]).toBe(n); }
    expect(isItem(60)).toBe(false);
    expect(isFull(T.STONE_SMOOTH) && isFull(T.STONE_BRICK)).toBe(true);
    expect(isSlab(T.STONE_SLAB) && isSlab(T.STONE_SLAB_TOP) && !isFull(T.STONE_SLAB)).toBe(true);
    expect(blockSpan(T.STONE_SLAB)).toEqual([0, 0.5]); expect(blockSpan(T.STONE_SLAB_TOP)).toEqual([0.5, 1]);
    expect(isSlabBottom(T.STONE_SLAB)).toBe(true); expect(slabPartner(T.STONE_SLAB)).toBe(T.STONE_SLAB_TOP); expect(slabPartner(T.STONE_SLAB_TOP)).toBe(T.STONE_SLAB);
    expect(slabPartner(T.REED_SLAB_TOP)).toBe(T.REED_SLAB); // as outras famílias seguem iguais
    expect(isSolid(T.STONE_SLAB)).toBe(true);
  });

  it('a laje de pedra só funde com a laje de pedra: duas viram a Pedra Lisa; com a de rocha ou de junco não', () => {
    expect(resolveSlabPlacement(T.STONE_SLAB, 1, undefined, T.STONE_SLAB)).toEqual({ merge: true, block: T.STONE_SMOOTH });
    expect(resolveSlabPlacement(T.STONE_SLAB_TOP, -1, undefined, T.STONE_SLAB)).toEqual({ merge: true, block: T.STONE_SMOOTH });
    expect(resolveSlabPlacement(T.SLAB, 1, undefined, T.STONE_SLAB).merge).toBe(false); // laje de rocha embaixo
    expect(resolveSlabPlacement(T.REED_SLAB, 1, undefined, T.STONE_SLAB).merge).toBe(false);
    expect(resolveSlabPlacement(T.STONE_SLAB, 1, undefined, T.SLAB).merge).toBe(false); // e o inverso
    expect(resolveSlabPlacement(T.STONE, -1, undefined, T.STONE_SLAB)).toEqual({ merge: false, block: T.STONE_SLAB_TOP }); // face de baixo de um bloco: superior
  });

  it('no jogo: a laje vai ao chão em meia altura, a segunda por cima funde na Pedra Lisa (gastando 1), e quebrar devolve a laje ou a lisa', async () => {
    const s = await open(), a = s.volume.gen.arrival, cx = Math.floor(a.x) + 2, cz = Math.floor(a.z);
    s.inventory.add(Item.LAJE_PEDRA, 3);
    expect(placeFromSlot(s, { x: cx, y: a.y - 1, z: cz, nx: 0, ny: 1, nz: 0 }, slotOf(s, Item.LAJE_PEDRA)).ok).toBe(true);
    expect(s.volume.get(cx, a.y, cz)).toBe(T.STONE_SLAB);
    expect(placeFromSlot(s, { x: cx, y: a.y, z: cz, nx: 0, ny: 1, nz: 0, hy: 0.5 }, slotOf(s, Item.LAJE_PEDRA)).ok).toBe(true); // no topo da laje inferior: funde
    expect(s.volume.get(cx, a.y, cz)).toBe(T.STONE_SMOOTH); expect(s.inventory.total(Item.LAJE_PEDRA)).toBe(1);
    expect(breakOrCollect(s, { x: cx, y: a.y, z: cz, nx: 0, ny: 1, nz: 0 }).ok).toBe(true);
    sweep(s); expect(s.inventory.total(Item.PEDRA_LISA)).toBe(1); // a Pedra Lisa devolve 1 bloco
  });

  it('tempos, som e arte: cubos 1,6 s, laje 1 s; tile próprio de cada um; a lateral da laje é a de meia altura', () => {
    for (const b of [T.STONE_SMOOTH, T.STONE_BRICK]) expect(breakTotalMs('block', b)).toBe(1600);
    for (const b of [T.STONE_SLAB, T.STONE_SLAB_TOP]) expect(breakTotalMs('block', b)).toBe(1000);
    expect(breakTotalMs('block', T.STONE_SMOOTH, 'rock')).toBe(960); // com picareta de rocha
    for (const b of [T.STONE_SMOOTH, T.STONE_BRICK, T.STONE_SLAB, T.STONE_SLAB_TOP]) expect(surfaceOf(b)).toBe('rock');
    expect(new Set([tileFor(T.STONE, 'top'), tileFor(T.STONE_SMOOTH, 'top'), tileFor(T.STONE_BRICK, 'top'), tileFor(T.STONE_SLAB, 'top')]).size).toBe(4);
    expect(tileFor(T.STONE_SLAB, 'side')).not.toBe(tileFor(T.STONE_SLAB, 'top'));
    expect(tileFor(T.STONE_SLAB_TOP, 'side')).toBe(tileFor(T.STONE_SLAB, 'side'));
  });
});
