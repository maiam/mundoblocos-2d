import { describe, expect, it } from 'vitest';
import { TitanGenerator } from './generator';
import { newBody, stepBody, STEP_HEIGHT } from './physics';
import { TitanVolume } from './volume';
import { T, stairId } from './voxel';

/** Auto-step de 0,6 m (ADR 0103): sobe laje, degrau e assento andando, encaixa no topo real; barra cubo; não dispara no ar; a câmera desliza. */
const Y = 200;
const arena = (): TitanVolume => { const v = new TitanVolume(new TitanGenerator(42)); for (let x = 4; x <= 20; x++) for (let z = 4; z <= 20; z++) v.place(x, Y - 1, z, T.DARK_ROCK); return v; };
const walk = (v: TitanVolume, b: ReturnType<typeof newBody>, dx: number, dz: number, secs: number): void => { for (let k = 0; k < secs * 40; k++) stepBody(v, b, { dirX: dx, dirZ: dz, jump: false }, 1 / 40); };

describe('auto-step (ADR 0103)', () => {
  it('sobe a laje (0,5 m) andando e encaixa no topo dela', () => {
    const v = arena(); for (let z = 4; z <= 14; z++) for (let x = 10; x <= 16; x++) v.set(x, Y, z, T.SLAB);
    const b = newBody(7.5, Y, 8.5); walk(v, b, 0, 0, 0.3); walk(v, b, 1, 0, 1.2);
    expect(b.y).toBeCloseTo(Y + 0.5, 3); expect(b.x).toBeGreaterThan(10.5);
  });
  it('sobe o degrau de junco em dois passos de 0,5 m, andando', () => {
    const v = arena(); for (let z = 6; z <= 10; z++) { v.set(10, Y, z, stairId(3)); v.set(11, Y, z, T.REED_BLOCK); v.set(11, Y + 1, z, T.REED_BLOCK); }
    const b = newBody(7.5, Y, 8.5); walk(v, b, 0, 0, 0.3); walk(v, b, 1, 0, 0.9);
    expect(b.y).toBeGreaterThanOrEqual(Y + 0.5 - 1e-3); expect(b.x).toBeGreaterThan(10);
  });
  it('o limite é 0,6 m', () => { expect(STEP_HEIGHT).toBe(0.6); });
  it('parede de 2 cubos continua barrando; teto baixo sobre a laje impede o passo', () => {
    const v = arena(); for (let z = 4; z <= 14; z++) { v.set(10, Y, z, T.DARK_ROCK); v.set(10, Y + 1, z, T.DARK_ROCK); }
    const b = newBody(7.5, Y, 8.5); walk(v, b, 0, 0, 0.3); walk(v, b, 1, 0, 0.8);
    expect(b.y).toBeCloseTo(Y, 3); expect(b.x).toBeLessThan(10);
    const w = arena(); for (let z = 4; z <= 14; z++) { w.set(10, Y, z, T.SLAB); w.set(10, Y + 2, z, T.DARK_ROCK); }
    const c = newBody(7.5, Y, 8.5); walk(w, c, 0, 0, 0.3); walk(w, c, 1, 0, 0.8);
    expect(c.y).toBeCloseTo(Y, 3); expect(c.x).toBeLessThan(10); // a cabeça bateria no teto a 2 m
  });
  it('a câmera desliza (stepSmooth negativo que decai a 0)', () => {
    const v = arena(); for (let z = 4; z <= 14; z++) for (let x = 10; x <= 16; x++) v.set(x, Y, z, T.SLAB);
    const b = newBody(7.5, Y, 8.5); walk(v, b, 0, 0, 0.3);
    let min = 0; for (let k = 0; k < 40; k++) { stepBody(v, b, { dirX: 1, dirZ: 0, jump: false }, 1 / 40); min = Math.min(min, b.stepSmooth ?? 0); }
    expect(min).toBeLessThan(-0.05); // começou em ≈ −0,5
    walk(v, b, 0, 0, 0.5); expect(b.stepSmooth ?? 0).toBe(0);
  });
});
