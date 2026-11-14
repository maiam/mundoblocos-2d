import { describe, expect, it } from 'vitest';
import { buildWaterMask, waterFxOn, WATER_MASK_SIZE } from './waterFx';

describe('waterFx (superfície da água)', () => {
  it('?agua=0 desliga; o padrão é ligado', () => {
    expect(waterFxOn('')).toBe(true);
    expect(waterFxOn('?seed=1&agua=1')).toBe(true);
    expect(waterFxOn('?agua=0')).toBe(false);
  });

  it('a máscara marca a água aberta do chunk e de 1 célula de vizinhança, e conta só as células do chunk', () => {
    const out = new Uint8Array(WATER_MASK_SIZE * WATER_MASK_SIZE);
    // água só na faixa x ∈ [10, 20) do mundo; chunk em x0 = 16 (16 células): água em x = 16..19 → 4 colunas × 16 linhas
    const n = buildWaterMask((x) => x >= 10 && x < 20, 16, 0, 16, out);
    expect(n).toBe(4 * 16);
    expect(out[1 * WATER_MASK_SIZE + 1]).toBe(255); // célula (16, 0)
    expect(out[1 * WATER_MASK_SIZE + 5]).toBe(0); // (20, 0): fora
    expect(out[1 * WATER_MASK_SIZE + 0]).toBe(255); // (15, 0): vizinhança (esmaecer na emenda do chunk)
  });

  it('sem água não há camada (contagem 0)', () => {
    const out = new Uint8Array(WATER_MASK_SIZE * WATER_MASK_SIZE);
    expect(buildWaterMask(() => false, 0, 0, 16, out)).toBe(0);
  });
});
