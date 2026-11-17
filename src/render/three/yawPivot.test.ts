import { describe, expect, it } from 'vitest';
import { yawPivotOrigin } from './chunkSprites';

describe('sprite girado em volta do meio da base (câmera Isométrica)', () => {
  it('o meio da base não sai do lugar, qualquer que seja o giro', () => {
    for (const yaw of [0, Math.PI / 4, -Math.PI / 4, Math.PI / 2]) {
      const left = 10.2, baseZ = 33.7, half = 1.7;
      const [ox, oz] = yawPivotOrigin(left, baseZ, half, yaw);
      // meio do plano = origem + Ry(yaw)·(half, 0, 0) = (ox + half·cos, oz − half·sin)
      expect(ox + half * Math.cos(yaw)).toBeCloseTo(left + half, 9);
      expect(oz - half * Math.sin(yaw)).toBeCloseTo(baseZ, 9);
    }
  });
  it('sem giro, a origem é o canto esquerdo (como sempre)', () => {
    expect(yawPivotOrigin(4, 9, 1, 0)).toEqual([4, 9]);
  });
});
