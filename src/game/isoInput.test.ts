import { describe, expect, it } from 'vitest';
import { screenToWorldIso } from './isoInput';

const near = (a: [number, number], b: [number, number]) => { expect(a[0]).toBeCloseTo(b[0]); expect(a[1]).toBeCloseTo(b[1]); };

describe('entrada na vista isométrica', () => {
  it('cima da tela vai para o fundo (−x, −y); baixo, para a frente (+x, +y)', () => {
    near(screenToWorldIso(0, -1), [-Math.SQRT1_2, -Math.SQRT1_2]);
    near(screenToWorldIso(0, 1), [Math.SQRT1_2, Math.SQRT1_2]);
  });
  it('direita da tela é (+x, −y); esquerda, (−x, +y)', () => {
    near(screenToWorldIso(1, 0), [Math.SQRT1_2, -Math.SQRT1_2]);
    near(screenToWorldIso(-1, 0), [-Math.SQRT1_2, Math.SQRT1_2]);
  });
  it('preserva o módulo e a diagonal da tela vira eixo do mundo', () => {
    expect(Math.hypot(...screenToWorldIso(0.6, -0.8))).toBeCloseTo(1);
    near(screenToWorldIso(1, 1), [Math.SQRT2, 0]); // tela: baixo-direita = +x puro
  });
});
