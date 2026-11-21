import { describe, expect, it } from 'vitest';
import { computeLight, lightKey } from './light';
import { MemoryTitanStorage } from './save';
import { openSession } from './session';
import { BRAZIER_LIGHT, T, lightLevelOf } from './voxel';

/** Luz de bloco do Braseiro aceso (ADR 0094): emissor de nível 13, sólido; entra e sai pelo mesmo motor incremental da lanterna. */
const open = async () => openSession(new MemoryTitanStorage(), 42, () => 1, undefined, 2);
const Y = 150;
const spot = (s: Awaited<ReturnType<typeof openSession>>) => {
  const a = s.volume.gen.arrival, x = Math.floor(a.x) + 6, z = Math.floor(a.z) + 6;
  for (let dx = -8; dx <= 8; dx++) for (let dz = -8; dz <= 8; dz++) { s.volume.set(x + dx, Y - 1, z + dz, T.DARK_ROCK); for (let yy = Y; yy < Y + 6; yy++) s.volume.set(x + dx, yy, z + dz, T.AIR); }
  return { x, z };
};
/** O mapa do motor incremental coincide com o cálculo completo (emissores = lanternas e braseiros acesos da caixa). */
const matchesFull = (s: Awaited<ReturnType<typeof openSession>>, x: number, z: number): void => {
  const v = s.volume, src: Array<[number, number, number, number]> = [];
  for (let dx = -8; dx <= 8; dx++) for (let dz = -8; dz <= 8; dz++) for (let yy = Y - 1; yy < Y + 6; yy++) { const lv = lightLevelOf(v.get(x + dx, yy, z + dz)); if (lv) src.push([x + dx, yy, z + dz, lv]); }
  const full = computeLight((a, b, c) => v.get(a, b, c), src);
  for (let dx = -8; dx <= 8; dx++) for (let dz = -8; dz <= 8; dz++) for (let yy = Y - 1; yy < Y + 6; yy++) expect(v.light(x + dx, yy, z + dz), `${dx},${yy},${dz}`).toBe(full.get(lightKey(x + dx, yy, z + dz)) ?? 0);
};

describe('braseiro aceso: luz de bloco', () => {
  it('só o aceso emite (13) e a lanterna segue 15', () => {
    expect(lightLevelOf(T.BRAZIER_LIT)).toBe(BRAZIER_LIGHT); expect(BRAZIER_LIGHT).toBe(13);
    expect(lightLevelOf(T.BRAZIER)).toBe(0); expect(lightLevelOf(T.LANTERN)).toBe(15); expect(lightLevelOf(T.DARK_ROCK)).toBe(0);
  });
  it('acender espalha a luz (13 na célula, 12 ao lado, perde 1 por célula) e apagar a tira', async () => {
    const s = await open(); const { x, z } = spot(s), v = s.volume;
    v.place(x, Y, z, T.BRAZIER); expect(v.light(x + 1, Y, z)).toBe(0);
    v.set(x, Y, z, T.BRAZIER_LIT); // o que `tickFurnaces` faz
    expect(v.light(x, Y, z)).toBe(13); expect(v.light(x + 1, Y, z)).toBe(12); expect(v.light(x + 1, Y + 1, z)).toBe(11); expect(v.light(x + 6, Y, z)).toBe(7);
    matchesFull(s, x, z);
    v.set(x, Y, z, T.BRAZIER); expect(v.light(x + 1, Y, z)).toBe(0); expect(v.light(x, Y, z)).toBe(0);
    matchesFull(s, x, z);
  });
  it('quebrar o aceso tira a luz; pôr o aceso direto no ar acende; lanterna e braseiro se combinam', async () => {
    const s = await open(); const { x, z } = spot(s), v = s.volume;
    v.set(x, Y, z, T.BRAZIER_LIT); expect(v.light(x + 1, Y, z)).toBe(12);
    v.remove(x, Y, z); expect(v.light(x + 1, Y, z)).toBe(0); matchesFull(s, x, z);
    expect(v.place(x + 2, Y, z, T.BRAZIER_LIT)).toBe(true); expect(v.light(x + 2, Y, z)).toBe(13); expect(v.light(x + 3, Y, z)).toBe(12); // nasce sólido e emissor ao mesmo tempo
    v.set(x + 3, Y + 1, z + 1, T.LANTERN); expect(v.light(x + 3, Y + 1, z + 1)).toBe(15); matchesFull(s, x, z);
    v.set(x + 3, Y + 1, z + 1, T.AIR); matchesFull(s, x, z);
  });
  it('um bloco sólido entre o braseiro e o canto bloqueia a luz, igual ao cálculo completo', async () => {
    const s = await open(); const { x, z } = spot(s), v = s.volume;
    v.set(x, Y, z, T.BRAZIER_LIT);
    for (let dy = 0; dy < 4; dy++) v.set(x + 2, Y + dy, z, T.DARK_ROCK);
    for (let dz = -3; dz <= 3; dz++) for (let dy = 0; dy < 4; dy++) v.set(x + 2, Y + dy, z + dz, T.DARK_ROCK);
    matchesFull(s, x, z);
    v.remove(x + 2, Y, z); matchesFull(s, x, z);
  });
});
