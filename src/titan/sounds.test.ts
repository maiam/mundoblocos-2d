import { describe, expect, it } from 'vitest';
import { FootstepClock, STRIDE_BLOCKS, surfaceOf } from './sounds';
import { T } from './voxel';

describe('regras do som (ADR 0054)', () => {
  it('material sonoro por bloco: rocha, areia e gelo; ar, líquido e lanterna em silêncio', () => {
    for (const id of [T.DARK_ROCK, T.VEIN_ROCK, T.SLAB, T.BEDROCK, T.WORKBENCH, T.WORKBENCH_90, T.WORKBENCH_180, T.WORKBENCH_270]) expect(surfaceOf(id)).toBe('rock');
    for (const id of [T.SAND, T.DAMP_SAND]) expect(surfaceOf(id)).toBe('sand');
    for (const id of [T.FROST, T.VEIN_FROST, T.EMBER]) expect(surfaceOf(id)).toBe('ice');
    for (const id of [T.AIR, T.LAKE, T.LANTERN, undefined, 99]) expect(surfaceOf(id)).toBeNull();
  });

  it('passos: um a cada ~2,4 blocos no chão; parado, no ar ou na água não soa', () => {
    const c = new FootstepClock();
    let n = 0;
    for (let i = 0; i < 100; i++) if (c.step(0.1, true)) n++; // 10 blocos
    expect(n).toBe(Math.floor(10 / STRIDE_BLOCKS)); // 4
    expect(c.step(0, true)).toBe(false); // parado
    const d = new FootstepClock();
    for (let i = 0; i < 100; i++) expect(d.step(0.1, false)).toBe(false); // no ar ou na água
    expect(d.step(STRIDE_BLOCKS + 0.1, true)).toBe(true); // ao pousar, o passo vem quando a distância completa
  });

  it('o resto da passada se mantém e o relógio zera ao reiniciar', () => {
    const c = new FootstepClock();
    expect(c.step(STRIDE_BLOCKS - 0.1, true)).toBe(false);
    expect(c.step(0.2, true)).toBe(true);
    c.reset();
    expect(c.step(0.2, true)).toBe(false);
  });
});
