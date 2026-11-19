import { describe, expect, it } from 'vitest';
import { REED_VARIANTS, reedVariant } from './reeds';

describe('silhuetas do Junco de Vidro', () => {
  it('é determinística pela célula e fica sempre numa das três colunas do atlas', () => {
    for (let x = -32; x < 32; x++) for (let z = -32; z < 32; z++) {
      const v = reedVariant(x, z);
      expect(v).toBe(reedVariant(x, z));
      expect(Number.isInteger(v) && v >= 0 && v < REED_VARIANTS).toBe(true);
    }
  });
  it('as três silhuetas aparecem, em proporção razoável, na região de 64 × 64', () => {
    const n = [0, 0, 0];
    for (let x = -32; x < 32; x++) for (let z = -32; z < 32; z++) n[reedVariant(x, z)]++;
    for (const c of n) expect(c / 4096).toBeGreaterThan(0.2);
  });
});
