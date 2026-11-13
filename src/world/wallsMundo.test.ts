import { describe, expect, it } from 'vitest';
import { Block, blockDef, WALL_BLOCKS, WALL_DOOR_BLOCKS } from './blocks';
import { blockDrops, blockStack, RECIPES } from './items';
import { WORLD_PROFILES } from './profiles';
import { World } from './world';

describe('Paredes no Mundo (W5, v0.93.56)', () => {
  it('o perfil principal lista as paredes e a porta de parede', () => {
    for (const id of [...WALL_BLOCKS, ...WALL_DOOR_BLOCKS]) expect(WORLD_PROFILES.principal.blocks).toContain(id);
  });

  it('quebrar devolve o item: parede volta parede; porta de parede aberta volta a porta (fechada)', () => {
    expect(blockDrops(Block.WALL_PLANKS)).toEqual([{ item: blockStack(Block.WALL_PLANKS), count: 1 }]);
    expect(blockDrops(Block.WALL_STONE)).toEqual([{ item: blockStack(Block.WALL_STONE), count: 1 }]);
    expect(blockDrops(Block.WALL_DOOR_PLANKS)).toEqual([{ item: blockStack(Block.WALL_DOOR_PLANKS), count: 1 }]);
    expect(blockDrops(Block.WALL_DOOR_PLANKS_OPEN)).toEqual([{ item: blockStack(Block.WALL_DOOR_PLANKS), count: 1 }]);
  });

  it('há receita no Construtor para cada uma, com insumos que o Mundo tem', () => {
    for (const out of [Block.WALL_PLANKS, Block.WALL_STONE, Block.WALL_DOOR_PLANKS]) {
      const r = RECIPES.find((x) => x.output.item === blockStack(out));
      expect(r, blockDef(out).name).toBeDefined();
      expect(r!.profession).toBe('builder');
      for (const i of r!.inputs) expect(RECIPES.some((x) => x.output.item === i.item) || i.item === blockStack(Block.STONE)).toBe(true);
    }
  });

  it('colocar, emendar e abrir a porta funcionam no Mundo (as regras são as do Santuário)', () => {
    const w = new World(7);
    const [x, y] = w.outsideGate();
    for (let dx = 0; dx < 3; dx++) {
      while (w.topBlock(x + 3 + dx, y + 5)) w.breakBlock(x + 3 + dx, y + 5);
      w.setObject(x + 3 + dx, y + 5, Block.AIR);
    }
    expect(w.placeBlock(x + 3, y + 5, Block.WALL_PLANKS)).toBe(true);
    expect(w.placeBlock(x + 5, y + 5, Block.WALL_PLANKS)).toBe(true);
    expect(w.placeBlock(x + 4, y + 5, Block.WALL_DOOR_PLANKS)).toBe(true);
    expect(w.wallPieceAt(x + 3, y + 5)?.front).toBe('left');
    expect(w.isWallAt(x + 4, y + 5)).toBe(true);
  });
});
