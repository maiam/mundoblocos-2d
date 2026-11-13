import { describe, expect, it } from 'vitest';
import { hash2 } from '../world/random';
import { CLOUD_CELL, CLOUD_DRIFT, cloudBlobs, glintAlpha, glintPosition } from './groundFxMath';

describe('efeitos de chão — matemática (a mesma do Renderer 2D)', () => {
  it('brilho: só acima de 0,93 da fase, crescendo até 1; determinístico por célula', () => {
    let on = 0, off = 0;
    for (let t = 0; t < 40; t += 0.05) {
      const a = glintAlpha(42, 5, 9, t);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThanOrEqual(1);
      a > 0 ? on++ : off++;
      expect(glintAlpha(42, 5, 9, t)).toBe(a);
    }
    expect(on).toBeGreaterThan(0);
    expect(off).toBeGreaterThan(on * 3); // aceso só uma fração pequena do tempo
    const phase = Math.sin(3 * 1.6 + hash2(42, 5, 9) * 40);
    expect(glintAlpha(42, 5, 9, 3)).toBeCloseTo(phase < 0.93 ? 0 : (phase - 0.93) / 0.07);
  });

  it('brilho: cai dentro da própria célula', () => {
    for (let x = -5; x < 5; x++) {
      const p = glintPosition(7, x, 3);
      expect(p.x).toBeGreaterThanOrEqual(x + 0.25);
      expect(p.x).toBeLessThanOrEqual(x + 0.75);
      expect(p.y).toBeGreaterThanOrEqual(3 + 0.3);
      expect(p.y).toBeLessThanOrEqual(3 + 0.7);
    }
  });

  it('nuvens: algumas por tela, derivam para leste com o tempo e voltam o mesmo desenho em ordem', () => {
    const a = cloudBlobs(42, 0, 0, 40, 25, 0);
    expect(a.length).toBeGreaterThan(0);
    for (const b of a) {
      expect(b.rx).toBeGreaterThanOrEqual(CLOUD_CELL * 0.35);
      expect(b.rx).toBeLessThanOrEqual(CLOUD_CELL * 0.65);
      expect(b.ry).toBeCloseTo(b.rx * 0.6);
    }
    const later = cloudBlobs(42, 0, 0, 40, 25, 10);
    const same = a.find((b) => later.some((l) => Math.abs(l.y - b.y) < 1e-9 && Math.abs(l.x - (b.x + 10 * CLOUD_DRIFT)) < 1e-9));
    expect(same).toBeDefined(); // a mesma nuvem andou 10 s de deriva
  });
});
