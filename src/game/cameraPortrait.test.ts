import { describe, expect, it } from 'vitest';
import { TILE } from '../config';
import { Camera, PORTRAIT_MIN_CELLS_WIDE } from './camera';

/** Células visíveis (largura, altura) com o zoom base da câmera. */
function cells(w: number, h: number, tall?: number): { cw: number; ch: number; zoom: number } {
  const c = new Camera();
  if (tall) c.setCellsTall(tall);
  c.resize(w, h);
  return { cw: w / (c.zoom * TILE), ch: h / (c.zoom * TILE), zoom: c.zoom };
}

describe('câmera na vertical (ADR 0030)', () => {
  it('em pé, a largura nunca mostra menos que PORTRAIT_MIN_CELLS_WIDE células', () => {
    const { cw } = cells(390, 844);
    expect(cw).toBeGreaterThanOrEqual(PORTRAIT_MIN_CELLS_WIDE - 1e-9);
  });

  it('em pé mostra mais células na altura do que deitado, com o mesmo aparelho', () => {
    expect(cells(390, 844).ch).toBeGreaterThan(cells(844, 390).ch);
  });

  it('o personagem fica maior em pé: o zoom (px por célula) sobe em relação ao deitado', () => {
    expect(cells(390, 844).zoom).toBeGreaterThan(cells(844, 390).zoom);
  });

  it('deitado nada muda: 10 células na altura no padrão e 14 quando o renderer pede 14', () => {
    expect(cells(844, 390).ch).toBeCloseTo(10, 5);
    expect(cells(844, 390, 14).ch).toBeCloseTo(14, 5);
  });

  it('tablet em pé fica limitado pela altura pedida (14), não pela largura', () => {
    const { ch } = cells(820, 1180, 14);
    expect(ch).toBeCloseTo(14, 5);
  });
});
