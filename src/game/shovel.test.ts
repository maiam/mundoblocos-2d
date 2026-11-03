import { describe, expect, it } from 'vitest';
import { Block, BLOCKS, MATERIALS } from '../world/blocks';
import { toolCanBreak, toolDrops, TOOLS } from '../world/items';
import { mulberry32 } from '../world/random';
import { World } from '../world/world';
import { Entities } from './entities';
import { Player } from './player';
import { Sheep } from './sheep';

let next = 0;
/** Célula livre perto do spawn com o chão trocado pelo id pedido (cava e preenche o buraco com o bloco). */
function cellWithGround(w: World, ground: number): [number, number] {
  const [sx, sy] = w.outsideGate();
  const x = sx + 2 + (next++ % 6), y = sy;
  while (w.topBlock(x, y)) w.breakBlock(x, y);
  if (w.getGround(x, y) !== Block.HOLE) w.breakBlock(x, y);
  expect(w.getGround(x, y)).toBe(Block.HOLE);
  w.placeBlock(x, y, ground);
  expect(w.getGround(x, y)).toBe(ground);
  return [x, y];
}

describe('Pá', () => {
  it('quebra só blocos macios e plantas; não quebra pedra, madeira nem árvore', () => {
    const diggable = [Block.DIRT, Block.GRASS, Block.TILLED, Block.PATH, Block.SAND,
      Block.CACTUS, Block.TALL_GRASS, Block.FLOWER, Block.WHEAT_0, Block.WHEAT_15];
    for (const id of diggable) expect(toolCanBreak('shovel', id)).toBe(true);
    for (const id of [Block.STONE, Block.OAK_LOG, Block.OAK_PLANKS, Block.OAK_TREE, Block.SAKURA_TREE]) {
      expect(toolCanBreak('shovel', id)).toBe(false);
    }
    expect(MATERIALS.filter((m) => BLOCKS[m].soft)).toEqual([Block.DIRT, Block.GRASS, Block.TILLED, Block.PATH, Block.SAND]);
  });

  it('destrói plantas sem soltar nada; outras ferramentas mantêm a colheita', () => {
    expect(toolDrops('shovel', Block.WHEAT_15, mulberry32(1))).toEqual([]);
    expect(toolDrops('shovel', Block.WHEAT_0, mulberry32(1))).toEqual([]);
    expect(toolDrops('hoe', Block.WHEAT_15, mulberry32(1)).length).toBeGreaterThan(0);
    expect(toolDrops(null, Block.WHEAT_15, mulberry32(1)).length).toBeGreaterThan(0);
  });

  it('não ataca e tem animação de ação própria', () => {
    expect(TOOLS.shovel.strikes).toBe(false);
    expect(TOOLS.shovel.swings).toBe(true);
    const p = new Player(0.5, 0.5);
    const e = new Entities(p, mulberry32(1));
    p.equipped = 'shovel';
    p.facing = 'down';
    e.npcs.push(new Sheep(p.x, p.y + 1, 0, 0, mulberry32(2)));
    p.startAttack();
    expect(e.actors[0].kind).toBe('heroine-shovel-attack');
    expect(e.npcs).toHaveLength(1); // o Game só chama strike para ferramentas com `strikes`
  });

  it('amassa Terra, Terra com Grama e Terra Arada em Caminho de Terra', () => {
    for (const g of [Block.DIRT, Block.GRASS, Block.TILLED]) {
      const w = new World(7);
      const [x, y] = cellWithGround(w, g);
      expect(w.canFlatten(x, y)).toBe(true);
      expect(w.flatten(x, y)).toBe(true);
      expect(w.getGround(x, y)).toBe(Block.PATH);
      expect(w.getObject(x, y)).toBe(Block.AIR);
    }
  });

  it('não amassa areia, pedra, caminho, chão com cubo ou com trigo plantado', () => {
    const w = new World(7);
    for (const g of [Block.SAND, Block.STONE, Block.PATH]) {
      const [x, y] = cellWithGround(w, g);
      expect(w.flatten(x, y)).toBe(false);
    }
    let [x, y] = cellWithGround(w, Block.DIRT);
    w.placeBlock(x, y, Block.STONE);
    expect(w.canFlatten(x, y)).toBe(false);
    [x, y] = cellWithGround(w, Block.TILLED);
    w.plant(x, y);
    expect(w.canFlatten(x, y)).toBe(false);
  });
});
