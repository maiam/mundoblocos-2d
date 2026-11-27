import { describe, expect, it } from 'vitest';
import { newBody, stepBody, SWIM_SPRINT_FACTOR } from './physics';
import { MemoryTitanStorage } from './save';
import { openSession } from './session';
import { T } from './voxel';

/** Correr nadando (ADR 0132): na água, com corrida, o corpo segue a direção do olhar (mergulha e sobe); sem corrida, nada como antes. */
const Y = 150;
const setup = async () => {
  const s = await openSession(new MemoryTitanStorage(), 42, () => 1, undefined, 2);
  const a = s.volume.gen.arrival, x = Math.floor(a.x) + 6, z = Math.floor(a.z) + 6, v = s.volume;
  for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) for (let yy = Y - 8; yy < Y + 4; yy++) v.set(x + dx, yy, z + dz, yy < Y - 7 ? T.DARK_ROCK : yy < Y ? T.LAKE : T.AIR);
  const b = newBody(x + 0.5, Y - 2, z + 0.5);
  return { v, b };
};
describe('correr nadando', () => {
  it('olhando para baixo, mergulha; olhando para cima, sobe', async () => {
    const { v, b } = await setup();
    stepBody(v, b, { dirX: 0, dirZ: -1, jump: false, sprint: true, pitch: -0.7 }, 0.1);
    expect(b.inLiquid).toBe(true); expect(b.vy).toBeLessThan(-2);
    const c = (await setup()).b;
    stepBody(v, c, { dirX: 0, dirZ: -1, jump: false, sprint: true, pitch: 0.7 }, 0.1);
    expect(c.vy).toBeGreaterThan(2);
  });
  it('a velocidade total é a da corrida nadando, dividida entre horizontal e vertical', async () => {
    const { v, b } = await setup();
    stepBody(v, b, { dirX: 0, dirZ: -1, jump: false, sprint: true, pitch: 0.5 }, 0.025);
    expect(Math.hypot(b.vx, b.vy, b.vz)).toBeCloseTo(4.3 * SWIM_SPRINT_FACTOR, 1);
  });
  it('sem corrida ou sem olhar, nada como antes (±0,6 da caminhada, sem subir sozinho)', async () => {
    const { v, b } = await setup();
    stepBody(v, b, { dirX: 0, dirZ: -1, jump: false, pitch: 0.7 }, 0.1);
    expect(Math.hypot(b.vx, b.vz)).toBeCloseTo(4.3 * 0.6, 1); expect(b.vy).toBeLessThan(0.5);
    const c = (await setup()).b;
    stepBody(v, c, { dirX: 0, dirZ: -1, jump: false, sprint: true }, 0.1);
    expect(Math.hypot(c.vx, c.vz)).toBeCloseTo(4.3 * 0.6, 1);
  });
});
