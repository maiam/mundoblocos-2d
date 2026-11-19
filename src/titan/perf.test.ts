import { describe, expect, it } from 'vitest';
import { TitanPerf } from './perf';
import { autoEditStep, buildLanternScene, lanternSpots } from './scene';
import { openSession } from './session';
import { MemoryTitanStorage } from './save';
import { T } from './voxel';

describe('medição por etapa', () => {
  it('média, p95 e máximo por etapa; guarda só as últimas amostras', () => {
    const p = new TitanPerf();
    for (let i = 1; i <= 100; i++) p.record('mesh', i);
    expect(p.stats('mesh')).toEqual({ n: 100, avg: 50.5, p95: 96, max: 100 });
    for (let i = 0; i < 2500; i++) p.record('luz', 1);
    expect(p.stats('luz').n).toBe(2000);
    expect(p.stats('nada')).toEqual({ n: 0, avg: 0, p95: 0, max: 0 });
    p.count('sections', 3); p.count('sections');
    expect(p.report().counters.sections).toBe(4);
    expect(Object.keys(p.report().stages)).toEqual(['luz', 'mesh']);
    expect(p.line()).toContain('lanternas 0');
  });
});

describe('cena de lanternas (só desenvolvimento)', () => {
  const open = async () => openSession(new MemoryTitanStorage(), 42, () => 1);

  it('põe n lanternas acesas em terra seca perto da chegada, sempre nas mesmas posições', async () => {
    const a = await open(), b = await open();
    const spotsA = buildLanternScene(a, 12), spotsB = lanternSpots(b, 12);
    expect(spotsA).toHaveLength(12);
    expect(spotsA).toEqual(spotsB);
    for (const [x, y, z] of spotsA) {
      expect(a.volume.get(x, y, z)).toBe(T.LANTERN);
      expect(a.volume.light(x, y, z)).toBe(15);
      expect(a.volume.get(x, y - 1, z)).not.toBe(T.LAKE);
    }
    expect(a.volume.lanternCells()).toHaveLength(12);
  });

  it('"editar sem parar" alterna colocar e retirar e, em número par de passos, deixa o volume como estava', async () => {
    const s = await open();
    const spots = buildLanternScene(s, 6);
    const before = s.volume.editCount;
    s.volume.takeTouched();
    for (let i = 0; i < 24; i++) autoEditStep(s, spots, i);
    expect(s.volume.editCount).toBe(before);
    expect(s.volume.takeTouched().length).toBeGreaterThan(0); // refez malhas: é isso que o teste mede
  });

  it('a luz mede o próprio recálculo e só recalcula quando algo muda', async () => {
    const s = await open();
    const times: number[] = [];
    s.volume.onLightMs = (ms) => times.push(ms);
    const [x, y, z] = buildLanternScene(s, 1)[0];
    s.volume.light(x, y, z); s.volume.light(x, y, z); s.volume.light(x + 1, y, z);
    expect(times).toHaveLength(1); // 3 consultas, 1 recálculo
    s.volume.place(x, y + 1, z, T.SAND);
    s.volume.light(x, y, z);
    expect(times).toHaveLength(2);
    expect(times.every((t) => t >= 0)).toBe(true);
  });
});
