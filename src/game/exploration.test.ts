import { describe, expect, it } from 'vitest';
import { CHUNK_SIZE } from '../config';
import { exploredBounds, fitScale, MAP_MAX_SCALE, MAP_MIN_SCALE } from '../render/worldMap';
import { Exploration } from './exploration';

describe('névoa do minimapa (Exploration)', () => {
  it('revela um círculo em volta do jogador, inclusive em coordenadas negativas', () => {
    const e = new Exploration();
    expect(e.revealAround(-1, -1, 3)).toBe(true);
    expect(e.isExplored(-1, -1)).toBe(true);
    expect(e.isExplored(-4, -1)).toBe(true); // borda do raio
    expect(e.isExplored(-4, -4)).toBe(false); // canto fora do círculo
    expect(e.isExplored(2, -1)).toBe(true); // atravessa a borda do chunk
    const n = e.count;
    expect(e.revealAround(-1, -1, 3)).toBe(false); // nada novo
    expect(e.count).toBe(n);
    expect(e.chunk(-1, -1)!.version).toBeGreaterThan(0);
    expect(e.chunk(5, 5)).toBeNull();
  });

  it('ida e volta pelo salvamento; item corrompido é ignorado', () => {
    const e = new Exploration();
    e.revealAround(40, -20, 6);
    const saved = JSON.parse(JSON.stringify(e.toSave()));
    const b = new Exploration();
    b.load([...saved, { cx: 9, cy: 9, bits: '###' }, { cx: 1.5, cy: 0, bits: saved[0].bits }]);
    expect(b.count).toBe(e.count);
    expect(b.isExplored(40, -20)).toBe(true);
    expect(b.isExplored(40, -30)).toBe(false);
  });
});

describe('Mapa grande (v0.93.62)', () => {
  it('chunkCoords lista só os chunks com algo descoberto', () => {
    const e = new Exploration();
    expect(e.chunkCoords()).toEqual([]);
    e.reveal(1, 1);
    e.reveal(CHUNK_SIZE * 2 + 3, -1);
    expect(e.chunkCoords().sort((a, b) => a.cx - b.cx)).toEqual([{ cx: 0, cy: 0 }, { cx: 2, cy: -1 }]);
  });
});

describe('Enquadramento do mapa grande', () => {
  it('exploredBounds cobre os chunks descobertos; sem chunks, null', () => {
    expect(exploredBounds([])).toBeNull();
    expect(exploredBounds([{ cx: -1, cy: 2 }, { cx: 3, cy: 0 }])).toEqual({
      x0: -CHUNK_SIZE, y0: 0, x1: 4 * CHUNK_SIZE, y1: 3 * CHUNK_SIZE,
    });
  });

  it('fitScale enquadra com margem e respeita os limites de zoom', () => {
    const small = { x0: 0, y0: 0, x1: CHUNK_SIZE, y1: CHUNK_SIZE };
    expect(fitScale(small, 800, 500)).toBeLessThanOrEqual(MAP_MAX_SCALE);
    const huge = { x0: 0, y0: 0, x1: 1e6, y1: 1e6 };
    expect(fitScale(huge, 800, 500)).toBe(MAP_MIN_SCALE);
    const mid = { x0: 0, y0: 0, x1: 20 * CHUNK_SIZE, y1: 10 * CHUNK_SIZE };
    const s = fitScale(mid, 800, 500);
    // O que foi enquadrado cabe na tela.
    expect((mid.x1 + 2 * CHUNK_SIZE) * s).toBeLessThanOrEqual(800 + 1e-6);
    expect((mid.y1 + 2 * CHUNK_SIZE) * s).toBeLessThanOrEqual(500 + 1e-6);
  });
});
