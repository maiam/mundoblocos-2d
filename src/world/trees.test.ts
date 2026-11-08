import { describe, expect, it } from 'vitest';
import { adultOfStage, Block, BLOCKS, GROWTH_STAGE_ADULT, isGrowingTree, isRemovedStack, MATERIALS, TREE_NEXT } from './blocks';
import { BIOMES } from './biomes';
import { applyAction, parseAction } from './actions';
import { blockDrops, dropsFor, ITEMS, Item, pickDrops, RECIPES } from './items';
import { REPLACES_WATER, World } from './world';

/** Célula de grama livre e andável perto do portão. */
function grass(w: World): [number, number] {
  const [sx, sy] = w.outsideGate();
  for (let r = 2; r < 40; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const x = sx + dx, y = sy + dy;
        if (w.getGround(x, y) === Block.GRASS && w.getObject(x, y) === Block.AIR && w.isWalkable(x, y)) return [x, y];
      }
    }
  }
  throw new Error('sem grama livre');
}

describe('Árvores adultas (carvalho, macieira, cerejeira; sem crescimento desde a v0.88.0)', () => {
  it('não há mais mudas: nada de item, de plantio nem de estágio; só a macieira colhida volta a dar maçãs', () => {
    expect(Object.keys(ITEMS)).not.toContain('oak_sapling');
    expect(Object.keys(ITEMS)).not.toContain('apple_sapling');
    const w = new World(11);
    const [x, y] = grass(w);
    for (const id of Object.keys(GROWTH_STAGE_ADULT).map(Number)) expect(w.canPlant(x, y, id)).toBe(false);
    expect(Object.keys(TREE_NEXT).map(Number)).toEqual([Block.APPLE_TREE_BARE]);
    expect(isGrowingTree(Block.OAK_TREE)).toBe(false);
  });

  it('estágios antigos (muda, jovem, crescendo) em mundos salvos viram a árvore adulta da espécie ao carregar', () => {
    const w = new World(13);
    const [x, y] = grass(w);
    const cx = Math.floor(x / 16), cy = Math.floor(y / 16);
    const lx = x - cx * 16, ly = y - cy * 16;
    const stages: Array<[number, number]> = [
      [Block.OAK_SAPLING, Block.OAK_TREE], [Block.OAK_YOUNG, Block.OAK_TREE], [Block.OAK_GROWING, Block.OAK_TREE],
      [Block.APPLE_SAPLING, Block.APPLE_TREE], [Block.APPLE_YOUNG, Block.APPLE_TREE],
    ];
    for (const [old, adult] of stages) {
      const ground = new Uint8Array(256).fill(Block.GRASS);
      const levels = [new Uint8Array(256), new Uint8Array(256), new Uint8Array(256)];
      levels[0][ly * 16 + lx] = old;
      const b = new World(13);
      b.restoreChunk(cx, cy, ground, levels);
      expect(b.getObject(x, y)).toBe(adult);
      expect(adultOfStage(old)).toBe(adult);
    }
    expect(adultOfStage(Block.OAK_TREE)).toBe(Block.OAK_TREE); // o resto passa direto
  });

  it('mudas somem de bolsas, grades e baús salvos (como as antigas paredes)', () => {
    expect(isRemovedStack('oak_sapling')).toBe(true);
    expect(isRemovedStack('apple_sapling')).toBe(true);
    expect(isRemovedStack('apple')).toBe(false);
  });

  it('macieira: colher troca para a florida e as maçãs voltam com o tempo', () => {
    const w = new World(12);
    const [x, y] = grass(w);
    w.setObject(x, y, Block.APPLE_TREE);
    expect(w.canPick(x, y)).toBe(true);
    expect(w.pick(x, y)).toBe(true);
    expect(w.getObject(x, y)).toBe(Block.APPLE_TREE_BARE);
    expect(w.canPick(x, y)).toBe(false);
    w.tick(1, () => 0);
    expect(w.getObject(x, y)).toBe(Block.APPLE_TREE);
    expect(pickDrops(() => 0)).toEqual([{ item: Item.APPLE, count: 3 }]);
  });

  it('o que cai: carvalho e macieira dão 2–3 Toras de Carvalho, a Cerejeira dá Toras de Cerejeira; macieira carregada solta maçãs', () => {
    expect(dropsFor(Block.OAK_TREE, () => 0)).toEqual([]);
    expect(dropsFor(Block.SAKURA_TREE, () => 0)).toEqual([]);
    expect(dropsFor(Block.APPLE_TREE, () => 0.9)).toEqual([{ item: Item.APPLE, count: 2 }]);
    expect(blockDrops(Block.APPLE_TREE, () => 0)[0].count).toBe(3);
    expect(blockDrops(Block.OAK_TREE, () => 0.9)).toEqual([{ item: `block:${Block.OAK_LOG}`, count: 2 }]);
    expect(blockDrops(Block.SAKURA_TREE, () => 0)).toEqual([{ item: `block:${Block.CHERRY_LOG}`, count: 3 }]);
    expect(blockDrops(Block.OAK_SAPLING)).toEqual([]); // estágio aposentado não solta nada
  });

  it('madeira de cerejeira: tora vira 2 tábuas; as duas são blocos de madeira (batente de porta) e substituem a água', () => {
    const recipe = RECIPES.find((r) => r.id === 'cherry-planks')!;
    expect(recipe.inputs).toEqual([{ item: `block:${Block.CHERRY_LOG}`, count: 1 }]);
    expect(recipe.output).toEqual({ item: `block:${Block.CHERRY_PLANKS}`, count: 2 });
    for (const id of [Block.CHERRY_LOG, Block.CHERRY_PLANKS]) {
      expect(BLOCKS[id].organic).toBe('wood');
      expect(BLOCKS[id].placeable).toBe(true);
      expect(REPLACES_WATER.has(id)).toBe(true);
      expect(MATERIALS).toContain(id);
    }
  });

  it('rede (ADR 0016): plantar só aceita semente de cultura; colher passa pelas regras do World', () => {
    const w = new World(14);
    const [x, y] = grass(w);
    expect(parseAction({ kind: 'plant', x, y, block: 'x' })).toBeNull();
    expect(applyAction(w, { kind: 'plant', x, y, block: Block.STONE })).toBe(false);
    expect(applyAction(w, { kind: 'plant', x, y, block: Block.APPLE_SAPLING })).toBe(false); // aposentada
    w.setObject(x, y, Block.APPLE_TREE);
    expect(applyAction(w, parseAction({ kind: 'pick', x, y })!)).toBe(true);
  });

  it('Campos misturam macieiras aos carvalhos', () => {
    expect(BIOMES.meadow.altTree).toEqual({ id: Block.APPLE_TREE, share: 1 / 6 });
    const w = new World(42);
    let oak = 0, apple = 0;
    for (let y = -150; y < 150; y++) {
      for (let x = -150; x < 150; x++) {
        const id = w.getObject(x, y);
        if (id === Block.OAK_TREE) oak++;
        if (id === Block.APPLE_TREE) apple++;
      }
    }
    expect(apple).toBeGreaterThan(0);
    expect(apple / (oak + apple)).toBeGreaterThan(0.08);
    expect(apple / (oak + apple)).toBeLessThan(0.3);
  });
});
