import { describe, expect, it } from 'vitest';
import { drawStats, PAUSE_MS, PerfMeter, perfLine, WARMUP_S } from './perfHud';

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

  it('regime estável: ignora a carga inicial e conta a fração de quadros lentos (> 33 ms e > 50 ms)', () => {
    const m = new PerfMeter();
    let t = 0;
    for (let i = 0; i < 40; i++) { t += 120; m.frame(t); }        // carga inicial: 8 fps por ~5 s
    const warm = t;
    for (let i = 0; i < 95; i++) { t += 10; m.frame(t); }          // depois: 100 fps
    for (let i = 0; i < 5; i++) { t += 60; m.frame(t); }           // 5% de engasgos de 60 ms
    const all = m.session();
    const steady = m.session(warm + 1);
    expect(steady.frames).toBe(100);
    expect(steady.avgFps).toBeGreaterThan(all.avgFps * 3);          // a carga inicial puxava a média para baixo
    expect(steady.over33).toBeCloseTo(0.05);
    expect(steady.over50).toBeCloseTo(0.05);
    expect(steady.worstMs).toBe(60);
    expect(WARMUP_S).toBeGreaterThan(0);
  });

  it('tempo de JS do draw: média, p95 e máximo sobre as amostras escritas no anel', () => {
    expect(drawStats(new Float32Array(10), 0)).toEqual({ avg: 0, p95: 0, max: 0, n: 0 });
    const ring = new Float32Array(100);
    for (let i = 0; i < 100; i++) ring[i] = i < 95 ? 2 : 10;       // 95 quadros de 2 ms e 5 de 10 ms
    const s = drawStats(ring, 100);
    expect(s.n).toBe(100);
    expect(s.avg).toBeCloseTo(2.4, 5);
    expect(s.p95).toBe(10);
    expect(s.max).toBe(10);
    expect(drawStats(ring, 1000).n).toBe(100);                        // contagem maior que o anel: usa só o que cabe
    expect(perfLine('3d', { fps: 60, avgMs: 16.7, worstMs: 20 }, null, null, 2.4)).toContain('JS 2.4 ms');
  });

  it('pausa do navegador (aba em segundo plano) não conta como quadro lento: sai das médias e vira "pausas"', () => {
    const m = new PerfMeter();
    let t = 0;
    for (let i = 0; i < 120; i++) { t += 16.7; m.frame(t); }      // 60 fps
    t += 15400; m.frame(t);                                         // a aba ficou escondida 15 s
    for (let i = 0; i < 120; i++) { t += 16.7; m.frame(t); }
    expect(m.pauses).toBe(1);
    expect(m.pausedMs).toBeCloseTo(15400, 0);
    const s = m.session();
    expect(s.worstMs).toBeLessThan(PAUSE_MS);                       // o pior quadro de 15 s não entra
    expect(s.avgFps).toBeCloseTo(60, 0);
    expect(s.over50).toBe(0);
    expect(m.snapshot().fps).toBeCloseTo(60, 0);
  });
});

