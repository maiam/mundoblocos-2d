import { describe, expect, it } from 'vitest';
import { CHUNK_SIZE } from '../config';
import { Block } from './blocks';
import { WORLD_PROFILES } from './profiles';
import { SanctuarySeedGenerator, SANCTUARY_LEVEL_COVERAGE } from './sanctuarySeedGenerator';
import { World } from './world';

const profile = WORLD_PROFILES.santuario;
const bounds = profile.bounds!;
const x0 = bounds.cx0 * CHUNK_SIZE, x1 = (bounds.cx1 + 1) * CHUNK_SIZE;
const y0 = bounds.cy0 * CHUNK_SIZE, y1 = (bounds.cy1 + 1) * CHUNK_SIZE;

function heights(world: World): number[] {
  const out: number[] = [];
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    out.push(world.standHeight(x, y)!);
  }
  return out;
}

describe('Santuário — geração determinística em cinco níveis', () => {
  it('cobre precisamente 100%, 50%, 30%, 10% e 5% do mapa, sem blocos flutuantes', () => {
    const world = new World(2026, profile);
    expect(world.generator).toBeInstanceOf(SanctuarySeedGenerator);
    const counts = heights(world);
    const size = counts.length;
    expect(size).toBe(80 * 32);
    for (let i = 0; i < SANCTUARY_LEVEL_COVERAGE.length; i++) {
      expect(counts.filter(height => height >= i + 1).length)
        .toBe(Math.round(size * SANCTUARY_LEVEL_COVERAGE[i]));
    }
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const height = world.standHeight(x, y)!;
      for (let level = 0; level < height; level++) {
        expect(world.getLevel(x, y, level)).toBe(level === height - 1 ? Block.GRASS : Block.DIRT);
      }
      for (let level = height; level < 5; level++) expect(world.getLevel(x, y, level)).toBe(Block.AIR);
    }
    expect(world.modifiedChunks()).toHaveLength(0);
  });

  it('repete a mesma paisagem por seed, independentemente da ordem de carregamento de chunks', () => {
    const first = new World(1234, profile);
    const before = heights(first);
    const second = new World(1234, profile);
    const third = new World(5678, profile);
    const loaded = second.loadChunk(bounds.cx1, bounds.cy1);
    expect(loaded.modified).toBe(false);
    expect(loaded.levels).toHaveLength(5);
    expect(heights(second)).toEqual(before);
    expect(heights(third)).not.toEqual(before);
    expect(second.modifiedChunks()).toHaveLength(0);
  });

  it('conserva uma área inicial plana e caminhável sobre o topo dos cubos', () => {
    const world = new World(4321, profile);
    const [sx, sy] = world.findSpawn();
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      expect(world.standHeight(sx + dx, sy + dy)).toBe(1);
      expect(world.getObject(sx + dx, sy + dy)).toBe(Block.GRASS);
    }
    const chunk = world.loadChunk(Math.floor(sx / CHUNK_SIZE), Math.floor(sy / CHUNK_SIZE));
    expect(chunk.modified).toBe(false);
    expect(world.standHeight(sx, sy)).toBe(1);
  });
});
