import { describe, expect, it } from 'vitest';
import { TitanGenerator } from './generator';
import { MemoryTitanStorage } from './save';
import { initialSections } from './sections';
import { flush, openSession } from './session';
import { TitanVolume } from './volume';
import { inRegion, regionFor, REGION_LEGACY, REGION_V6, T } from './voxel';

describe('região por versão do gerador (ADR 0062)', () => {
  it('v1–v5 = 64 × 64; v6 em diante = 128 × 128; as bordas são fechadas pela parede invisível', () => {
    for (const v of [1, 2, 3, 4, 5]) expect(regionFor(v)).toEqual(REGION_LEGACY);
    expect(regionFor(6)).toEqual(REGION_V6); expect(regionFor(7)).toEqual(REGION_V6);
    const old = new TitanVolume(new TitanGenerator(42, 5)), nu = new TitanVolume(new TitanGenerator(42));
    expect(inRegion(40, 0, REGION_LEGACY)).toBe(false); expect(inRegion(40, 0, REGION_V6)).toBe(true);
    expect(old.solidForBody(40, 100, 0)).toBe(true); expect(old.editable(40, 70, 0)).toBe(false); // fora da região antiga
    expect(nu.solidForBody(40, 100, 0)).toBe(false); expect(nu.editable(40, 70, 0)).toBe(true);
    for (const [x, z] of [[-65, 0], [64, 0], [0, -65], [0, 64]]) { expect(nu.solidForBody(x, 100, z)).toBe(true); expect(nu.editable(x, 70, z)).toBe(false); }
    expect(nu.editable(-64, 70, 63)).toBe(true); expect(nu.editable(63, 70, -64)).toBe(true);
  });
  it('v6: toda a região tem chão (sem buraco até a rocha-mãe), o relevo é limitado e a chegada, a toca, as plantas e as formações ficam dentro da região', () => {
    for (const seed of [1, 7, 42, 99, 150]) {
      const g = new TitanGenerator(seed);
      for (let x = -64; x < 64; x += 3) for (let z = -64; z < 64; z += 3) { const t = g.column(x, z).top; expect(t).toBeGreaterThanOrEqual(53); expect(t).toBeLessThanOrEqual(90); }
      const inside = (p: { x: number; z: number }): boolean => g.inRegion(p.x, p.z);
      expect(inside(g.arrival)).toBe(true); expect(inside(g.den!)).toBe(true);
      expect(g.nutPlants.every(inside)).toBe(true); expect(g.formations.every(inside)).toBe(true);
      expect(g.reeds.every(inside)).toBe(true);
    }
  });
  it('v6 é determinística por seed; a v5 de uma seed continua igual (mesma chegada de antes da v6)', () => {
    const a = new TitanGenerator(42), b = new TitanGenerator(42);
    expect(a.arrival).toEqual(b.arrival); expect(a.nutPlants).toEqual(b.nutPlants); expect(a.column(60, -60)).toEqual(b.column(60, -60));
    const v5 = new TitanGenerator(42, 5);
    expect(v5.arrival.x).toBeGreaterThan(-32); expect(v5.arrival.x).toBeLessThan(32); // a v5 não vê o mundo novo
    expect(v5.nutPlants.every((p) => p.x >= -32 && p.x < 32 && p.z >= -32 && p.z < 32)).toBe(true);
  });
  it('seções iniciais cobrem os 64 chunks da v6 (e só os 16 da v5)', () => {
    const cols = (v: TitanVolume): number => new Set(initialSections(v).map((k) => k.split(',').filter((_, i) => i !== 1).join(','))).size;
    expect(cols(new TitanVolume(new TitanGenerator(42, 5)))).toBe(16);
    expect(cols(new TitanVolume(new TitanGenerator(42)))).toBe(64);
  });
  it('a luz de uma lanterna cruza a antiga borda (x = 32) e para na nova (x = 64); editar e salvar no canto novo persiste', async () => {
    const v = new TitanVolume(new TitanGenerator(42));
    const y = 120;
    expect(v.place(30, y, 0, T.LANTERN)).toBe(true);
    expect(v.light(33, y, 0)).toBeGreaterThan(0); // além do limite antigo
    expect(v.place(62, y, 0, T.LANTERN)).toBe(true);
    expect(v.light(63, y, 0)).toBeGreaterThan(0); expect(v.light(64, y, 0)).toBe(0); // fora da região: sem luz
    const st = new MemoryTitanStorage();
    const s = await openSession(st, 42, () => 1);
    expect(s.volume.place(50, 120, -50, T.DARK_ROCK)).toBe(true); expect(s.volume.place(-60, 120, 60, T.SAND)).toBe(true);
    await flush(st, s);
    const r = await openSession(st, null, () => 1);
    expect(r.volume.get(50, 120, -50)).toBe(T.DARK_ROCK); expect(r.volume.get(-60, 120, 60)).toBe(T.SAND);
    expect(r.volume.gen.version).toBe(12);
  });
});
