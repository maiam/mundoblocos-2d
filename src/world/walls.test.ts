import { describe, expect, it } from 'vitest';
import { Block, BLOCKS, HOTBAR_BLOCKS, isWall, WALL_MATERIALS, WALLS } from './blocks';
import { blockDrops, blockStack, RECIPES, toolCanBreak } from './items';
import { WORLD_PROFILES } from './profiles';
import { World } from './world';

describe('Paredes', () => {
  it('uma por material, no mundo principal (não no Santuário); a ferramenta é a do material', () => {
    expect(WALLS).toHaveLength(16);
    expect(WALL_MATERIALS).toHaveLength(16);
    for (const id of WALLS) {
      expect(isWall(id)).toBe(true);
      expect(BLOCKS[id].shape).toBe('wall');
      expect(HOTBAR_BLOCKS).toContain(id);
      expect(WORLD_PROFILES.santuario.blocks).not.toContain(id);
      const m = WALL_MATERIALS[WALLS.indexOf(id)];
      for (const tool of ['pickaxe', 'axe', 'shovel', 'hoe'] as const) expect(toolCanBreak(tool, id)).toBe(toolCanBreak(tool, m));
      expect(blockDrops(id, () => 0)).toEqual([{ item: blockStack(id), count: 1 }]);
    }
    expect(BLOCKS[WALLS[2]].name).toBe('Parede de Tijolo');
    expect(BLOCKS[WALLS[13]].name).toBe('Parede de Pedra com Musgo');
    expect(toolCanBreak('axe', WALLS[15])).toBe(true); // tábuas: machado
    expect(toolCanBreak('pickaxe', WALLS[15])).toBe(false);
    expect(toolCanBreak('shovel', WALLS[8])).toBe(true); // terra: pá
    expect(toolCanBreak('pickaxe', WALLS[0])).toBe(true);
    expect(isWall(WALLS[15] + 1)).toBe(false);
    expect(isWall(Block.STONE)).toBe(false);
  });

  it('receita: 3 blocos do material → 1 parede do mesmo material', () => {
    WALL_MATERIALS.forEach((material, i) => {
      const r = RECIPES.find((x) => x.id === `wall-${i}`)!;
      expect(r.profession).toBe('builder');
      expect(r.inputs).toEqual([{ item: blockStack(material), count: 3 }]);
      expect(r.output).toEqual({ item: blockStack(WALLS[i]), count: 1 });
    });
  });

  it('bloco se sobe e empilha; parede não: bloqueia e não aceita nada em cima', () => {
    const w = new World(7);
    const [gx, gy] = w.outsideGate();
    const x = gx + 3;
    const y = gy + 4;
    for (let dx = 0; dx < 2; dx++) while (w.topBlock(x + dx, y)) w.breakBlock(x + dx, y);
    expect(w.placeBlock(x, y, Block.STONE)).toBe(true);
    expect(w.standHeight(x, y)).toBe(1); // bloco: dá para subir
    expect(w.placeBlock(x + 1, y, WALLS[0])).toBe(true);
    expect(w.standHeight(x + 1, y)).toBeNull(); // parede: não se sobe
    expect(w.canPlace(x + 1, y, Block.STONE)).toBe(false);
    expect(w.canPlace(x + 1, y, WALLS[1])).toBe(false);
    expect(w.canPlace(x, y, WALLS[0])).toBe(false); // nem parede em cima de bloco
  });
});
