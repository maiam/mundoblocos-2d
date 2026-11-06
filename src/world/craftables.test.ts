import { describe, expect, it } from 'vitest';
import { Block, blockDef } from './blocks';
import { blockStack, breakDrops, RECIPES, toolCanBreak } from './items';
import { World } from './world';

describe('Fogueira, Caldeirão de Pedra e Forno de Pedra', () => {
  it('receitas: fogueira 3 toras; caldeirão 3 pedras + 1 fogueira; forno 6 pedras', () => {
    const r = (id: string) => RECIPES.find((x) => x.id === id)!;
    expect(r('campfire').inputs).toEqual([{ item: blockStack(Block.OAK_LOG), count: 3 }]);
    expect(r('campfire').output).toEqual({ item: blockStack(Block.CAMPFIRE), count: 1 });
    expect(r('stone-cauldron').inputs).toEqual([{ item: blockStack(Block.STONE), count: 3 }, { item: blockStack(Block.CAMPFIRE), count: 1 }]);
    expect(r('stone-oven').inputs).toEqual([{ item: blockStack(Block.STONE), count: 6 }]);
    expect(r('stone-oven').output).toEqual({ item: blockStack(Block.OVEN), count: 1 });
  });

  it('colocam fora da cidade, bloqueiam, voltam ao quebrar; machado desmonta a fogueira, picareta as de pedra', () => {
    const w = new World(42);
    const [gx, gy] = w.outsideGate();
    for (const id of [Block.CAMPFIRE, Block.CAULDRON, Block.OVEN]) {
      let spot: [number, number] = [gx, gy];
      for (let k = 1; k < 300 && !w.canPlace(...spot, id); k++) spot = [gx + (k % 17) - 8, gy + 2 + Math.floor(k / 17)];
      expect(w.placeBlock(...spot, id)).toBe(true);
      expect(w.isWalkable(...spot)).toBe(false);
      expect(blockDef(id).placeable).toBe(true);
      expect(w.breakBlock(...spot)).toBe(id);
      expect(breakDrops(null, id, true)).toEqual([{ item: blockStack(id), count: 1 }]);
    }
    expect(toolCanBreak('axe', Block.CAMPFIRE)).toBe(true);
    expect(toolCanBreak('pickaxe', Block.OVEN)).toBe(true);
    expect(toolCanBreak('pickaxe', Block.CAULDRON)).toBe(true);
    expect(w.canPlace(...w.town!.start, Block.CAMPFIRE)).toBe(false); // cidade protegida
  });
});
