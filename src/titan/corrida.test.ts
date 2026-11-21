import { describe, expect, it } from 'vitest';
import { FOV_DEG, rayThrough, SPRINT_FOV_DEG } from './aim';
import { TitanGenerator } from './generator';
import { newBody, SPRINT_FACTOR, stepBody } from './physics';
import { TitanVolume } from './volume';
import { EXHAUSTION } from './vitals';
import { T } from './voxel';

const FLAT_Y = 200;
const arena = (): TitanVolume => { const v = new TitanVolume(new TitanGenerator(42)); for (let x = 0; x <= 40; x++) for (let z = 4; z <= 20; z++) v.place(x, FLAT_Y - 1, z, T.DARK_ROCK); return v; };
const run = (sprint: boolean): number => { const v = arena(), b = newBody(2.5, FLAT_Y, 10.5); for (let k = 0; k < 20; k++) stepBody(v, b, { dirX: 0, dirZ: 0, jump: false }, 0.025); const x0 = b.x; for (let k = 0; k < 40; k++) stepBody(v, b, { dirX: 1, dirZ: 0, jump: false, sprint }, 0.025); return b.x - x0; };

describe('corrida e modo de mira no toque (ADR 0076)', () => {
  it('corrida anda 30 % mais depressa que a caminhada e gasta mais fome por bloco', () => {
    const walk = run(false), sprint = run(true);
    expect(walk).toBeGreaterThan(3.5); expect(sprint / walk).toBeCloseTo(SPRINT_FACTOR, 1);
    expect(EXHAUSTION.sprintPerBlock).toBeGreaterThan(EXHAUSTION.walkPerBlock);
  });
  it('no lago a corrida não vale (a água manda na velocidade)', () => {
    const v = new TitanVolume(new TitanGenerator(42)); for (let y = 140; y <= 152; y++) for (let x = 8; x <= 30; x++) for (let z = 8; z <= 12; z++) v.set(x, y, z, T.LAKE);
    const a = newBody(10.5, 148, 10.5), b = newBody(10.5, 148, 10.5); a.inLiquid = b.inLiquid = true;
    for (let k = 0; k < 4; k++) { stepBody(v, a, { dirX: 1, dirZ: 0, jump: false }, 0.025); stepBody(v, b, { dirX: 1, dirZ: 0, jump: false, sprint: true }, 0.025); }
    expect(Math.abs(a.x - b.x)).toBeLessThan(0.02);
  });
  it('o raio no dedo usa o campo de visão atual (a corrida abre ' + SPRINT_FOV_DEG + '°): a borda de cima fica mais alta', () => {
    const normal = rayThrough(0, 0, 0, 1, 2), wide = rayThrough(0, 0, 0, 1, 2, FOV_DEG + SPRINT_FOV_DEG);
    expect(wide[1]).toBeGreaterThan(normal[1]); expect(Math.acos(-wide[2]) * (180 / Math.PI)).toBeCloseTo((FOV_DEG + SPRINT_FOV_DEG) / 2, 6);
  });
});
