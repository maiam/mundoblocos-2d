import { describe, expect, it } from 'vitest';
import { BEDROCK_Y, CHUNK_SIZE } from '../config';
import { Block, blockDef } from './blocks';
import { toChunk, toLocal } from './coords';
import { WorldGenerator } from './generator';
import { World } from './world';

describe('coords', () => {
  it('converte negativos corretamente', () => {
    expect(toChunk(-1)).toBe(-1);
    expect(toLocal(-1)).toBe(CHUNK_SIZE - 1);
    expect(toChunk(16)).toBe(1);
    expect(toLocal(16)).toBe(0);
    expect(toChunk(-16)).toBe(-1);
    expect(toLocal(-17)).toBe(15);
  });
});

describe('WorldGenerator', () => {
  it('é determinístico para a mesma seed', () => {
    const a = new WorldGenerator(1234);
    const b = new WorldGenerator(1234);
    const ca = new Uint8Array(256);
    const cb = new Uint8Array(256);
    for (const [cx, cy] of [[0, 0], [-3, 1], [7, -1], [-40, 4]]) {
      a.generateChunk(cx, cy, ca);
      b.generateChunk(cx, cy, cb);
      expect(Array.from(ca)).toEqual(Array.from(cb));
    }
  });

  it('seeds diferentes geram terrenos diferentes', () => {
    const a = new WorldGenerator(1);
    const b = new WorldGenerator(2);
    let diff = 0;
    for (let x = 0; x < 200; x++) if (a.surfaceY(x) !== b.surfaceY(x)) diff++;
    expect(diff).toBeGreaterThan(50);
  });

  it('chunk gerado bate com blockAt (bordas contínuas)', () => {
    const g = new WorldGenerator(99);
    const out = new Uint8Array(256);
    g.generateChunk(-2, 0, out);
    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        expect(out[ly * CHUNK_SIZE + lx]).toBe(g.blockAt(-32 + lx, ly));
      }
    }
  });

  it('tem rocha-mãe no fundo, ar no céu e superfície sólida', () => {
    const g = new WorldGenerator(5);
    for (let x = -50; x < 50; x++) {
      expect(g.blockAt(x, BEDROCK_Y)).toBe(Block.BEDROCK);
      expect(g.blockAt(x, -100)).toBe(Block.AIR);
      expect(blockDef(g.blockAt(x, g.surfaceY(x))).solid).toBe(true);
    }
  });

  it('gera múltiplos biomas ao longo do eixo x', () => {
    const g = new WorldGenerator(42);
    const seen = new Set<string>();
    for (let x = -6000; x < 6000; x += 20) seen.add(g.biomeAt(x).key);
    expect(seen.size).toBeGreaterThanOrEqual(4);
  });
});

describe('World', () => {
  it('edita blocos e marca chunk como modificado', () => {
    const w = new World(7);
    const x = -5;
    const y = w.generator.surfaceY(x) + 2;
    expect(w.breakBlock(x, y)).not.toBeNull();
    expect(blockDef(w.getBlock(x, y)).solid).toBe(false);
    const c = w.getChunk(toChunk(x), toChunk(y))!;
    expect(c.modified).toBe(true);
    expect(w.placeBlock(x, y, Block.BRICK)).toBe(true);
    expect(w.getBlock(x, y)).toBe(Block.BRICK);
  });

  it('não quebra rocha-mãe nem coloca em bloco sólido', () => {
    const w = new World(7);
    expect(w.breakBlock(0, BEDROCK_Y)).toBeNull();
    expect(w.placeBlock(0, BEDROCK_Y, Block.STONE)).toBe(false);
  });

  it('chunks modificados não são descarregados', () => {
    const w = new World(3);
    w.loadChunk(0, 0);
    w.loadChunk(50, 0);
    w.setBlock(50 * CHUNK_SIZE, 0, Block.BRICK);
    w.loadChunk(60, 0);
    const removed = w.unloadFar({ cx0: 0, cy0: 0, cx1: 0, cy1: 0 });
    expect(removed).toContain('60,0');
    expect(removed).not.toContain('50,0');
    expect(w.getChunk(50, 0)).toBeDefined();
  });

  it('ensureChunks respeita o orçamento por frame', () => {
    const w = new World(3);
    const rect = { cx0: -2, cy0: -2, cx1: 2, cy1: 2 };
    expect(w.ensureChunks(rect, 4)).toBe(4);
    expect(w.loadedCount).toBe(4);
    while (w.ensureChunks(rect, 4) > 0);
    expect(w.loadedCount).toBe(25);
  });
});
