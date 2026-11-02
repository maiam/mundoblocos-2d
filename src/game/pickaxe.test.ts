import { describe, expect, it } from 'vitest';
import { Block, CELESTIAL_BLOCKS } from '../world/blocks';
import { toolCanBreak, toolDrops, TOOLS } from '../world/items';
import { mulberry32 } from '../world/random';
import { Entities } from './entities';
import { Player } from './player';
import { Sheep } from './sheep';

describe('Picareta', () => {
  it('quebra qualquer bloco e plantas, mas não madeira nem árvore', () => {
    const minable = [Block.DIRT, Block.GRASS, Block.TILLED, Block.PATH, Block.SAND, Block.STONE,
      Block.CACTUS, Block.TALL_GRASS, Block.FLOWER, Block.WHEAT_0, Block.WHEAT_15, ...CELESTIAL_BLOCKS];
    for (const id of minable) expect(toolCanBreak('pickaxe', id)).toBe(true);
    for (const id of [Block.OAK_LOG, Block.OAK_PLANKS, Block.OAK_TREE, Block.SAKURA_TREE]) {
      expect(toolCanBreak('pickaxe', id)).toBe(false);
    }
  });

  it('destrói plantas sem soltar nada', () => {
    expect(toolDrops('pickaxe', Block.WHEAT_15, mulberry32(1))).toEqual([]);
    expect(toolDrops('pickaxe', Block.WHEAT_0, mulberry32(1))).toEqual([]);
    expect(TOOLS.pickaxe.groundUse).toBeNull();
  });

  it('não ataca e tem animação de minerar própria', () => {
    expect(TOOLS.pickaxe.strikes).toBe(false);
    expect(TOOLS.pickaxe.swings).toBe(true);
    const p = new Player(0.5, 0.5);
    const e = new Entities(p, mulberry32(1));
    p.equipped = 'pickaxe';
    p.facing = 'down';
    e.npcs.push(new Sheep(p.x, p.y + 1, 0, 0, mulberry32(2)));
    p.startAttack();
    expect(e.actors[0].kind).toBe('heroine-pickaxe-attack');
    expect(e.npcs).toHaveLength(1);
  });
});
