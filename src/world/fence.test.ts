import { describe, expect, it } from 'vitest';
import { fenceParts, FencePiece } from '../render/fence';
import { applyAction } from './actions';
import { Block, BLOCKS, HOTBAR_BLOCKS, joinsFence } from './blocks';
import { blockDrops, blockStack, RECIPES, toolCanBreak } from './items';
import { WORLD_PROFILES } from './profiles';
import { World } from './world';

function freeRow(w: World): [number, number] {
  const [x, y] = w.outsideGate();
  for (let dx = -2; dx <= 3; dx++) while (w.topBlock(x + dx, y)) w.breakBlock(x + dx, y);
  return [x, y];
}

describe('Cerca de Madeira e portão', () => {
  it('são blocos de madeira do mundo principal (bolsa), não do Santuário', () => {
    expect(HOTBAR_BLOCKS).toEqual(expect.arrayContaining([Block.FENCE, Block.FENCE_GATE]));
    expect(HOTBAR_BLOCKS).not.toContain(Block.FENCE_GATE_OPEN);
    expect(WORLD_PROFILES.santuario.blocks).not.toContain(Block.FENCE);
    expect(BLOCKS[Block.FENCE].solid).toBe(true);
    expect(BLOCKS[Block.FENCE_GATE_OPEN].solid).toBe(false);
    expect(toolCanBreak('axe', Block.FENCE)).toBe(true);
    expect(toolCanBreak('pickaxe', Block.FENCE_GATE)).toBe(false);
    expect(joinsFence(Block.FENCE_GATE_OPEN)).toBe(true);
    expect(joinsFence(Block.OAK_PLANKS)).toBe(false);
  });

  it('receitas do Construtor: 2 Tábuas → 4 cercas; 4 Tábuas → 1 portão', () => {
    const fence = RECIPES.find((r) => r.id === 'wooden-fence')!;
    expect(fence.profession).toBe('builder');
    expect(fence.inputs).toEqual([{ item: blockStack(Block.OAK_PLANKS), count: 2 }]);
    expect(fence.output).toEqual({ item: blockStack(Block.FENCE), count: 4 });
    const gate = RECIPES.find((r) => r.id === 'fence-gate')!;
    expect(gate.inputs).toEqual([{ item: blockStack(Block.OAK_PLANKS), count: 4 }]);
    expect(gate.output).toEqual({ item: blockStack(Block.FENCE_GATE), count: 1 });
  });

  it('cerca bloqueia, não aceita nada por cima e volta como item', () => {
    const w = new World(7);
    const [x, y] = freeRow(w);
    expect(w.placeBlock(x, y, Block.FENCE)).toBe(true);
    expect(w.isWalkable(x, y)).toBe(false);
    expect(w.canPlace(x, y, Block.OAK_PLANKS)).toBe(false);
    expect(w.canPlace(x, y, Block.FENCE)).toBe(false);
    expect(blockDrops(Block.FENCE, () => 0)).toEqual([{ item: blockStack(Block.FENCE), count: 1 }]);
  });

  it('portão vai em qualquer célula livre, abre (passável) e fecha com a ação de porta', () => {
    const w = new World(7);
    const [x, y] = freeRow(w);
    w.placeBlock(x - 1, y, Block.FENCE);
    expect(w.placeBlock(x, y, Block.FENCE_GATE)).toBe(true);
    expect(w.isDoor(x, y)).toBe(true);
    expect(w.isWalkable(x, y)).toBe(false);
    expect(applyAction(w, { kind: 'door', x, y })).toBe(true);
    expect(w.getObject(x, y)).toBe(Block.FENCE_GATE_OPEN);
    expect(w.isDoorOpen(x, y)).toBe(true);
    expect(w.isWalkable(x, y)).toBe(true);
    w.toggleDoor(x, y);
    expect(w.getObject(x, y)).toBe(Block.FENCE_GATE);
    // Aberto ou fechado, volta como portão fechado.
    expect(blockDrops(Block.FENCE_GATE_OPEN, () => 0)).toEqual([{ item: blockStack(Block.FENCE_GATE), count: 1 }]);
    // A cerca não abre.
    expect(w.toggleDoor(x - 1, y)).toBe(false);
  });
});

describe('Emenda da cerca (render/fence)', () => {
  it('trecho reto usa a peça inteira; o resto, metades + poste grande', () => {
    expect(fenceParts(false, true, false, true).whole).toBe(FencePiece.Horizontal);
    expect(fenceParts(true, false, true, false).whole).toBe(FencePiece.Vertical);
    const corner = fenceParts(false, true, true, false); // canto: leste + sul
    expect(corner).toMatchObject({ whole: null, east: true, south: true, north: false, west: false, post: true });
    expect(fenceParts(false, false, false, false)).toMatchObject({ whole: null, post: true }); // solta
    expect(fenceParts(true, true, true, true)).toMatchObject({ whole: null, north: true, east: true, south: true, west: true, post: true });
    expect(fenceParts(true, true, false, true)).toMatchObject({ whole: null, post: true }); // "T"
  });

  it('Cercas de Bétula e de Cerejeira: blocos próprios que se emendam com a de Carvalho e com o portão, receita com a tábua da madeira', () => {
    for (const id of [Block.FENCE_BIRCH, Block.FENCE_CHERRY]) {
      expect(HOTBAR_BLOCKS).toContain(id);
      expect(WORLD_PROFILES.santuario.blocks).not.toContain(id);
      expect(BLOCKS[id].solid).toBe(true);
      expect(toolCanBreak('axe', id)).toBe(true);
      expect(joinsFence(id)).toBe(true);
    }
    const birch = RECIPES.find((r) => r.id === 'birch-fence')!;
    expect(birch.inputs).toEqual([{ item: blockStack(Block.BIRCH_PLANKS), count: 2 }]);
    expect(birch.output).toEqual({ item: blockStack(Block.FENCE_BIRCH), count: 4 });
    const cherry = RECIPES.find((r) => r.id === 'cherry-fence')!;
    expect(cherry.inputs).toEqual([{ item: blockStack(Block.CHERRY_PLANKS), count: 2 }]);
    expect(cherry.output).toEqual({ item: blockStack(Block.FENCE_CHERRY), count: 4 });
  });
});
