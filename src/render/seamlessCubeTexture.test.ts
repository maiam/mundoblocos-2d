import { describe, expect, it } from 'vitest';
import { seamlessPixelEdges } from './seamlessCubeTexture';

function pixels(w: number, h: number): Uint8ClampedArray {
  const p = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const n = (y * w + x) * 4;
    p[n] = 20 + x * 7;
    p[n + 1] = 40 + y * 7;
    p[n + 2] = 75 + x * 2 + y;
    p[n + 3] = 255;
  }
  return p;
}

const at = (data: Uint8ClampedArray, w: number, x: number, y: number, channel: number) =>
  data[(y * w + x) * 4 + channel];

describe('Santuário — texturas sem marcas entre células', () => {
  it('cria bordas repetíveis em ambos os eixos, sem alterar a textura fornecida', () => {
    const w = 16, h = 16, original = pixels(w, h);
    const before = new Uint8ClampedArray(original);
    const processed = seamlessPixelEdges(original, w, h);
    expect(original).toEqual(before);
    for (let i = 0; i < h; i++) for (let channel = 0; channel < 4; channel++) {
      expect(at(processed, w, 0, i, channel)).toBe(at(processed, w, w - 1, i, channel));
      expect(at(processed, w, i, 0, channel)).toBe(at(processed, w, i, h - 1, channel));
    }
    for (let channel = 0; channel < 4; channel++) {
      expect(at(processed, w, 8, 8, channel)).toBe(at(before, w, 8, 8, channel));
    }
  });

  it('as laterais da grama unem esquerda/direita sem misturar a franja verde superior com a terra inferior', () => {
    const w = 16, h = 16, original = pixels(w, h);
    const processed = seamlessPixelEdges(original, w, h, 'horizontal');
    for (let y = 0; y < h; y++) {
      expect(at(processed, w, 0, y, 0)).toBe(at(processed, w, w - 1, y, 0));
    }
    expect(at(processed, w, 8, 0, 1)).toBe(at(original, w, 8, 0, 1));
    expect(at(processed, w, 8, 15, 1)).toBe(at(original, w, 8, 15, 1));
    expect(at(processed, w, 8, 0, 1)).not.toBe(at(processed, w, 8, 15, 1));
  });

  it('não altera arrays com dimensão inválida', () => {
    const source = new Uint8ClampedArray([10, 20, 30, 255]);
    expect(seamlessPixelEdges(source, 0, 1)).toEqual(source);
    expect(seamlessPixelEdges(source, 1, 1)).toEqual(source);
  });
});
