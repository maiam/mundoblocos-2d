import type { RendererStats } from '../render/rendererContract';

/**
 * Medição de desempenho para o piloto do Mundo em 2.5D (ADR 0031, M0/M5): `?fps=1` mostra um painel pequeno com FPS, tempo de
 * quadro, o que a GPU está desenhando e a memória do JS, e um toque nele copia um relatório (JSON) para colar na conversa.
 * Só em desenvolvimento ou no build de piloto (`VITE_PILOT_3D=1`); funciona também no 2D (sem contadores da GPU), para comparar.
 */

export interface PerfSnapshot {
  /** Quadros por segundo na janela atual (~1 s). */
  fps: number;
  /** Tempo médio e o pior de um quadro na janela, em ms. */
  avgMs: number;
  worstMs: number;
}

/** Janela deslizante de tempos de quadro (pura: recebe o tempo, não lê relógio). */
export class PerfMeter {
  private readonly times: number[] = [];
  private readonly all: number[] = [];

  constructor(private readonly windowMs = 1000, private readonly maxAll = 6000) {}

  /** Registra um quadro apresentado no instante `now` (ms). */
  frame(now: number): void {
    const last = this.times[this.times.length - 1];
    this.times.push(now);
    if (last !== undefined) {
      this.all.push(now - last);
      if (this.all.length > this.maxAll) this.all.shift();
    }
    while (this.times.length > 2 && now - this.times[0] > this.windowMs) this.times.shift();
  }

  snapshot(): PerfSnapshot {
    const t = this.times;
    if (t.length < 2) return { fps: 0, avgMs: 0, worstMs: 0 };
    const span = t[t.length - 1] - t[0];
    let worst = 0;
    for (let i = 1; i < t.length; i++) worst = Math.max(worst, t[i] - t[i - 1]);
    return { fps: span > 0 ? ((t.length - 1) * 1000) / span : 0, avgMs: span / (t.length - 1), worstMs: worst };
  }

  /** Resumo da sessão: FPS médio e o dos 5% piores quadros ("1% low" costuma ser o que o jogador sente). */
  session(): { frames: number; avgFps: number; lowFps: number; worstMs: number } {
    const a = this.all;
    if (a.length === 0) return { frames: 0, avgFps: 0, lowFps: 0, worstMs: 0 };
    const sorted = [...a].sort((x, y) => x - y);
    const mean = a.reduce((s, v) => s + v, 0) / a.length;
    const worst5 = sorted.slice(Math.floor(sorted.length * 0.95));
    const worstMean = worst5.reduce((s, v) => s + v, 0) / worst5.length;
    return { frames: a.length, avgFps: 1000 / mean, lowFps: 1000 / worstMean, worstMs: sorted[sorted.length - 1] };
  }
}

export interface PerfReport {
  renderer: '3d' | '2d';
  url: string;
  userAgent: string;
  devicePixelRatio: number;
  viewport: [number, number];
  seconds: number;
  frames: number;
  avgFps: number;
  lowFps: number;
  worstMs: number;
  gpu: RendererStats | null;
  heapMB: number | null;
}

const fmt = (n: number, d = 0) => n.toFixed(d);

/** Linha de texto do painel. */
export function perfLine(mode: '3d' | '2d', s: PerfSnapshot, gpu: RendererStats | null, heapMB: number | null): string {
  const parts = [mode.toUpperCase(), `${fmt(s.fps)} fps`, `${fmt(s.avgMs, 1)} ms (pior ${fmt(s.worstMs)})`];
  if (gpu) parts.push(`${gpu.calls} calls`, `${fmt(gpu.triangles / 1000, 1)}k tri`, `${gpu.textures} tex`, `${gpu.geometries} geo`);
  if (heapMB !== null) parts.push(`${fmt(heapMB)} MB`);
  if (gpu?.contextLost) parts.push('CONTEXTO PERDIDO');
  return parts.join(' · ');
}

/** Cria o painel e o laço de medição. `getStats` devolve os contadores da GPU (null no 2D). */
export function startPerfHud(getStats: () => RendererStats | null): () => void {
  const meter = new PerfMeter();
  const t0 = performance.now();
  const box = document.createElement('div');
  Object.assign(box.style, {
    position: 'fixed', left: '6px', top: '6px', zIndex: '9999', font: '11px/1.35 ui-monospace, Menlo, monospace', color: '#fff',
    background: 'rgba(10,6,24,0.72)', padding: '4px 7px', borderRadius: '6px', touchAction: 'manipulation',
    userSelect: 'none', whiteSpace: 'nowrap', maxWidth: 'calc(100vw - 12px)', overflow: 'hidden',
  } as Partial<CSSStyleDeclaration>);
  box.title = 'Toque para copiar o relatório';
  document.body.appendChild(box);
  const mode = (): '3d' | '2d' => (getStats() ? '3d' : '2d');
  const heap = (): number | null => {
    const m = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
    return m ? m.usedJSHeapSize / 1048576 : null;
  };
  const report = (): PerfReport => {
    const s = meter.session();
    return {
      renderer: mode(), url: location.href, userAgent: navigator.userAgent, devicePixelRatio: window.devicePixelRatio,
      viewport: [window.innerWidth, window.innerHeight], seconds: Math.round((performance.now() - t0) / 1000),
      frames: s.frames, avgFps: Math.round(s.avgFps * 10) / 10, lowFps: Math.round(s.lowFps * 10) / 10,
      worstMs: Math.round(s.worstMs), gpu: getStats(), heapMB: heap() === null ? null : Math.round(heap()!),
    };
  };
  let raf = 0;
  const loop = (now: number) => { meter.frame(now); raf = requestAnimationFrame(loop); };
  raf = requestAnimationFrame(loop);
  const timer = window.setInterval(() => { box.textContent = perfLine(mode(), meter.snapshot(), getStats(), heap()); }, 500);
  box.addEventListener('click', () => {
    const text = JSON.stringify(report(), null, 2);
    void navigator.clipboard?.writeText(text).then(() => { box.textContent = 'Relatório copiado ✓'; }, () => { box.textContent = text; });
  });
  return () => { cancelAnimationFrame(raf); clearInterval(timer); box.remove(); };
}
