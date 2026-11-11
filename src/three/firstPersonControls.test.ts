import { describe, expect, it } from 'vitest';
import { FP_EYE_HEIGHT, FP_FOV_DEGREES, FP_REACH, FP_PITCH_LIMIT, firstPersonLook, firstPersonMovement, firstPersonForward, firstPersonHitCell } from './firstPersonControls';

describe('Laboratório V3 — câmera em primeira pessoa', () => {
  it('tem campo de visão e alcance configurados para construção próxima', () => {
    expect(FP_EYE_HEIGHT).toBeGreaterThan(1);
    expect(FP_FOV_DEGREES).toBeGreaterThan(55);
    expect(FP_REACH).toBe(6);
  });
  it('rotaciona pelo mouse com limites de altura e protege contra olhar invertido', () => {
    const a = firstPersonLook(0, 0, 500, -500);
    expect(a.yaw).toBeLessThan(0);
    expect(a.pitch).toBeGreaterThan(0);
    expect(firstPersonLook(0, 0, 0, -100000).pitch).toBe(FP_PITCH_LIMIT);
    expect(firstPersonLook(0, 0, 0, 100000).pitch).toBe(-FP_PITCH_LIMIT);
    expect(firstPersonLook(2, .4, 0, 0)).toEqual({yaw: 2, pitch: .4});
  });
  it('WASD acompanha a rotação, preservando os inputs do Walker', () => {
    const near = (a: number[], b: number[]) => {
      expect(a[0]).toBeCloseTo(b[0], 6);
      expect(a[1]).toBeCloseTo(b[1], 6);
    };
    near(firstPersonMovement(0, -1, 0), [0, -1]);
    near(firstPersonMovement(1, 0, 0), [1, 0]);
    near(firstPersonMovement(0, -1, Math.PI/2), [1, 0]);
    near(firstPersonMovement(1, 0, Math.PI/2), [0, 1]);
    near(firstPersonMovement(0, 1, Math.PI), [0, -1]);
  });
  it('mira vertical permite escolher paredes e partes inferiores das lajes', () => {
    const f = firstPersonForward(0, 0);
    expect(f[0]).toBeCloseTo(0);
    expect(f[1]).toBeCloseTo(0);
    expect(f[2]).toBeCloseTo(-1);
    expect(firstPersonForward(0, Math.PI/4)[1]).toBeGreaterThan(0.7);
    expect(firstPersonForward(Math.PI/2, 0)[0]).toBeCloseTo(1);
    const point = {x: 40, y: 2.3, z: -4.3};
    const normal = {x: -1, y: 0, z: 0};
    expect(firstPersonHitCell(point, normal, 32, -10, false)).toEqual({x: 7, y: 5, z: 2});
    expect(firstPersonHitCell(point, normal, 32, -10, true)).toEqual({x: 8, y: 5, z: 2});
  });
});
