import { describe, expect, it } from 'vitest';
import { Block, blockDef } from './blocks';
import { blockDrops, blockStack, breakDrops, toolCanBreak } from './items';
import { World } from './world';

describe('Pedregulhos (prancha de pedras)', () => {
  it('aparecem soltos pelo mundo no lugar dos antigos cubos de pedra avulsos', () => {
    const w = new World(42);
    let rocks = 0;
    for (let y = -120; y < 120; y++) for (let x = -120; x < 120; x++) if (w.getObject(x, y) === Block.ROCK_BOULDER) rocks++;
    expect(rocks).toBeGreaterThan(10);
    expect(blockDef(Block.ROCK_BOULDER)).toMatchObject({ shape: 'rock', solid: true, placeable: false, breakable: true });
  });

  it('minerado solta 1–3 Pedras Brutas (o bloco de pedra, que se coloca como cubo)', () => {
    expect(blockDrops(Block.ROCK_BOULDER, () => 0)).toEqual([{ item: blockStack(Block.STONE), count: 1 }]);
    expect(blockDrops(Block.ROCK_BOULDER, () => 0.99)).toEqual([{ item: blockStack(Block.STONE), count: 3 }]);
    expect(breakDrops('pickaxe', Block.ROCK_BOULDER, true, () => 0.5)).toEqual([{ item: blockStack(Block.STONE), count: 2 }]);
    expect(blockDef(Block.STONE)).toMatchObject({ shape: 'cube', placeable: true });
    expect(toolCanBreak('pickaxe', Block.ROCK_BOULDER)).toBe(true);
    expect(toolCanBreak('axe', Block.ROCK_BOULDER)).toBe(false);
  });
});
