import { describe, expect, it } from 'vitest';
import { placeFromSlot } from '../actions';
import { breakTotalMs } from '../breaking';
import { blockOfItem, isItem, Item, ITEM_NAMES, itemOfBlock } from '../items';
import { recipeById } from '../recipes';
import { MemoryTitanStorage } from '../save';
import { openSession } from '../session';
import { resolveSlabPlacement } from '../slabs';
import { surfaceOf } from '../sounds';
import { blockBoxes, blockSpan, isFull, isSlab, isSlabBottom, isStair, isWoodSlab, isWoodStair, modelOf, slabPartner, stairTurn, T, T_MAX, tileFor, WOOD_STAIR_KINDS, woodOf, woodStairId } from '../voxel';
import { ORVALIS_GENERATOR_VERSION, OrvalisGenerator, orvalisGeneratorFor } from './generator';

/** Família das madeiras (ADR 0139, W1): laje e degrau de carvalho, cerejeira e bétula. */
const open = () => openSession(new MemoryTitanStorage(), 42, () => 1, orvalisGeneratorFor, ORVALIS_GENERATOR_VERSION, (s, v) => new OrvalisGenerator(s, v));
const WOODS = [
  { w: 0, slab: Item.LAJE_CARVALHO, stair: Item.DEGRAU_CARVALHO, planks: Item.TABUA_CARVALHO, whole: T.PLANKS_OAK, nome: 'Carvalho', id: 'carvalho' },
  { w: 1, slab: Item.LAJE_CEREJEIRA, stair: Item.DEGRAU_CEREJEIRA, planks: Item.TABUA_CEREJEIRA, whole: T.PLANKS_CHERRY, nome: 'Cerejeira', id: 'cerejeira' },
  { w: 2, slab: Item.LAJE_BETULA, stair: Item.DEGRAU_BETULA, planks: Item.TABUA_BETULA, whole: T.PLANKS_BIRCH, nome: 'Bétula', id: 'betula' },
];

describe('lajes e degraus de madeira (ADR 0139)', () => {
  it('ids novos passam de 255? não: 190–207; o volume e o mesher aceitam ids > 255 (Uint16)', () => {
    expect(T_MAX).toBeGreaterThanOrEqual(207); // cercas e portões vieram depois (ADR 0140)
    expect(T.SLAB_OAK).toBe(190); expect(T.STAIR_BIRCH_270).toBe(207);
  });

  it('itens 156–161, nomes, receitas da Wiki (laje 3 → 6; degrau 6 → 4) e mundo do Orvalis', () => {
    for (const k of WOODS) {
      expect(isItem(k.slab) && isItem(k.stair)).toBe(true);
      expect(ITEM_NAMES[k.slab]).toBe(`Laje de ${k.nome}`); expect(ITEM_NAMES[k.stair]).toBe(`Degrau de ${k.nome}`);
      const ls = recipeById(`laje-${k.id}`)!, ds = recipeById(`degrau-${k.id}`)!;
      expect(ls).toMatchObject({ world: 'orvalis', station: 'workbench', result: { item: k.slab, count: 6 }, ingredients: [{ item: k.planks, count: 3 }] });
      expect(ds).toMatchObject({ world: 'orvalis', station: 'workbench', result: { item: k.stair, count: 4 }, ingredients: [{ item: k.planks, count: 6 }] });
    }
    expect(isItem(179)).toBe(false);
  });

  it('itens ↔ blocos: laje inferior/superior devolvem a mesma laje; os 4 giros do degrau devolvem o degrau; meia altura e várias caixas', () => {
    for (const k of WOODS) {
      const bottom = T.SLAB_OAK + 2 * k.w, top = bottom + 1;
      expect(blockOfItem(k.slab)).toBe(bottom); expect(itemOfBlock(bottom)).toBe(k.slab); expect(itemOfBlock(top)).toBe(k.slab);
      expect(isWoodSlab(bottom) && isWoodSlab(top) && isSlab(top) && !isFull(bottom)).toBe(true);
      expect(isSlabBottom(bottom)).toBe(true); expect(isSlabBottom(top)).toBe(false);
      expect(slabPartner(bottom)).toBe(top); expect(slabPartner(top)).toBe(bottom);
      expect(blockSpan(bottom)).toEqual([0, 0.5]); expect(blockSpan(top)).toEqual([0.5, 1]);
      expect(woodOf(bottom)).toBe(k.w); expect(tileFor(bottom, 'top')).not.toBe(tileFor(k.whole, 'top')); expect(tileFor(bottom, 'side')).not.toBe(tileFor(bottom, 'top')); expect(tileFor(top, 'side')).toBe(tileFor(bottom, 'side'));
      expect(blockOfItem(k.stair)).toBe(woodStairId(k.w, 0));
      for (let t = 0; t < 4; t++) {
        const id = woodStairId(k.w, t);
        expect(isWoodStair(id) && isStair(id) && !isFull(id)).toBe(true); expect(stairTurn(id)).toBe(t); expect(woodOf(id)).toBe(k.w);
        expect(itemOfBlock(id)).toBe(k.stair); expect(blockBoxes(id)!.length).toBe(2);
        expect(modelOf(id)).toEqual({ kind: WOOD_STAIR_KINDS[k.w], turn: t });
        expect(surfaceOf(id)).toBe('rock'); // sem timbre de madeira ainda, como as tábuas
      }
    }
    expect(isWoodStair(T.STONE_STAIR) || isWoodSlab(T.STONE_SLAB) || isWoodSlab(T.REED_SLAB)).toBe(false);
  });

  it('a laje só funde com a da mesma madeira, e a fusão é a tábua dela', () => {
    for (const k of WOODS) {
      const bottom = T.SLAB_OAK + 2 * k.w, top = bottom + 1;
      expect(resolveSlabPlacement(bottom, 1, undefined, bottom)).toEqual({ merge: true, block: k.whole });
      expect(resolveSlabPlacement(top, -1, undefined, bottom)).toEqual({ merge: true, block: k.whole });
      const outra = T.SLAB_OAK + 2 * ((k.w + 1) % 3);
      expect(resolveSlabPlacement(outra, 1, undefined, bottom).merge).toBe(false);
      expect(resolveSlabPlacement(T.STONE_SLAB, 1, undefined, bottom).merge).toBe(false);
      expect(resolveSlabPlacement(bottom, 1, undefined, T.STONE_SLAB).merge).toBe(false);
    }
  });

  it('quebra como a tábua (Wiki: dureza 2, machado): mesmo tempo da tábua com e sem machado', () => {
    for (const k of WOODS) for (const id of [T.SLAB_OAK + 2 * k.w, woodStairId(k.w, 1)]) {
      for (const tool of [false, 'wood'] as const) expect(breakTotalMs('block', id, tool)).toBe(breakTotalMs('block', k.whole, tool));
    }
  });

  it('no jogo: a laje vai ao chão, a segunda funde na tábua, o degrau sai girado para o jogador', async () => {
    const s = await open(), a = s.volume.gen.arrival, z = Math.floor(a.z);
    const slot = (item: number) => [...Array(36).keys()].find((i) => s.inventory.get(i)?.item === item)!;
    for (const k of WOODS) {
      const bx = Math.floor(a.x) + 2 + k.w * 2;
      s.inventory.add(k.slab, 2); s.inventory.add(k.stair, 1);
      expect(placeFromSlot(s, { x: bx, y: a.y - 1, z, nx: 0, ny: 1, nz: 0 }, slot(k.slab)).ok).toBe(true);
      expect(s.volume.get(bx, a.y, z)).toBe(T.SLAB_OAK + 2 * k.w);
      expect(placeFromSlot(s, { x: bx, y: a.y, z, nx: 0, ny: 1, nz: 0, hy: 0.5 }, slot(k.slab)).ok).toBe(true); // topo da laje: funde
      expect(s.volume.get(bx, a.y, z)).toBe(k.whole);
      expect(placeFromSlot(s, { x: bx, y: a.y - 1, z: z + 2, nx: 0, ny: 1, nz: 0 }, slot(k.stair)).ok).toBe(true);
      const id = s.volume.get(bx, a.y, z + 2);
      expect(isWoodStair(id) && woodOf(id) === k.w).toBe(true);
    }
  });

  it('o volume guarda ids acima de 255', async () => {
    const s = await open(), a = s.volume.gen.arrival;
    s.volume.set(Math.floor(a.x) + 5, a.y, Math.floor(a.z) + 5, T.STAIR_BIRCH_270);
    expect(s.volume.get(Math.floor(a.x) + 5, a.y, Math.floor(a.z) + 5)).toBe(207);
  });
});
