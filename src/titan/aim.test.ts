import { describe, expect, it } from 'vitest';
import { FOV_DEG, rayThrough } from './aim';
import { lookVector } from './physics';

const dot = (a: number[], b: number[]): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

describe('mira no ponto do toque (ADR 0075)', () => {
  it('o centro da tela é o olhar; os raios têm comprimento 1', () => {
    for (const [yaw, pitch] of [[0, 0], [1.2, 0.4], [-2.5, -0.8], [3, 1.2]]) {
      const c = rayThrough(yaw, pitch, 0, 0, 2), l = lookVector(yaw, pitch);
      c.forEach((v, i) => expect(v).toBeCloseTo(l[i], 9));
      for (const [x, y] of [[1, 1], [-1, 0.3], [0.5, -1]]) expect(Math.hypot(...rayThrough(yaw, pitch, x, y, 2))).toBeCloseTo(1, 9);
    }
  });
  it('a borda de cima da tela está FOV/2 acima do olhar; direita e esquerda ficam do lado certo (yaw 0 olha para −Z: a direita é +X)', () => {
    const f = lookVector(0, 0), top = rayThrough(0, 0, 0, 1, 2);
    expect(Math.acos(dot(f, top)) * (180 / Math.PI)).toBeCloseTo(FOV_DEG / 2, 6); expect(top[1]).toBeGreaterThan(0);
    expect(rayThrough(0, 0, 1, 0, 2)[0]).toBeGreaterThan(0.5); expect(rayThrough(0, 0, -1, 0, 2)[0]).toBeLessThan(-0.5);
    expect(rayThrough(Math.PI / 2, 0, 1, 0, 2)[2]).toBeLessThan(-0.5); // virado para −X: a direita é −Z (como no movimento)
    expect(rayThrough(0, 0.5, 0, 0.2, 2)[1]).toBeGreaterThan(lookVector(0, 0.5)[1]); // ponto acima do centro sobe o raio, mesmo com o olhar inclinado
    expect(rayThrough(0, 0, 0, -1, 2)[1]).toBeLessThan(0);
  });
});
