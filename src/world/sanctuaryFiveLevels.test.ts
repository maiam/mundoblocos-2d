import { describe, expect, it } from 'vitest';
import { Block } from './blocks';
import { WORLD_PROFILES } from './profiles';
import { World } from './world';
import { CHUNK_SIZE, MAX_STACK, SANCTUARY_MAX_STACK } from '../config';

describe('pilhas de cinco blocos apenas no Santuário', () => {
  it('empilha até o 5º bloco e não aceita o 6º', () => {
    const world = new World(42, WORLD_PROFILES.santuario);
    const [x, y] = world.findSpawn();
    expect(world.maxStack).toBe(SANCTUARY_MAX_STACK);
    for (let i = 0; i < SANCTUARY_MAX_STACK; i++) {
      expect(world.placementLevel(x, y, Block.GRASS_CELESTIAL)).toBe(i);
      expect(world.placeBlock(x, y, Block.GRASS_CELESTIAL)).toBe(true);
      expect(world.stackHeight(x, y)).toBe(i + 1);
    }
    expect(world.placeBlock(x, y, Block.GRASS_CELESTIAL)).toBe(false);
    expect(world.topBlock(x, y)?.level).toBe(4);
    expect(world.standHeight(x, y)).toBe(5);
    expect(world.breakBlock(x, y)).toBe(Block.GRASS_CELESTIAL);
    expect(world.stackHeight(x, y)).toBe(4);
  });
  it('salva e restaura cinco camadas em um chunk', () => {
    const world = new World(42, WORLD_PROFILES.santuario);
    const [x, y] = world.findSpawn();
    for (let i = 0; i < 5; i++) world.placeBlock(x, y, Block.GRASS_CELESTIAL);
    const cx = Math.floor(x / CHUNK_SIZE), cy = Math.floor(y / CHUNK_SIZE);
    const chunk = world.getChunk(cx, cy)!;
    expect(chunk.levels).toHaveLength(5);
    const restored = new World(42, WORLD_PROFILES.santuario);
    expect(restored.restoreChunk(cx, cy, chunk.ground, chunk.levels)).toBe(0);
    expect(restored.getLevel(x, y, 4)).toBe(Block.GRASS_CELESTIAL);
    expect(restored.stackHeight(x, y)).toBe(5);
  });
  it('mantém o Mundo principal com apenas duas camadas', () => {
    const main = new World(42, WORLD_PROFILES.principal);
    expect(main.maxStack).toBe(MAX_STACK);
    const [x, y] = main.outsideGate();
    const chunk = main.loadChunk(Math.floor(x / CHUNK_SIZE), Math.floor(y / CHUNK_SIZE));
    expect(chunk.levels).toHaveLength(2);
  });
});
