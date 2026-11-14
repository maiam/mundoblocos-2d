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

  it('a terra com faixa pintada ao lado da água entra na máscara (a camada chega à margem visível); terra longe da água não', () => {
    const out = new Uint8Array(WATER_MASK_SIZE * WATER_MASK_SIZE);
    // água em x >= 5; terra (que recebe a faixa) em x < 5; chunk em x0 = 0
    buildWaterMask((x) => x >= 5, 0, 0, 16, out, (x) => x < 5);
    expect(out[1 * WATER_MASK_SIZE + 1 + 4]).toBe(255); // (4, 0): terra colada na água
    expect(out[1 * WATER_MASK_SIZE + 1 + 3]).toBe(0); // (3, 0): terra a 2 células da água
    const none = new Uint8Array(WATER_MASK_SIZE * WATER_MASK_SIZE);
    buildWaterMask((x) => x >= 5, 0, 0, 16, none); // sem o predicado, a máscara é só a água do mapa
    expect(none[1 * WATER_MASK_SIZE + 1 + 4]).toBe(0);
  });
});
