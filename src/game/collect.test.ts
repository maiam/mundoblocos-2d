import { describe, expect, it } from 'vitest';
import { Block, BLOCKS, MATERIALS, RETIRED_STONES } from '../world/blocks';
import { blockDrops, blockStack, breakDrops, canCraft, PROFESSIONS, RECIPES, toolCanBreak, toolStack } from '../world/items';
import { WORLD_PROFILES } from '../world/profiles';
import { mulberry32 } from '../world/random';
import { BAG_SLOTS, bagHasRoom, bagStacks, CARRY_LIMIT, canCarry, GRID_SLOTS, Hotbar, startingGrid } from './hotbar';
import { Inventory, STARTING_ITEMS } from './inventory';

describe('Coleta de materiais (Fase 3)', () => {
  it('quebrar devolve o material; árvore dá 2–3 toras; porta volta porta; plantas seguem as regras antigas', () => {
    const r = mulberry32(4);
    expect(blockDrops(Block.STONE, r)).toEqual([{ item: blockStack(Block.STONE), count: 1 }]);
    expect(blockDrops(Block.GRASS, r)).toEqual([{ item: blockStack(Block.GRASS), count: 1 }]);
    expect(blockDrops(Block.OAK_DOOR_OPEN, r)).toEqual([{ item: blockStack(Block.OAK_DOOR), count: 1 }]);
    for (let i = 0; i < 30; i++) {
      const [log] = blockDrops(Block.OAK_TREE, r);
      expect(log.item).toBe(blockStack(Block.OAK_LOG));
      expect([2, 3]).toContain(log.count);
      const [cherry] = blockDrops(Block.SAKURA_TREE, r); // a Cerejeira dá Tora de Cerejeira
      expect(cherry.item).toBe(blockStack(Block.CHERRY_LOG));
      expect([2, 3]).toContain(cherry.count);
      const [birch] = blockDrops(Block.BIRCH_TREE, r); // a Bétula dá Tora de Bétula
      expect(birch.item).toBe(blockStack(Block.BIRCH_LOG));
      expect([2, 3]).toContain(birch.count);
    }
    expect(blockDrops(Block.FLOWER, r)).toEqual([{ item: blockStack(Block.FLOWER), count: 1 }]); // a flor silvestre vira item (missão Ervas de cura, v0.93.116)
    expect(blockDrops(Block.CLOUD_SOLID, r)).toEqual([]); // Santuário não coleta
    expect(breakDrops('shovel', Block.WHEAT_15, true, r)).toEqual([]); // pá destrói planta sem drop
    expect(breakDrops(null, Block.STONE, false, r)).toEqual([]); // mundo sem coleta
  });

  it('começa com ferramentas, semente, trigo e 1 porta (na bolsa); grade de 9 itens', () => {
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
    inv.add(blockStack(Block.SAND));
    expect(grid.autoPlace(blockStack(Block.SAND))).toBe(8); // 9º espaço livre
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

  it('ao morrer perde tudo; só as ferramentas ficam', () => {
    const inv = new Inventory();
    inv.add(blockStack(Block.OAK_LOG), 12);
    inv.add('silk', 2);
    inv.dropOnDeath();
    expect(inv.count(blockStack(Block.OAK_LOG))).toBe(0);
    expect(inv.count(blockStack(Block.OAK_DOOR))).toBe(0);
    expect(inv.count('silk')).toBe(0);
    expect(inv.count('wheat_seed')).toBe(0);
    expect(inv.count('wheat')).toBe(0);
    for (const t of ['sword', 'hoe', 'pickaxe', 'shovel', 'axe'] as const) expect(inv.count(toolStack(t))).toBe(1);
    expect(inv.entries()).toHaveLength(5);
  });

  it('machado e picareta quebram a tenda (picareta por exceção; segue sem quebrar outras madeiras)', () => {
    for (const t of ['axe', 'pickaxe'] as const) {
      expect(toolCanBreak(t, Block.TENT)).toBe(true);
      expect(toolCanBreak(t, Block.TENT_PART)).toBe(true);
    }
    expect(toolCanBreak('pickaxe', Block.OAK_LOG)).toBe(false);
    expect(toolCanBreak('pickaxe', Block.CHEST)).toBe(false);
  });

  it('Santuário continua infinito: grade fixa com apenas 8 materiais do laboratório, sem bolsa', () => {
    const grid = new Hotbar(WORLD_PROFILES.santuario);
    expect(grid.dynamic).toBe(false);
    expect(grid.length).toBe(8);
    grid.assign(0, null);
    expect(grid.stack(0)).toBe(blockStack(Block.DIRT));
  });

  it('bolsa com 12 espaços (4 × 3 à direita) + 9 na mão: tipo novo só entra se houver lugar', () => {
    expect(BAG_SLOTS).toBe(12);
    expect(CARRY_LIMIT).toBe(21); // 9 na mão + 12 na bolsa
    const inv = new Inventory();
    const grid = new Hotbar(WORLD_PROFILES.principal);
    expect(bagStacks(inv, grid)).toEqual(['potato', 'tomato', 'carrot', blockStack(Block.OAK_DOOR)]); // hortaliças e porta começam na bolsa
    // Com espaços da mão livres (8º e 9º), tipo novo cabe (vai para a mão) mesmo com a bolsa cheia.
    let id = 200;
    while (bagStacks(inv, grid).length < BAG_SLOTS) inv.add(blockStack(id++ as never), 1);
    for (const b of [Block.STONE, Block.DIRT]) {
      expect(canCarry(inv, grid, blockStack(b))).toBe(true);
      inv.add(blockStack(b));
      grid.autoPlace(blockStack(b));
    }
    // Mão e bolsa cheias: tipo novo não cabe (fica no chão); pilha que ela já tem sempre soma.
    expect(inv.entries().length).toBe(CARRY_LIMIT);
    expect(canCarry(inv, grid, blockStack(Block.SAND))).toBe(false);
    expect(canCarry(inv, grid, 'wheat')).toBe(true);
    expect(bagHasRoom(inv, grid)).toBe(false); // não dá para guardar um item da mão na bolsa
    expect(bagStacks(inv, grid)).toHaveLength(BAG_SLOTS);
  });

  it('receitas do Construtor: tora → 2 tábuas, 4 tábuas → porta, 10 sedas → pano; pano + 10 tábuas + 4 presas → tenda', () => {
    const byId = Object.fromEntries(RECIPES.map((r) => [r.id, r]));
    expect(byId['oak-planks'].output).toEqual({ item: blockStack(Block.OAK_PLANKS), count: 2 });
    expect(byId['oak-door'].inputs).toEqual([{ item: blockStack(Block.OAK_PLANKS), count: 4 }]);
    expect(byId.tent.output.item).toBe(blockStack(Block.TENT));
    expect(RECIPES.every((r) => PROFESSIONS.some((p) => p.id === r.profession))).toBe(true);
    const inv = new Inventory({ [blockStack(Block.OAK_LOG)]: 1, silk: 10, fang: 4 });
    const c = (id: Parameters<typeof inv.count>[0]) => inv.count(id);
    expect(canCraft(byId['oak-planks'], c)).toBe(true);
    expect(canCraft(byId['oak-door'], c)).toBe(false);
    expect(byId['silk-cloth'].inputs).toEqual([{ item: 'silk', count: 10 }]);
    expect(byId['silk-cloth'].output).toEqual({ item: 'silk_cloth', count: 1 });
    expect(byId.tent.inputs).toEqual([{ item: 'silk_cloth', count: 1 }, { item: blockStack(Block.OAK_PLANKS), count: 10 }, { item: 'fang', count: 4 }]);
    expect(canCraft(byId['silk-cloth'], c)).toBe(true);
    expect(canCraft(byId.tent, c)).toBe(false);
    inv.add(blockStack(Block.OAK_PLANKS), 10);
    expect(canCraft(byId.tent, c)).toBe(false); // sedas soltas não servem: precisa do pano
    inv.take('silk', 10);
    inv.add('silk_cloth', 1);
    expect(canCraft(byId.tent, c)).toBe(true);
  });

  it('pedras: Pedra Bruta é a pedra do mundo; receitas 1:1 de Tijolo e Chão; picareta quebra, voltam como item', () => {
    expect(BLOCKS[Block.STONE].name).toBe('Pedra Bruta');
    for (const [id, out] of [['stone-brick', Block.STONE_BRICK], ['stone-floor', Block.STONE_FLOOR]] as const) {
      const r = RECIPES.find((x) => x.id === id)!;
      expect(r.inputs).toEqual([{ item: blockStack(Block.STONE), count: 1 }]);
      expect(r.output).toEqual({ item: blockStack(out), count: 1 });
    }
    const variants = [Block.STONE_COBBLE, Block.STONE_BRICK, Block.STONE_FLOOR, Block.STONE_SMOOTH, Block.STONE_POLISHED,
      Block.STONE_CRACKED, Block.STONE_BRICK_CRACKED];
    for (const v of variants) {
      expect(MATERIALS).toContain(v);
      expect(toolCanBreak('pickaxe', v)).toBe(true);
      expect(toolCanBreak('shovel', v)).toBe(false);
      expect(blockDrops(v)).toEqual([{ item: blockStack(v), count: 1 }]);
    }
    // Lisa e Polida ainda sem receita; as três pedras aposentadas (Irregular, Rachada, Tijolo Rachado) não têm receita,
    // mas seguem quebráveis e coletáveis (mundos salvos antigos).
    for (const v of [Block.STONE_SMOOTH, Block.STONE_POLISHED, ...RETIRED_STONES]) {
      expect(RECIPES.some((r) => r.output.item === blockStack(v))).toBe(false);
    }
  });
});

