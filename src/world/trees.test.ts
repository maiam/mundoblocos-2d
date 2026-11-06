import { describe, expect, it } from 'vitest';
import { Block, isGrowingTree, TREE_NEXT } from './blocks';
import { BIOMES } from './biomes';
import { applyAction, parseAction } from './actions';
import { blockDrops, dropsFor, ITEMS, Item, pickDrops } from './items';
import { World } from './world';

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

describe('Árvores que crescem (carvalho, macieira)', () => {
  it('muda vai em terra ou grama (não em terra arada nem na cidade) e passa pelos estágios até a adulta', () => {
    const w = new World(11);
    const [x, y] = grass(w);
    expect(ITEMS.oak_sapling.plants).toBe(Block.OAK_SAPLING);
    expect(w.canPlant(x, y, Block.OAK_SAPLING)).toBe(true);
    expect(w.canPlant(x, y, Block.STONE)).toBe(false); // só semente e mudas
    const t = w.town!.start;
    expect(w.canPlant(t[0], t[1], Block.OAK_SAPLING)).toBe(false); // cidade protegida
    expect(w.plant(x, y, Block.OAK_SAPLING)).toBe(true);
    expect(w.growingTreeCount).toBe(1);
    expect(w.canPlant(x, y, Block.OAK_SAPLING)).toBe(false); // ocupada
    expect(w.isWalkable(x, y)).toBe(false); // muda é sólida
    const seen = [w.getObject(x, y)];
    for (let i = 0; i < 10 && w.getObject(x, y) !== Block.OAK_TREE; i++) {
      w.tick(1, () => 0); // sorte sempre: um estágio por tick
      seen.push(w.getObject(x, y));
    }
    expect(seen).toEqual([Block.OAK_SAPLING, Block.OAK_YOUNG, Block.OAK_GROWING, Block.OAK_TREE]);
    expect(w.growingTreeCount).toBe(0); // adulta não cresce mais
    w.tick(1, () => 0.999); // sem sorte nada muda
    expect(w.getObject(x, y)).toBe(Block.OAK_TREE);
  });

  it('macieira: colher troca para a florida e as maçãs voltam com o tempo', () => {
    const w = new World(12);
    const [x, y] = grass(w);
    w.plant(x, y, Block.APPLE_SAPLING);
    w.tick(1, () => 0);
    w.tick(1, () => 0);
    expect(w.getObject(x, y)).toBe(Block.APPLE_TREE);
    expect(w.canPick(x, y)).toBe(true);
    expect(w.pick(x, y)).toBe(true);
    expect(w.getObject(x, y)).toBe(Block.APPLE_TREE_BARE);
    expect(w.canPick(x, y)).toBe(false);
    w.tick(1, () => 0);
    expect(w.getObject(x, y)).toBe(Block.APPLE_TREE);
    expect(pickDrops(() => 0)).toEqual([{ item: Item.APPLE, count: 3 }]);
  });

  it('o que cai: muda volta inteira; adulta dá toras e às vezes muda; macieira carregada solta maçãs', () => {
    expect(dropsFor(Block.OAK_SAPLING)).toEqual([{ item: Item.OAK_SAPLING, count: 1 }]);
    expect(dropsFor(Block.OAK_TREE, () => 0)).toEqual([{ item: Item.OAK_SAPLING, count: 1 }]);
    expect(dropsFor(Block.OAK_TREE, () => 0.9)).toEqual([]);
    expect(dropsFor(Block.APPLE_TREE, () => 0.9)).toEqual([{ item: Item.APPLE, count: 2 }]);
    expect(blockDrops(Block.APPLE_TREE, () => 0)[0].count).toBe(3);
    expect(blockDrops(Block.OAK_YOUNG)).toEqual([{ item: 'block:26', count: 1 }]);
    expect(blockDrops(Block.OAK_SAPLING)).toEqual([]);
    for (const id of Object.keys(TREE_NEXT).map(Number)) expect(isGrowingTree(id)).toBe(true);
  });

  it('salvamento: as árvores plantadas voltam a crescer depois de restaurar o chunk', () => {
    const w = new World(13);
    const [x, y] = grass(w);
    w.plant(x, y, Block.APPLE_SAPLING);
    const c = w.modifiedChunks()[0];
    const b = new World(13);
    b.restoreChunk(c.cx, c.cy, c.ground, c.levels);
    expect(b.growingTreeCount).toBe(1);
  });

  it('rede (ADR 0016): plantar muda e colher passam pelas regras do World', () => {
    const w = new World(14);
    const [x, y] = grass(w);
    expect(parseAction({ kind: 'plant', x, y, block: Block.OAK_SAPLING })).toEqual({ kind: 'plant', x, y, block: Block.OAK_SAPLING });
    expect(parseAction({ kind: 'plant', x, y, block: 'x' })).toBeNull();
    expect(applyAction(w, { kind: 'plant', x, y, block: Block.STONE })).toBe(false);
    expect(applyAction(w, { kind: 'plant', x, y, block: Block.APPLE_SAPLING })).toBe(true);
    expect(applyAction(w, { kind: 'pick', x, y })).toBe(false); // ainda é muda
    w.tick(1, () => 0);
    w.tick(1, () => 0);
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
