import { describe, expect, it } from 'vitest';
import { GENERATOR_VERSION, TitanGenerator } from './generator';
import { T } from './voxel';

const surface = (g: TitanGenerator, f: (x: number, z: number, top: number, b: number, s: number) => void): void => {
  for (let x = -64; x < 64; x++) for (let z = -64; z < 64; z++) { const c = g.column(x, z); f(x, z, c.top, g.blockAt(x, c.top, z), c.surface); }
};

describe('fragmentos à vista na rocha escura (ADR 0072, gerador v10)', () => {
  it('v10 espalha muitos veios de rocha e de gelo; v9 só tem os das formações', () => {
    expect(GENERATOR_VERSION).toBeGreaterThanOrEqual(10);
    for (const seed of [42, 1, 2, 3, 4]) {
      let rock = 0, ice = 0, rock9 = 0;
      surface(new TitanGenerator(seed, 10), (_x, _z, _t, b) => { if (b === T.VEIN_ROCK) rock++; else if (b === T.VEIN_FROST) ice++; });
      surface(new TitanGenerator(seed, 9), (_x, _z, _t, b) => { if (b === T.VEIN_ROCK) rock9++; });
      expect(rock).toBeGreaterThan(60); expect(ice).toBeGreaterThan(30); expect(rock9).toBe(3);
    }
  });
  it('só nascem sobre rocha escura (rocha) e manchas de gelo (gelo), mais densos nas camadas altas, e o terreno não muda', () => {
    const a = new TitanGenerator(42, 9), b = new TitanGenerator(42, 10);
    let hiRock = 0, hiVein = 0, loRock = 0, loVein = 0;
    surface(b, (x, z, top, blk, s) => {
      expect(top).toBe(a.column(x, z).top);
      if (blk === T.VEIN_ROCK) expect(s).toBe(T.DARK_ROCK);
      if (blk === T.VEIN_FROST) expect(s).toBe(T.FROST);
      if (s === T.DARK_ROCK && (blk === T.VEIN_ROCK || blk === T.DARK_ROCK)) { if (top >= 72) { hiRock++; if (blk === T.VEIN_ROCK) hiVein++; } else { loRock++; if (blk === T.VEIN_ROCK) loVein++; } }
    });
    expect(hiVein / hiRock).toBeGreaterThan(loVein / loRock);
  });
  it('nunca perto das formações, abrigos e afloramentos de cobre, nem na clareira; determinístico', () => {
    const g = new TitanGenerator(42, 10), h = new TitanGenerator(42, 10), special = [...g.formations, ...g.copperSites, ...g.shelterSites];
    surface(g, (x, z, _t, blk) => {
      expect(h.blockAt(x, g.column(x, z).top, z)).toBe(blk);
      if (blk !== T.VEIN_ROCK && blk !== T.VEIN_FROST) return;
      const inFormation = g.formations.some((f) => Math.hypot(f.x - x, f.z - z) <= 1.5 && (blk === T.VEIN_ROCK || blk === T.VEIN_FROST));
      if (inFormation) return; // os 3 veios das formações existem desde a v3
      expect(special.every((s) => Math.hypot(s.x - x, s.z - z) >= 5)).toBe(true);
      const c = g.arrival.clearing; expect(x >= c.x0 && x < c.x0 + c.size && z >= c.z0 && z < c.z0 + c.size).toBe(false);
    });
  });
});
