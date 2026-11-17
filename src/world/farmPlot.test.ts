import { describe, expect, it } from 'vitest';
import { Block } from './blocks';
import { PLOT_H, PLOT_W, tilledIn } from './farmPlot';
import { World } from './world';

describe('terreno de preparo da missão 07', () => {
  it('existe, é determinístico, tem o tamanho certo e fica fora das áreas protegidas', () => {
    for (const seed of [1, 42, 987654]) {
      const a = new World(seed), b = new World(seed);
      expect(a.farmPlot).not.toBeNull();
      expect(a.farmPlot).toEqual(b.farmPlot);
      const p = a.farmPlot!;
      expect(p.x1 - p.x0 + 1).toBe(PLOT_W);
      expect(p.y1 - p.y0 + 1).toBe(PLOT_H);
      for (let y = p.y0; y <= p.y1; y++) for (let x = p.x0; x <= p.x1; x++) expect(a.isProtected(x, y)).toBe(false);
    }
  });

  it('conta a terra arada dentro do terreno', () => {
    const w = new World(42);
    expect(tilledIn(w, w.farmPlot!)).toBe(0);
    expect(Block.TILLED).toBeDefined();
  });
});
