import { describe, expect, it } from 'vitest';
import { LIQUID_FRAME_S, liquidRowOffset, liquidRowsOf } from './liquidFrames';

describe('quadros do líquido (ADR 0132)', () => {
  it('lê os quadros pela proporção da imagem', () => {
    expect(liquidRowsOf({ width: 64, height: 16 })).toBe(1); // Lago do Titã
    expect(liquidRowsOf({ width: 64, height: 128 })).toBe(8); // água do Orvalis, 16 px
    expect(liquidRowsOf({ width: 32, height: 64 })).toBe(8); // 8 px da isométrica
  });
  it('percorre os 8 quadros de cima para baixo e volta ao primeiro', () => {
    const offs = Array.from({ length: 9 }, (_, k) => liquidRowOffset(k * LIQUID_FRAME_S + 0.01, 8));
    expect(offs[0]).toBeCloseTo(0.875); expect(offs[7]).toBeCloseTo(0); expect(offs[8]).toBeCloseTo(offs[0]);
    expect(new Set(offs.slice(0, 8)).size).toBe(8);
  });
});
