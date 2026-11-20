import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../world/random';
import { GENERATOR_VERSION, ORE_RULES, TitanGenerator } from './generator';
import { attemptsFor, sampleTriangleY, veinCells } from './ores';
import { T, Y_MIN } from './voxel';

const scan = (g: TitanGenerator, step = 1): Map<number, Array<[number, number, number]>> => {
  const m = new Map<number, Array<[number, number, number]>>();
  for (let x = -64; x < 64; x += step) for (let z = -64; z < 64; z += step) for (let y = Y_MIN + 1; y < g.column(x, z).top - 3; y++) {
    const b = g.blockAt(x, y, z);
    if (b === T.VEIN_COPPER || b === T.VEIN_ROCK || b === T.VEIN_FROST) (m.get(b) ?? m.set(b, []).get(b)!).push([x, y, z]);
  }
  return m;
};

describe('veios subterrâneos (ADR 0070, gerador v9)', () => {
  it('distribuição triangular: tudo dentro da faixa, o pico concentra e as pontas rareiam', () => {
    const rng = mulberry32(7), ys = Array.from({ length: 20000 }, () => sampleTriangleY(rng, -48, 48, 8));
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(-48); expect(Math.max(...ys)).toBeLessThanOrEqual(48);
    const near = ys.filter((y) => Math.abs(y - 8) <= 8).length, far = ys.filter((y) => y < -32 || y > 40).length;
    expect(near / ys.length).toBeGreaterThan(0.28); expect(far / ys.length).toBeLessThan(0.1);
    expect(ys.reduce((a, b) => a + b, 0) / ys.length).toBeCloseTo(8 / 3, 0); // média teórica (min + max + pico) / 3
  });
  it('veio: só em células substituíveis; o descarte por ar corta blocos expostos', () => {
    const rule = { ...ORE_RULES[0], veinSize: 400, airDiscardChance: 1 };
    const solid = (x: number, y: number, z: number): boolean => y < 0 && Math.abs(x) < 20 && Math.abs(z) < 20;
    const exposed = (_x: number, y: number, _z: number): boolean => y === -1;
    const cells = veinCells(mulberry32(3), 0, -5, 0, rule, solid, exposed);
    expect(cells.length).toBeGreaterThan(20); expect(cells.every(([x, y, z]) => solid(x, y, z) && y !== -1)).toBe(true);
    expect(attemptsFor(() => 0.99, 2.5)).toBe(2); expect(attemptsFor(() => 0.1, 2.5)).toBe(3);
  });
  it('v9 gera os três minérios sob a rocha, nunca na camada de superfície nem acima da faixa; é determinístico e não depende da ordem de leitura', () => {
    expect(GENERATOR_VERSION).toBeGreaterThanOrEqual(9);
    const a = scan(new TitanGenerator(42, 9));
    for (const rule of ORE_RULES.slice(0, 3)) {
      const cells = a.get(rule.blockId) ?? [];
      expect(cells.length).toBeGreaterThan(40);
      for (const c of cells) expect(c[1]).toBeGreaterThan(Y_MIN);
    }
    const g2 = new TitanGenerator(42, 9), probe: Array<[number, number, number]> = [];
    for (let x = 63; x >= -64; x -= 7) for (let z = 63; z >= -64; z -= 5) for (let y = 40; y > -64; y -= 3) { g2.blockAt(x, y, z); probe.push([x, y, z]); } // outra ordem, só parte do mapa
    const gA = new TitanGenerator(42, 9);
    for (const [x, y, z] of probe) expect(g2.blockAt(x, y, z)).toBe(gA.blockAt(x, y, z));
    const b = scan(new TitanGenerator(42, 9));
    expect(b.get(T.VEIN_COPPER)).toEqual(a.get(T.VEIN_COPPER));
  });
  it('altura: o cobre se concentra perto do pico e o gelo fica no fundo', () => {
    const m = scan(new TitanGenerator(42, 9)), mean = (t: number): number => { const c = m.get(t)!; return c.reduce((s, p) => s + p[1], 0) / c.length; };
    expect(mean(T.VEIN_FROST)).toBeLessThan(-10); expect(mean(T.VEIN_COPPER)).toBeGreaterThan(-15);
  });
  it('v8 e anteriores seguem iguais (gelo solto do subsolo, sem veios)', () => {
    const g = new TitanGenerator(42, 8), m = scan(g);
    expect(m.get(T.VEIN_COPPER)).toBeUndefined(); expect(m.get(T.VEIN_ROCK)).toBeUndefined();
    let frost = 0; for (let x = -32; x < 32; x++) for (let z = -32; z < 32; z++) for (let y = -32; y < 0; y++) if (g.blockAt(x, y, z) === T.FROST) frost++;
    expect(frost).toBeGreaterThan(100);
  });
  it('superfície idêntica à v8 (veios de superfície, chegada e terreno)', () => {
    const a = new TitanGenerator(42, 8), b = new TitanGenerator(42, 9);
    for (let x = -64; x < 64; x += 3) for (let z = -64; z < 64; z += 3) { const ca = a.column(x, z), cb = b.column(x, z); expect(cb.top).toBe(ca.top); expect(b.blockAt(x, ca.top, z)).toBe(a.blockAt(x, ca.top, z)); }
  });
});
