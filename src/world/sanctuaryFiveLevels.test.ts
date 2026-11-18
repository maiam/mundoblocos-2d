import { describe, expect, it } from 'vitest';
import { Block } from './blocks';
import { WORLD_PROFILES } from './profiles';
import { World } from './world';
import { CHUNK_SIZE, MAX_STACK, SANCTUARY_MAX_STACK } from '../config';

/** Santuário sem as camadas de terreno (só o chão): a base dos testes de mecânica (colocar, empilhar, quebrar), que contam níveis a partir do chão. */
const EMPTY = { ...WORLD_PROFILES.santuario, terrain: { kind: 'flat' as const, ground: Block.ISO_G_GRASS } };

describe('pilhas de oito blocos apenas no Santuário (v0.93.152; antes 5)', () => {
  it('empilha até o 8º bloco e não aceita o 9º', () => {
    const world = new World(42, EMPTY);
    const [x, y] = world.findSpawn();
    expect(world.maxStack).toBe(SANCTUARY_MAX_STACK);
    // Terreno plano e vazio (ADR 0036): nada construído no spawn.
    expect(world.stackHeight(x, y)).toBe(0);
    for (let i = 0; i < SANCTUARY_MAX_STACK; i++) {
      expect(world.placementLevel(x, y, Block.ISO_G_GRASS)).toBe(i);
      expect(world.placeBlock(x, y, Block.ISO_G_GRASS)).toBe(true);
      expect(world.stackHeight(x, y)).toBe(i + 1);
    }
    expect(world.placeBlock(x, y, Block.ISO_G_GRASS)).toBe(false);
    expect(world.topBlock(x, y)?.level).toBe(SANCTUARY_MAX_STACK - 1);
    expect(world.standHeight(x, y)).toBe(SANCTUARY_MAX_STACK);
    expect(world.breakBlock(x, y)).toBe(Block.ISO_G_GRASS);
    expect(world.stackHeight(x, y)).toBe(SANCTUARY_MAX_STACK - 1);
  });
  it('salva e restaura as camadas de um chunk (e um chunk salvo com 5 camadas continua abrindo)', () => {
    const world = new World(42, EMPTY);
    const [x, y] = world.findSpawn();
    for (let i = 0; i < SANCTUARY_MAX_STACK; i++) world.placeBlock(x, y, Block.ISO_G_GRASS);
    const cx = Math.floor(x / CHUNK_SIZE), cy = Math.floor(y / CHUNK_SIZE);
    const chunk = world.getChunk(cx, cy)!;
    expect(chunk.levels).toHaveLength(SANCTUARY_MAX_STACK);
    const restored = new World(42, EMPTY);
    expect(restored.restoreChunk(cx, cy, chunk.ground, chunk.levels)).toBe(0);
    expect(restored.getLevel(x, y, SANCTUARY_MAX_STACK - 1)).toBe(Block.ISO_G_GRASS);
    expect(restored.stackHeight(x, y)).toBe(SANCTUARY_MAX_STACK);
    // Salvamento antigo (5 camadas): as 5 camadas voltam e as 3 novas ficam vazias.
    const old = new World(42, EMPTY);
    expect(old.restoreChunk(cx, cy, chunk.ground, chunk.levels.slice(0, 5))).toBe(0);
    expect(old.stackHeight(x, y)).toBe(5);
  });
  it('o Mundo principal usa blocos de 1/4 (4 camadas)', () => {
    const main = new World(42, WORLD_PROFILES.principal);
    expect(main.maxStack).toBe(MAX_STACK);
    const [x, y] = main.outsideGate();
    const chunk = main.loadChunk(Math.floor(x / CHUNK_SIZE), Math.floor(y / CHUNK_SIZE));
    expect(chunk.levels).toHaveLength(4);
    expect(main.cubeLevels).toBe(4);
    expect(new World(42, EMPTY).cubeLevels).toBe(1);
  });
});
