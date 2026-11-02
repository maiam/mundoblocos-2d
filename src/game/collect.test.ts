import { describe, expect, it } from 'vitest';
import { Block } from '../world/blocks';
import { blockDrops, blockStack, breakDrops, toolStack } from '../world/items';
import { WORLD_PROFILES } from '../world/profiles';
import { mulberry32 } from '../world/random';
import { GRID_SLOTS, Hotbar, startingGrid } from './hotbar';
import { Inventory, STARTING_ITEMS } from './inventory';

describe('Coleta de materiais (Fase 3)', () => {
  it('quebrar devolve o material; árvore dá 2–3 toras; porta volta porta; plantas seguem as regras antigas', () => {
    const r = mulberry32(4);
    expect(blockDrops(Block.STONE, r)).toEqual([{ item: blockStack(Block.STONE), count: 1 }]);
    expect(blockDrops(Block.GRASS, r)).toEqual([{ item: blockStack(Block.GRASS), count: 1 }]);
    expect(blockDrops(Block.OAK_DOOR_OPEN, r)).toEqual([{ item: blockStack(Block.OAK_DOOR), count: 1 }]);
    for (let i = 0; i < 30; i++) {
      const [log] = blockDrops(Block.SAKURA_TREE, r);
      expect(log.item).toBe(blockStack(Block.OAK_LOG));
      expect([2, 3]).toContain(log.count);
    }
    expect(blockDrops(Block.FLOWER, r)).toEqual([]);
    expect(blockDrops(Block.CLOUD_SOLID, r)).toEqual([]); // Santuário não coleta
    expect(breakDrops('shovel', Block.WHEAT_15, true, r)).toEqual([]); // pá destrói planta sem drop
    expect(breakDrops(null, Block.STONE, false, r)).toEqual([]); // mundo sem coleta
  });

  it('começa com ferramentas, semente, trigo e 1 porta (na bolsa); grade 8 espaços + bolsa', () => {
    const inv = new Inventory();
    expect(inv.count(toolStack('pickaxe'))).toBe(1);
    expect(inv.count(blockStack(Block.OAK_DOOR))).toBe(1);
    expect(inv.count(blockStack(Block.DIRT))).toBe(0);
    expect(STARTING_ITEMS.wheat_seed).toBe(5);
    const grid = new Hotbar(WORLD_PROFILES.principal);
    expect(grid.length).toBe(GRID_SLOTS);
    expect(grid.layout()).toEqual(startingGrid());
    expect(grid.indexOf(blockStack(Block.OAK_DOOR))).toBe(-1);
  });

  it('coletado vai para a grade (se já está nela ou há espaço livre), senão bolsa; troca e libera espaço vazio', () => {
    const inv = new Inventory();
    const grid = new Hotbar(WORLD_PROFILES.principal);
    inv.add(blockStack(Block.DIRT), 3);
    expect(grid.autoPlace(blockStack(Block.DIRT))).toBe(7); // 8º espaço livre
    inv.add(blockStack(Block.STONE));
    expect(grid.autoPlace(blockStack(Block.STONE))).toBe(-1); // grade cheia → bolsa
    expect(grid.autoPlace(blockStack(Block.DIRT))).toBe(7); // já está na grade: soma lá
    grid.assign(0, blockStack(Block.STONE)); // espada volta para a bolsa
    expect(grid.stack(0)).toBe(blockStack(Block.STONE));
    expect(grid.indexOf(toolStack('sword'))).toBe(-1);
    grid.assign(7, blockStack(Block.STONE)); // já estava no 0: troca de lugar
    expect(grid.stack(7)).toBe(blockStack(Block.STONE));
    expect(grid.stack(0)).toBe(blockStack(Block.DIRT));
    inv.take(blockStack(Block.STONE));
    grid.prune(inv);
    expect(grid.stack(7)).toBeNull(); // acabou → espaço livre
  });

  it('ao morrer perde todos os materiais; ferramentas, itens e espólios ficam', () => {
    const inv = new Inventory();
    inv.add(blockStack(Block.OAK_LOG), 12);
    inv.add('silk', 2);
    inv.dropMaterials();
    expect(inv.count(blockStack(Block.OAK_LOG))).toBe(0);
    expect(inv.count(blockStack(Block.OAK_DOOR))).toBe(0);
    expect(inv.count('silk')).toBe(2);
    expect(inv.count(toolStack('sword'))).toBe(1);
    expect(inv.count('wheat_seed')).toBe(5);
  });

  it('Santuário continua infinito: grade fixa com os 18 blocos, sem bolsa', () => {
    const grid = new Hotbar(WORLD_PROFILES.santuario);
    expect(grid.dynamic).toBe(false);
    expect(grid.length).toBe(18);
    grid.assign(0, null);
    expect(grid.stack(0)).toBe(blockStack(Block.CLOUD_SOLID));
  });
});
