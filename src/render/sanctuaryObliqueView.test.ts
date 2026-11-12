import { describe, expect, it } from 'vitest';
import { OBLIQUE_K, obliqueClip, obliqueProjection, obliqueRay } from './sanctuaryObliqueView';

const HALF_W = 8;
const HALF_H = 5;
const F = { x: 10, z: 20 };
const M = obliqueProjection(HALF_W, HALF_H);

describe('vista oblíqua do Santuário', () => {
  it('a proporção da frente é a da arte 3/4 (18/32)', () => {
    expect(OBLIQUE_K).toBeCloseTo(18 / 32, 6);
  });

  it('o chão cai como numa vista reta: quadrado perfeito, sem achatar', () => {
    const [x0, y0] = obliqueClip(M, { x: F.x, y: 0, z: F.z }, F);
    expect([x0, y0]).toEqual([0, 0]);
    const [x1] = obliqueClip(M, { x: F.x + 1, y: 0, z: F.z }, F);
    const [, y1] = obliqueClip(M, { x: F.x, y: 0, z: F.z - 1 }, F); // 1 célula ao norte
    expect(x1).toBeCloseTo(1 / HALF_W, 9);
    expect(y1).toBeCloseTo(1 / HALF_H, 9); // 1 célula na tela, igual à largura em células
  });

  it('cada nível de altura sobe K de célula na tela (a frente do cubo tem 18/32)', () => {
    const [, ground] = obliqueClip(M, { x: F.x, y: 0, z: F.z }, F);
    const [, up1] = obliqueClip(M, { x: F.x, y: 1, z: F.z }, F);
    const [, up2] = obliqueClip(M, { x: F.x, y: 2, z: F.z }, F);
    expect((up1 - ground) * HALF_H).toBeCloseTo(OBLIQUE_K, 9);
    expect((up2 - ground) * HALF_H).toBeCloseTo(2 * OBLIQUE_K, 9);
  });

  it('profundidade: o que está mais ao sul (ou mais alto) fica na frente (z_clip menor)', () => {
    const z = (p: { x: number; y: number; z: number }) => obliqueClip(M, p, F)[2];
    expect(z({ x: F.x, y: 0, z: F.z + 1 })).toBeLessThan(z({ x: F.x, y: 0, z: F.z }));
    expect(z({ x: F.x, y: 1, z: F.z })).toBeLessThan(z({ x: F.x, y: 0, z: F.z }));
    // personagem na frente de uma parede de 2 níveis (face em z+1): fica na frente de toda a face, até o topo
    const faceTop = z({ x: F.x, y: 2, z: F.z + 1 });
    expect(z({ x: F.x, y: 0, z: F.z + 1.5 })).toBeLessThan(faceTop);
    // e quem está atrás (ao norte) da parede fica atrás dela
    expect(z({ x: F.x, y: 0, z: F.z - 0.5 })).toBeGreaterThan(z({ x: F.x, y: 0, z: F.z + 1 }));
  });

  it('tudo que aparece na tela cai dentro do cubo de recorte (-1..1 em z)', () => {
    for (const p of [{ y: 0, z: F.z - 8 }, { y: 0, z: F.z + 8 }, { y: 3, z: F.z + 8 }, { y: 3, z: F.z - 8 }]) {
      const z = obliqueClip(M, { x: F.x, ...p }, F)[2];
      expect(Math.abs(z)).toBeLessThan(1);
    }
  });

  it('o raio do cursor volta ao ponto de tela que o gerou (ida e volta)', () => {
    const [nx, ny] = [0.3, -0.2];
    const { origin, dir } = obliqueRay(nx, ny, HALF_W, HALF_H, F);
    for (const t of [0, 5, 9]) {
      const p = { x: origin[0] + dir[0] * t, y: origin[1] + dir[1] * t, z: origin[2] + dir[2] * t };
      const [cx, cy] = obliqueClip(M, p, F);
      expect(cx).toBeCloseTo(nx, 9);
      expect(cy).toBeCloseTo(ny, 9);
    }
    expect(dir[1]).toBeLessThan(0); // olha para baixo
  });
});
