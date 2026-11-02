import { describe, expect, it } from 'vitest';
import { Block, BLOCKS, MATERIALS } from '../world/blocks';
import { toolCanBreak, TOOLS } from '../world/items';
import { mulberry32 } from '../world/random';
import { World } from '../world/world';
import { Entities } from './entities';
import { Player } from './player';
import { Sheep } from './sheep';

describe('Machado', () => {
  it('só quebra o que é de madeira, árvore ou planta', () => {
    const choppable = [Block.OAK_LOG, Block.OAK_PLANKS, Block.OAK_TREE, Block.SAKURA_TREE, Block.CACTUS, Block.TALL_GRASS, Block.FLOWER, Block.WHEAT_0, Block.WHEAT_15];
    for (const id of choppable) expect(toolCanBreak('axe', id)).toBe(true);
    for (const id of [Block.DIRT, Block.GRASS, Block.TILLED, Block.PATH, Block.SAND, Block.STONE]) {
      expect(toolCanBreak('axe', id)).toBe(false);
    }
    // Materiais da prancha: só tora e piso são de madeira.
    expect(MATERIALS.filter((m) => BLOCKS[m].organic !== null)).toEqual([Block.OAK_LOG, Block.OAK_PLANKS]);
  });

  it('espada não quebra nada; mão vazia/itens e demais ferramentas quebram tudo', () => {
    for (const id of [Block.STONE, Block.OAK_TREE, Block.WHEAT_15, Block.FLOWER]) {
      expect(toolCanBreak('sword', id)).toBe(false);
      expect(toolCanBreak(null, id)).toBe(true);
      expect(toolCanBreak('pickaxe', id)).toBe(true);
    }
    expect(TOOLS.axe.strikes && TOOLS.sword.strikes).toBe(true);
    expect(TOOLS.hoe.strikes).toBe(false);
  });

  it('World informa o bloco que seria quebrado (topo ou chão)', () => {
    const w = new World(7);
    const [x, y] = w.findSpawn();
    while (w.topBlock(x, y)) w.breakBlock(x, y);
    expect(w.breakTargetId(x, y)).toBe(w.getGround(x, y));
    w.placeBlock(x, y, Block.OAK_LOG);
    w.placeBlock(x, y, Block.STONE);
    expect(w.breakTargetId(x, y)).toBe(Block.STONE); // pedra em cima da tora: machado não corta
    expect(toolCanBreak('axe', w.breakTargetId(x, y)!)).toBe(false);
  });

  it('golpe com machado usa a folha própria e faz animais sumirem', () => {
    const w = new World(7);
    const [sx, sy] = w.findSpawn();
    const p = new Player(sx + 0.5, sy + 0.5);
    const e = new Entities(p, mulberry32(1));
    p.equipped = 'axe';
    p.facing = 'down';
    const s = new Sheep(p.x, p.y + 1, sx, sy, mulberry32(2));
    e.npcs.push(s);
    p.startAttack();
    expect(e.actors[0].kind).toBe('heroine-axe-attack');
    expect(e.strike(p.facing)).toBe(1);
    expect(e.npcs).toHaveLength(0);
    void w;
  });
});

describe('Enxada', () => {
  it('quebra só plantas e derivados (não madeira nem árvore), não ataca e tem animação de ação', () => {
    for (const id of [Block.TALL_GRASS, Block.FLOWER, Block.CACTUS, Block.WHEAT_0, Block.WHEAT_15]) {
      expect(toolCanBreak('hoe', id)).toBe(true);
    }
    for (const id of [Block.OAK_TREE, Block.SAKURA_TREE, Block.OAK_LOG, Block.OAK_PLANKS, Block.STONE, Block.DIRT, Block.GRASS, Block.TILLED]) {
      expect(toolCanBreak('hoe', id)).toBe(false);
    }
    expect(TOOLS.hoe.swings).toBe(true);
    expect(TOOLS.hoe.strikes).toBe(false);
  });

  it('animação de arar usa a folha própria', () => {
    const w = new World(7);
    const [sx, sy] = w.findSpawn();
    const p = new Player(sx + 0.5, sy + 0.5);
    const e = new Entities(p, mulberry32(1));
    p.equipped = 'hoe';
    expect(e.actors[0].kind).toBe('heroine-hoe');
    p.startAttack('hoe');
    expect(e.actors[0].kind).toBe('heroine-hoe-attack');
  });
});
