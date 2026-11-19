import { describe, expect, it } from 'vitest';
import { formatReport, type PerfReport } from '../dev/perfHud';
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

describe('relatório na tela do celular (para print)', () => {
  const base: PerfReport = {
    url: 'https://orvalis.pensamentos.online/?mundo=titan&seed=42&fps=1', userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36',
    devicePixelRatio: 3, viewport: [844, 390], seconds: 42, frames: 2300, avgFps: 57.3, lowFps: 40.1, worstMs: 71,
    pauses: { count: 0, seconds: 0 }, steady: { seconds: 34, frames: 1900, avgFps: 58.2, lowFps: 41.4, worstMs: 34, pctOver33: 3.1, pctOver50: 0.2 },
    jsDrawMs: { avg: 0.3, p95: 0.5, max: 4.1, frames: 800 }, gpu: { calls: 28, triangles: 14586, geometries: 28, textures: 1, contextLost: false }, heapMB: 31,
  };

  it('traz os números principais primeiro, curtos e em português, com a tabela do Titã e o aparelho', () => {
    const perf = new TitanPerf();
    for (let i = 0; i < 20; i++) { perf.record('mesh', 1 + i / 10); perf.record('light', 0.5); perf.record('buildFrame', 4); perf.record('draw', 0.3); }
    perf.count('sections', 120); perf.count('lanterns', 12);
    const text = formatReport(base, ['cena: 12 lanternas', ...perf.reportLines()]);
    const lines = text.split('\n');
    expect(lines[0]).toBe('RELATÓRIO · 42s de sessão · 844×390 @3x');
    expect(lines[1]).toBe('FPS estável 58.2 · 5% piores 41.4 · pior quadro 34 ms');
    expect(text).toContain('quadros >33 ms: 3.1% · >50 ms: 0.2%');
    expect(text).toContain('GPU 28 calls · 14.6k tri · 28 geo · 1 tex');
    expect(text).toContain('luz');
    expect(text).toContain('malha do quadro');
    expect(text).toContain('seções refeitas 120 · lanternas 12');
    expect(text).toContain('Pixel 8');
    expect(text).not.toContain('Mozilla/5.0');
    expect(lines.length).toBeLessThanOrEqual(18); // cabe numa tela de celular em paisagem
    expect(lines.every((l) => l.length <= 100)).toBe(true);
  });

  it('antes dos primeiros segundos estáveis avisa para jogar mais um pouco; não mostra campos vazios', () => {
    const text = formatReport({ ...base, steady: { seconds: 0, frames: 0, avgFps: 0, lowFps: 0, worstMs: 0, pctOver33: 0, pctOver50: 0 }, jsDrawMs: null, gpu: null, heapMB: null });
    expect(text).toContain('jogue mais um pouco');
    expect(text).not.toContain('GPU');
    expect(text).not.toContain('memória');
    expect(text.split('\n').some((l) => l === '')).toBe(false);
  });
});
