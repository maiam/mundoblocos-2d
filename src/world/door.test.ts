import { describe, expect, it } from 'vitest';
import { Block, BLOCKS, HOTBAR_BLOCKS } from './blocks';
import { toolCanBreak } from './items';
import { WORLD_PROFILES } from './profiles';
import { World } from './world';

function freeCell(w: World): [number, number] {
  const [x, y] = w.findSpawn();
  while (w.topBlock(x, y)) w.breakBlock(x, y);
  return [x, y];
}

describe('Porta de Carvalho', () => {
  it('é bloco de madeira do mundo principal (hotbar), não do Santuário', () => {
    expect(HOTBAR_BLOCKS).toContain(Block.OAK_DOOR);
    expect(BLOCKS[Block.OAK_DOOR].organic).toBe('wood');
    expect(BLOCKS[Block.OAK_DOOR_OPEN].placeable).toBe(false);
    expect(WORLD_PROFILES.santuario.blocks).not.toContain(Block.OAK_DOOR);
    expect(toolCanBreak('axe', Block.OAK_DOOR)).toBe(true);
    expect(toolCanBreak('pickaxe', Block.OAK_DOOR)).toBe(false);
  });

  it('vai só no chão; nada empilha sobre ela nem ela sobre cubo/buraco', () => {
    const w = new World(7);
    const [x, y] = freeCell(w);
    expect(w.placeBlock(x, y, Block.OAK_DOOR)).toBe(true);
    expect(w.placeBlock(x, y, Block.STONE)).toBe(false);
    expect(w.placeBlock(x, y, Block.OAK_DOOR)).toBe(false);
    w.placeBlock(x + 1, y, Block.STONE);
    expect(w.placeBlock(x + 1, y, Block.OAK_DOOR)).toBe(false);
    while (w.topBlock(x + 1, y)) w.breakBlock(x + 1, y);
    w.breakBlock(x + 1, y); // buraco
    expect(w.placeBlock(x + 1, y, Block.OAK_DOOR)).toBe(false);
  });

  it('fechada bloqueia, aberta deixa passar; quebrar devolve a célula livre', () => {
    const w = new World(7);
    const [x, y] = freeCell(w);
    w.placeBlock(x, y, Block.OAK_DOOR);
    expect(w.standHeight(x, y)).toBeNull();
    expect(w.toggleDoor(x, y)).toBe(true);
    expect(w.isDoorOpen(x, y)).toBe(true);
    expect(w.standHeight(x, y)).toBe(0);
    w.toggleDoor(x, y);
    expect(w.standHeight(x, y)).toBeNull();
    expect(w.toggleDoor(x + 3, y + 3)).toBe(w.isDoor(x + 3, y + 3));
    expect(w.breakBlock(x, y)).toBe(Block.OAK_DOOR);
    expect(w.isWalkable(x, y)).toBe(true);
  });
});
