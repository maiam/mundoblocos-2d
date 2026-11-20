import { describe, expect, it } from 'vitest';
import { eyeDepth, eyesSubmerged, stepUnderwater, underwaterAmbient, underwaterFar, UNDERWATER_ADAPT_SECONDS, UNDERWATER_AMBIENT_FLOOR, UNDERWATER_BLEND_SECONDS, UNDERWATER_FAR_ADAPTED, UNDERWATER_FAR_START } from './underwater';
import { LAKE_SURFACE_Y, T } from './voxel';
import { TitanGenerator } from './generator';
import { meshSection, LAKE_SIDE_DEEP_UV, LAKE_SIDE_UV, LAKE_TOP_UV } from './mesher';
import { TitanVolume } from './volume';

describe('aparência submersa (ADR 0057)', () => {
  it('os olhos só contam como submersos abaixo da superfície E numa célula de líquido (uma passagem seca abaixo de Y = 64 continua com o visual de ar)', () => {
    expect(eyesSubmerged(LAKE_SURFACE_Y - 0.5, T.LAKE, T.LAKE)).toBe(true);
    expect(eyesSubmerged(LAKE_SURFACE_Y + 0.2, T.LAKE, T.LAKE)).toBe(false); // olhos acima da superfície
    expect(eyesSubmerged(LAKE_SURFACE_Y - 0.5, T.AIR, T.LAKE)).toBe(false); // célula seca abaixo do nível do lago
    expect(eyeDepth(60, true)).toBe(4); expect(eyeDepth(60, false)).toBe(0); expect(eyeDepth(70, true)).toBe(0);
  });

  it('luz ambiente por profundidade: max(0,18, exp(−0,18 · d)); a névoa abre de 8 a 14 blocos', () => {
    expect(underwaterAmbient(0)).toBeCloseTo(1, 6);
    expect(underwaterAmbient(2)).toBeCloseTo(Math.exp(-0.36), 6);
    expect(underwaterAmbient(40)).toBe(UNDERWATER_AMBIENT_FLOOR); // piso: o fundo nunca fica preto
    expect(underwaterAmbient(-3)).toBeCloseTo(1, 6);
    expect(underwaterFar(0)).toBe(UNDERWATER_FAR_START); expect(underwaterFar(1)).toBe(UNDERWATER_FAR_ADAPTED); expect(underwaterFar(0.5)).toBe(11);
    expect(underwaterFar(9)).toBe(UNDERWATER_FAR_ADAPTED); expect(underwaterFar(-1)).toBe(UNDERWATER_FAR_START);
  });

  it('a mistura entra e sai em ~150 ms; a adaptação cresce em 2 s dentro d\'água e zera ao emergir', () => {
    let s = { mix: 0, adapt: 0 };
    s = stepUnderwater(s, true, UNDERWATER_BLEND_SECONDS / 2); expect(s.mix).toBeCloseTo(0.5, 6);
    s = stepUnderwater(s, true, UNDERWATER_BLEND_SECONDS); expect(s.mix).toBe(1); // satura em 1
    for (let k = 0; k < 40; k++) s = stepUnderwater(s, true, UNDERWATER_ADAPT_SECONDS / 40);
    expect(s.adapt).toBeCloseTo(1, 6);
    s = stepUnderwater(s, false, UNDERWATER_BLEND_SECONDS / 2); expect(s.mix).toBeCloseTo(0.5, 6); expect(s.adapt).toBe(0); // adaptação zerada ao sair
    s = stepUnderwater(s, false, 1); expect(s.mix).toBe(0); // véu volta a zero
    expect(stepUnderwater({ mix: 0.3, adapt: 0.4 }, true, 0)).toEqual({ mix: 0.3, adapt: 0.4 }); // sem tempo, nada muda
  });
});

describe('malha do lago com o atlas V2 (ADR 0057)', () => {
  it('o topo usa a célula 0, a lateral exposta a célula 2 inteira e, abaixo de líquido, sem a faixa clara de cima; nada fora do atlas', () => {
    const v = new TitanVolume(new TitanGenerator(42));
    // a margem natural é sólida (sem face lateral exposta): quebra um bloco da margem para expor a lateral da coluna de líquido ao lado
    const solid = (id: number): boolean => id !== T.LAKE && id !== T.AIR;
    const find = (y: number, needLakeAbove: boolean): { x: number; z: number } => {
      for (let x = -32; x < 31; x++) for (let z = -32; z < 32; z++) if (v.get(x, y, z) === T.LAKE && (!needLakeAbove || v.get(x, y + 1, z) === T.LAKE) && solid(v.get(x + 1, y, z))) return { x, z };
      throw new Error(`sem borda de lago em y = ${y}`);
    };
    const a = find(63, false), b = find(62, true); // a: lateral junto da superfície; b: lateral com líquido em cima
    expect(v.remove(a.x + 1, 63, a.z)).toBe(true); expect(v.remove(b.x + 1, 62, b.z)).toBe(true);
    const sec = (p: { x: number; z: number }, y: number) => meshSection(v, Math.floor(p.x / 16), Math.floor((y + 64) / 16), Math.floor(p.z / 16)).liquid!;
    const parts = [sec(a, 63), sec(b, 62)];
    const m = { uv: parts.flatMap((p) => [...p.uv]) };
    const us = new Set<string>();
    for (let i = 0; i < m.uv.length; i += 2) us.add(`${m.uv[i].toFixed(2)},${m.uv[i + 1].toFixed(2)}`);
    const has = (uv: readonly number[]): boolean => us.has(`${uv[0].toFixed(2)},${uv[1].toFixed(2)}`) && us.has(`${uv[2].toFixed(2)},${uv[3].toFixed(2)}`);
    expect(has(LAKE_TOP_UV)).toBe(true); expect(has(LAKE_SIDE_UV)).toBe(true); expect(has(LAKE_SIDE_DEEP_UV)).toBe(true);
    expect(LAKE_SIDE_DEEP_UV[3]).toBe(0.75); expect(LAKE_SIDE_UV[3]).toBe(1);
    for (let i = 0; i < m.uv.length; i += 2) { expect(m.uv[i]).toBeGreaterThanOrEqual(0); expect(m.uv[i]).toBeLessThanOrEqual(0.75 + 1e-6); expect(m.uv[i + 1]).toBeGreaterThanOrEqual(0); expect(m.uv[i + 1]).toBeLessThanOrEqual(1); }
  });
});
