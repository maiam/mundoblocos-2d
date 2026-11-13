import { describe, expect, it } from 'vitest';
import { PerfMeter, perfLine } from './perfHud';

describe('PerfMeter (medidor do painel ?fps=1)', () => {
  it('60 fps constantes: fps ≈ 60, tempo médio ≈ 16,7 ms, pior = o mesmo', () => {
    const m = new PerfMeter();
    for (let i = 0; i < 90; i++) m.frame(i * (1000 / 60));
    const s = m.snapshot();
    expect(s.fps).toBeCloseTo(60, 0);
    expect(s.avgMs).toBeCloseTo(16.67, 1);
    expect(s.worstMs).toBeCloseTo(16.67, 1);
  });

  it('a janela é de ~1 s: depois de uma fase lenta, volta a medir só o recente; o pior aparece', () => {
    const m = new PerfMeter();
    let t = 0;
    for (let i = 0; i < 20; i++) { t += 100; m.frame(t); } // 10 fps por 2 s
    for (let i = 0; i < 60; i++) { t += 20; m.frame(t); }  // 50 fps depois
    expect(m.snapshot().fps).toBeCloseTo(50, 0);
    m.frame(t += 200); // um engasgo
    expect(m.snapshot().worstMs).toBe(200);
  });

  it('sem quadros suficientes, tudo zero; resumo da sessão separa a média dos piores 5%', () => {
    const m = new PerfMeter();
    expect(m.snapshot()).toEqual({ fps: 0, avgMs: 0, worstMs: 0 });
    expect(m.session().frames).toBe(0);
    let t = 0;
    for (let i = 0; i < 100; i++) { t += i % 20 === 0 ? 100 : 10; m.frame(t); } // 1 em 20 quadros engasga
    const s = m.session();
    expect(s.frames).toBe(99);
    expect(s.lowFps).toBeLessThan(s.avgFps);
    expect(s.worstMs).toBe(100);
  });

  it('linha do painel: 3D com contadores da GPU e memória; 2D só com tempos; contexto perdido avisa', () => {
    const snap = { fps: 58.4, avgMs: 17.1, worstMs: 24 };
    const gpu = { calls: 169, triangles: 5512, geometries: 42, textures: 49, contextLost: false };
    expect(perfLine('3d', snap, gpu, 64.2)).toBe('3D · 58 fps · 17.1 ms (pior 24) · 169 calls · 5.5k tri · 49 tex · 42 geo · 64 MB');
    expect(perfLine('2d', snap, null, null)).toBe('2D · 58 fps · 17.1 ms (pior 24)');
    expect(perfLine('3d', snap, { ...gpu, contextLost: true }, null)).toContain('CONTEXTO PERDIDO');
  });
});
