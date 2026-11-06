import { describe, expect, it } from 'vitest';
import { Block, CROP_KINDS, CROP_STAGES, CROPS, cropId, cropKind, cropStage, isCrop } from './blocks';
import { applyAction, parseAction } from './actions';
import { dropsFor, GRASS_VEGETABLE_CHANCE, ITEMS, Item, VEGETABLES } from './items';
import { World } from './world';

/** Célula de grama livre perto do portão, já arada. */
function tilled(w: World): [number, number] {
  const [sx, sy] = w.outsideGate();
  for (let r = 2; r < 40; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const x = sx + dx, y = sy + dy;
        if (w.canTill(x, y) && w.getObject(x, y) === Block.AIR) {
          w.till(x, y);
          return [x, y];
        }
      }
    }
  }
  throw new Error('sem terra para arar');
}

describe('Hortaliças (batata, tomate, cenoura)', () => {
  it('tabela de culturas: 16 estágios por cultura, ids sem sobreposição', () => {
    const ids = new Set<number>();
    for (const k of CROP_KINDS) {
      for (let s = 0; s < CROP_STAGES; s++) {
        const id = cropId(k, s);
        expect(ids.has(id)).toBe(false);
        ids.add(id);
        expect(cropKind(id)).toBe(k);
        expect(cropStage(id)).toBe(s);
      }
    }
    expect(cropId('wheat', 0)).toBe(Block.WHEAT_0);
    expect(isCrop(Block.OAK_TREE)).toBe(false);
    expect(Math.max(...ids)).toBeLessThan(256); // cabe no chunk (Uint8Array)
  });

  it('o próprio legume planta (só em Terra Arada) e cresce até maduro', () => {
    for (const kind of ['potato', 'tomato', 'carrot'] as const) {
      const w = new World(21);
      const item = ITEMS[kind];
      expect(item.plants).toBe(CROPS[kind].first);
      const [x, y] = tilled(w);
      expect(w.canPlant(x + 40, y + 40, item.plants)).toBe(false); // grama sem arar
      expect(w.plant(x, y, item.plants)).toBe(true);
      expect(w.isWalkable(x, y)).toBe(true); // plantação não bloqueia
      for (let i = 0; i < CROP_STAGES; i++) w.tick(1, () => 0);
      expect(w.getObject(x, y)).toBe(cropId(kind, CROP_STAGES - 1));
    }
  });

  it('colheita: madura dá 2–3 legumes; verde devolve 1; capim às vezes solta uma hortaliça', () => {
    expect(dropsFor(cropId('potato', CROP_STAGES - 1), () => 0)).toEqual([{ item: Item.POTATO, count: 3 }]);
    expect(dropsFor(cropId('tomato', CROP_STAGES - 1), () => 0.9)).toEqual([{ item: Item.TOMATO, count: 2 }]);
    expect(dropsFor(cropId('carrot', 4))).toEqual([{ item: Item.CARROT, count: 1 }]);
    expect(dropsFor(Block.TALL_GRASS, () => 0.99)).toEqual([]);
    const seq = [GRASS_VEGETABLE_CHANCE / 2, 0.99];
    let i = 0;
    const got = dropsFor(Block.TALL_GRASS, () => seq[i++]);
    expect(got).toHaveLength(1);
    expect(VEGETABLES).toContain(got[0].item);
    // Trigo continua igual.
    expect(dropsFor(Block.WHEAT_15, () => 0)).toEqual([{ item: Item.WHEAT, count: 1 }, { item: Item.WHEAT_SEED, count: 2 }]);
  });

  it('rede: plantar hortaliça passa pela regra do World', () => {
    const w = new World(22);
    const [x, y] = tilled(w);
    const a = parseAction({ kind: 'plant', x, y, block: Block.TOMATO_0 })!;
    expect(applyAction(w, a)).toBe(true);
    expect(applyAction(w, { kind: 'plant', x: x + 1, y, block: cropId('tomato', 5) })).toBe(false); // só o 1º estágio
  });
});
