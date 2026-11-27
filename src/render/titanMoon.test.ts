import { describe, expect, it } from 'vitest';
import { moonLit } from './titanMoon';

/** Lua (ADR 0118): iluminada à direita na crescente e à esquerda na minguante, como na Wiki. */
describe('fases da lua', () => {
  const lit = (phase: number, n = 41): number => { let c = 0; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (moonLit(phase, (x / (n - 1)) * 2 - 1, (y / (n - 1)) * 2 - 1)) c++; return c; };
  const disc = lit(0);
  it('cheia acende o disco, nova não acende nada e o quarto acende a metade', () => {
    expect(disc).toBeGreaterThan(1000); expect(lit(4)).toBe(0);
    expect(lit(2) / disc).toBeCloseTo(0.5, 1); expect(lit(6) / disc).toBeCloseTo(0.5, 1);
  });
  it('gibosa passa da metade, crescente fica abaixo; o lado muda entre crescente e minguante; o ciclo é simétrico', () => {
    for (const p of [1, 7]) expect(lit(p) / disc).toBeGreaterThan(0.6);
    for (const p of [3, 5]) expect(lit(p) / disc).toBeLessThan(0.4);
    expect(moonLit(5, 0.9, 0)).toBe(true); expect(moonLit(5, -0.9, 0)).toBe(false); // crescente: luz à direita
    expect(moonLit(3, -0.9, 0)).toBe(true); expect(moonLit(3, 0.9, 0)).toBe(false); // minguante: luz à esquerda
    expect(Math.abs(lit(1) - lit(7))).toBeLessThan(8); expect(Math.abs(lit(3) - lit(5))).toBeLessThan(8);
    expect(moonLit(0, 2, 0)).toBe(false); // fora do disco
  });
});
