import { describe, expect, it } from 'vitest';
import { Block, BLOCKS, HOTBAR_BLOCKS } from './blocks';
import { breakSeconds, toolCanBreak } from './items';
import { WORLD_PROFILES } from './profiles';
import { World } from './world';

function freeCell(w: World): [number, number] {
  const [x, y] = w.findSpawn();
  for (let dx = -2; dx <= 2; dx++) while (w.topBlock(x + dx, y)) w.breakBlock(x + dx, y);
  return [x, y];
}

/** Célula livre com batentes de madeira à esquerda (tora) e à direita (piso). */
function framedCell(w: World): [number, number] {
  const [x, y] = freeCell(w);
  w.placeBlock(x - 1, y, Block.OAK_LOG);
  w.placeBlock(x + 1, y, Block.OAK_PLANKS);
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

  it('só vai entre batentes de madeira (tora ou piso) à esquerda e à direita', () => {
    const w = new World(7);
    const [x, y] = freeCell(w);
    expect(w.canPlace(x, y, Block.OAK_DOOR)).toBe(false); // sem batentes
    w.placeBlock(x - 1, y, Block.OAK_LOG);
    expect(w.canPlace(x, y, Block.OAK_DOOR)).toBe(false); // só um lado
    w.placeBlock(x + 1, y, Block.STONE);
    expect(w.canPlace(x, y, Block.OAK_DOOR)).toBe(false); // pedra não é madeira
    w.breakBlock(x + 1, y);
    w.placeBlock(x + 1, y, Block.OAK_PLANKS);
    expect(w.canPlace(x, y, Block.OAK_DOOR)).toBe(true);
    // Batentes acima/abaixo não contam (só esquerda e direita).
    const [ax, ay] = [x + 5, y];
    w.placeBlock(ax, ay - 1, Block.OAK_LOG);
    w.placeBlock(ax, ay + 1, Block.OAK_LOG);
    expect(w.canPlace(ax, ay, Block.OAK_DOOR)).toBe(false);
  });

  it('vai só no chão; nada empilha sobre ela nem ela sobre cubo/buraco', () => {
    const w = new World(7);
    const [x, y] = framedCell(w);
    w.placeBlock(x, y, Block.STONE);
    expect(w.placeBlock(x, y, Block.OAK_DOOR)).toBe(false); // sobre cubo
    w.breakBlock(x, y);
    w.breakBlock(x, y); // buraco
    expect(w.placeBlock(x, y, Block.OAK_DOOR)).toBe(false);
    w.placeBlock(x, y, Block.GRASS); // tapa o buraco (vira piso)
    expect(w.placeBlock(x, y, Block.OAK_DOOR)).toBe(true);
    expect(w.placeBlock(x, y, Block.STONE)).toBe(false);
    expect(w.placeBlock(x, y, Block.OAK_DOOR)).toBe(false);
  });

  it('quebrar com ferramenta leva 1 s; com a mão/item, 2 s', () => {
    expect(breakSeconds(null)).toBe(2);
    for (const t of ['hoe', 'pickaxe', 'shovel', 'axe'] as const) expect(breakSeconds(t)).toBe(1);
  });

  it('fechada bloqueia, aberta deixa passar; quebrar devolve a célula livre', () => {
    const w = new World(7);
    const [x, y] = framedCell(w);
    expect(w.placeBlock(x, y, Block.OAK_DOOR)).toBe(true);
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
