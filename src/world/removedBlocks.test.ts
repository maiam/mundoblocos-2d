import { describe, expect, it } from 'vitest';
import { captureSave, migrate } from '../game/save';
import { Entities } from '../game/entities';
import { Inventory } from '../game/inventory';
import { Exploration } from '../game/exploration';
import { Player } from '../game/player';
import { parseBag, parseChestSlots } from '../net/protocol';
import { Block, BLOCKS, blockDef, HOTBAR_BLOCKS, isRemovedBlock, isRemovedStack, REMOVED_BLOCK_FIRST, REMOVED_BLOCK_LAST } from './blocks';
import { blockStack, RECIPES } from './items';
import { mulberry32 } from './random';
import { World } from './world';

/** Paredes saíram do jogo (dono do produto, 2026-11-08): ids 210–225 viram vazio em tudo que vem de dados antigos. */
describe('Blocos removidos (antigas paredes)', () => {
  it('não têm definição, receita nem lugar na hotbar, e ninguém os coloca', () => {
    for (let id = REMOVED_BLOCK_FIRST; id <= REMOVED_BLOCK_LAST; id++) {
      expect(isRemovedBlock(id)).toBe(true);
      expect(BLOCKS[id]).toBeUndefined();
      expect(blockDef(id).id).toBe(Block.AIR);
      expect(HOTBAR_BLOCKS).not.toContain(id);
    }
    expect(isRemovedBlock(REMOVED_BLOCK_FIRST - 1)).toBe(false);
    expect(isRemovedBlock(REMOVED_BLOCK_LAST + 1)).toBe(false);
    expect(RECIPES.some((r) => r.id.startsWith('wall-'))).toBe(false);
    const w = new World(7);
    const [x, y] = w.outsideGate();
    expect(w.placeBlock(x + 3, y + 4, REMOVED_BLOCK_FIRST)).toBe(false);
    expect(w.getObject(x + 3, y + 4)).toBe(Block.AIR);
  });

  it('mapa salvo com paredes: viram vazio em todos os níveis', () => {
    const w = new World(7);
    const [gx, gy] = w.outsideGate();
    const cx = Math.floor((gx + 3) / 16);
    const cy = Math.floor((gy + 4) / 16);
    const ground = new Uint8Array(256).fill(Block.GRASS);
    const level0 = new Uint8Array(256);
    const level1 = new Uint8Array(256);
    level0[5] = REMOVED_BLOCK_FIRST;
    level0[6] = Block.STONE;
    level1[5] = REMOVED_BLOCK_LAST;
    const target = new World(7);
    target.restoreChunk(cx, cy, ground, [level0, level1, new Uint8Array(256)]);
    const x0 = cx * 16;
    const y0 = cy * 16;
    expect(target.getLevel(x0 + 5, y0, 0)).toBe(Block.AIR);
    expect(target.getLevel(x0 + 5, y0, 1)).toBe(Block.AIR);
    expect(target.getLevel(x0 + 6, y0, 0)).toBe(Block.STONE); // o que continua no jogo, continua
  });

  it('pilhas de parede somem da bolsa, da grade e dos baús do salvamento e da rede', () => {
    expect(isRemovedStack(blockStack(REMOVED_BLOCK_FIRST))).toBe(true);
    expect(isRemovedStack(blockStack(Block.STONE))).toBe(false);
    expect(isRemovedStack('wheat')).toBe(false);
    // salvamento local
    const world = new World(42);
    const player = new Player(1, 1);
    const entities = new Entities(player, mulberry32(1));
    const inventory = new Inventory();
    const d = captureSave({ world, player, entities, inventory, exploration: new Exploration(), time: 0.5, selected: null, hotbar: null });
    const dirty = {
      ...d,
      inventory: { ...d.inventory, [blockStack(REMOVED_BLOCK_FIRST)]: 3, [blockStack(Block.STONE)]: 2 },
      hotbar: [blockStack(REMOVED_BLOCK_LAST), blockStack(Block.STONE), null],
      chests: [{ x: 1, y: 1, slots: [{ item: blockStack(REMOVED_BLOCK_FIRST), count: 2 }, { item: blockStack(Block.STONE), count: 1 }, null] }],
    };
    const clean = migrate(dirty)!;
    expect(clean.inventory[blockStack(REMOVED_BLOCK_FIRST)]).toBeUndefined();
    expect(clean.inventory[blockStack(Block.STONE)]).toBe(2);
    expect(clean.hotbar).toEqual([null, blockStack(Block.STONE), null]);
    expect(clean.chests![0].slots).toEqual([null, { item: blockStack(Block.STONE), count: 1 }, null]);
    // rede (bolsa da sala e baú)
    const bag = parseBag({ inventory: { [blockStack(REMOVED_BLOCK_FIRST)]: 2, wheat: 3 }, hotbar: [blockStack(REMOVED_BLOCK_FIRST), 'wheat'], x: 1, y: 2 });
    expect(bag).toEqual({ inventory: { wheat: 3 }, hotbar: [null, 'wheat'], x: 1, y: 2 });
    const slots = parseChestSlots([{ item: blockStack(REMOVED_BLOCK_FIRST), count: 1 }, ...Array(26).fill(null)]);
    expect(slots).not.toBeNull();
    expect(slots![0]).toBeNull();
  });
});
