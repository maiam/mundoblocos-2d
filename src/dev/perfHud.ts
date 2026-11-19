import type { RendererStats } from '../render/rendererContract';

/**
 * Medição de desempenho para o piloto do Mundo em 2.5D (ADR 0031, M0/M5): `?fps=1` mostra um painel pequeno com FPS, tempo de
 * quadro, o que a GPU está desenhando e a memória do JS, e um toque nele copia um relatório (JSON) para colar na conversa — ou, sem permissão de área de transferência (HTTP na rede local), mostra o JSON numa caixa para copiar à mão.
 * Disponível em qualquer build (a virada do Mundo para o 3D, v0.93.47, tirou a trava de dev/piloto);
 */

/** Intervalo entre quadros acima disto = pausa do navegador (aba escondida), não um quadro lento. */
export const PAUSE_MS = 1000;

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
  /** Cada quadro da sessão: instante (ms) e tempo desde o quadro anterior. */
  private readonly all: Array<[number, number]> = [];

  constructor(private readonly windowMs = 1000, private readonly maxAll = 6000) {}

  /** Pausas detectadas (aba em segundo plano, janela minimizada…): intervalos entre quadros acima de `PAUSE_MS`, que não contam como lentidão. */
  pauses = 0;
  pausedMs = 0;

  /** Registra um quadro apresentado no instante `now` (ms). */
  frame(now: number): void {
    const prev = this.times[this.times.length - 1];
    if (prev !== undefined && now - prev > PAUSE_MS) { // o navegador pausou a animação: não é lentidão do jogo
      this.pauses++;
      this.pausedMs += now - prev;
      this.times.length = 0;
    }
    const last = this.times[this.times.length - 1];
    this.times.push(now);
    if (last !== undefined) {
      this.all.push([now, now - last]);
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

  /**
   * Resumo da sessão a partir de `sinceMs` (use para ignorar a carga inicial): FPS médio, o dos 5% piores quadros ("1% low" costuma ser
   * o que o jogador sente), o pior quadro e a fração de quadros lentos (acima de 33 ms = abaixo de 30 FPS; acima de 50 ms = engasgo).
   */
  session(sinceMs = 0): { frames: number; avgFps: number; lowFps: number; worstMs: number; over33: number; over50: number } {
    const a = this.all.filter(([t]) => t >= sinceMs).map(([, d]) => d);
    if (a.length === 0) return { frames: 0, avgFps: 0, lowFps: 0, worstMs: 0, over33: 0, over50: 0 };
    const sorted = [...a].sort((x, y) => x - y);
    const mean = a.reduce((s, v) => s + v, 0) / a.length;
    const worst5 = sorted.slice(Math.floor(sorted.length * 0.95));
    const worstMean = worst5.reduce((s, v) => s + v, 0) / worst5.length;
    const frac = (limit: number) => a.filter((v) => v > limit).length / a.length;
    return { frames: a.length, avgFps: 1000 / mean, lowFps: 1000 / worstMean, worstMs: sorted[sorted.length - 1], over33: frac(33.4), over50: frac(50) };
  }
}

/** Estatística do tempo de `renderer.draw` (ms) numa janela de amostras. */
export function drawStats(samples: ArrayLike<number>, count: number): { avg: number; p95: number; max: number; n: number } {
  const n = Math.min(count, samples.length);
  if (n === 0) return { avg: 0, p95: 0, max: 0, n: 0 };
  const a: number[] = [];
  for (let i = 0; i < n; i++) a.push(samples[i]);
  a.sort((x, y) => x - y);
  return { avg: a.reduce((s, v) => s + v, 0) / n, p95: a[Math.floor(n * 0.95)], max: a[n - 1], n };
}

export interface PerfReport {
  url: string;
  userAgent: string;
  devicePixelRatio: number;
  viewport: [number, number];
  seconds: number;
  /** Sessão inteira (inclui a carga inicial). */
  frames: number;
  avgFps: number;
  lowFps: number;
  worstMs: number;
  /** Quantas vezes o navegador pausou a animação (aba em segundo plano…) e por quantos segundos no total: fora das médias. */
  pauses: { count: number; seconds: number };
  /** Regime estável: depois dos primeiros `WARMUP_S` segundos (a carga inicial não conta). */
  steady: { seconds: number; frames: number; avgFps: number; lowFps: number; worstMs: number; pctOver33: number; pctOver50: number };
  /** Tempo de JS de `renderer.draw` nos últimos quadros: se for pequeno e o quadro for lento, o gargalo é a GPU/compositor, não o JS. */
  jsDrawMs: { avg: number; p95: number; max: number; frames: number } | null;
  gpu: RendererStats | null;
  heapMB: number | null;
  /** Campos extras do mundo (Titã: tempo por etapa). */
  extra?: Record<string, unknown>;
}

const fmt = (n: number, d = 0) => n.toFixed(d);
/** Segundos iniciais ignorados no "regime estável" (chunks, texturas e shaders ainda estão sendo criados). */
export const WARMUP_S = 8;
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Linha de texto do painel. */
export function perfLine(s: PerfSnapshot, gpu: RendererStats | null, heapMB: number | null, jsMs: number | null = null): string {
  const parts = ['3D', `${fmt(s.fps)} fps`, `${fmt(s.avgMs, 1)} ms (pior ${fmt(s.worstMs)})`];
  if (jsMs !== null) parts.push(`JS ${fmt(jsMs, 1)} ms`);
  if (gpu) parts.push(`${gpu.calls} calls`, `${fmt(gpu.triangles / 1000, 1)}k tri`, `${gpu.textures} tex`, `${gpu.geometries} geo`);
  if (heapMB !== null) parts.push(`${fmt(heapMB)} MB`);
  if (gpu?.contextLost) parts.push('CONTEXTO PERDIDO');
  return parts.join(' · ');
}

/**
 * Relatório legível para **imprimir na tela do celular** (print): poucas linhas curtas em fonte monoespaçada, números principais primeiro.
 * `extraLines` = linhas do mundo (o Titã traz a tabela por etapa). Puro: só formata o `PerfReport`.
 */
export function formatReport(r: PerfReport, extraLines: string[] = []): string {
  const n1 = (v: number): string => v.toFixed(1);
  const lines = [
    `RELATÓRIO · ${r.seconds}s de sessão · ${r.viewport[0]}×${r.viewport[1]} @${r.devicePixelRatio}x`,
    r.steady.frames > 0
      ? `FPS estável ${n1(r.steady.avgFps)} · 5% piores ${n1(r.steady.lowFps)} · pior quadro ${r.steady.worstMs} ms`
      : `FPS ${n1(r.avgFps)} · 5% piores ${n1(r.lowFps)} · pior ${r.worstMs} ms (ainda sem ${WARMUP_S}s estáveis: jogue mais um pouco)`,
    r.steady.frames > 0 ? `quadros >33 ms: ${n1(r.steady.pctOver33)}% · >50 ms: ${n1(r.steady.pctOver50)}% · ${r.steady.frames} quadros (${r.steady.seconds}s)` : '',
    r.gpu ? `GPU ${r.gpu.calls} calls · ${n1(r.gpu.triangles / 1000)}k tri · ${r.gpu.geometries} geo · ${r.gpu.textures} tex${r.gpu.contextLost ? ' · CONTEXTO PERDIDO' : ''}` : '',
    r.jsDrawMs ? `JS do desenho: ${r.jsDrawMs.avg} ms (p95 ${r.jsDrawMs.p95}, máx ${r.jsDrawMs.max})` : '',
    r.heapMB !== null ? `memória JS ${r.heapMB} MB` : '',
    r.pauses.count ? `pausas do navegador: ${r.pauses.count} (${r.pauses.seconds}s)` : '',
    ...extraLines,
    `aparelho: ${r.userAgent.replace(/^Mozilla\/5\.0 /, '').slice(0, 90)}`,
    `url: ${r.url.replace(/^https?:\/\/[^/]+/, '')}`,
  ];
  return lines.filter((l) => l !== '').join('\n');
}

/** Cria o painel e o laço de medição. `getStats` devolve os contadores da GPU (null até o renderer existir). */
/** `extra` (opcional): linha de texto e campos a mais no relatório (o Titã mede luz, malha e geometria por etapa). */
export interface PerfExtra { line(): string; report(): Record<string, unknown>; /** Linhas de texto (em português) que entram no relatório da tela, depois dos números gerais. */ lines?(): string[]; /** Ajuste de estilo do painel (posição e quebra de linha). */ style?: Partial<CSSStyleDeclaration> }

export function startPerfHud(getStats: () => RendererStats | null, getDraw?: () => { samples: ArrayLike<number>; count: number }, extra?: PerfExtra): () => void {
  const meter = new PerfMeter();
  const t0 = performance.now();
  const box = document.createElement('div');
  Object.assign(box.style, {
    position: 'fixed', left: '6px', top: '6px', zIndex: '9999', font: '11px/1.35 ui-monospace, Menlo, monospace', color: '#fff',
    background: 'rgba(10,6,24,0.72)', padding: '4px 7px', borderRadius: '6px', touchAction: 'manipulation',
    userSelect: 'none', whiteSpace: 'nowrap', maxWidth: 'calc(100vw - 12px)', overflow: 'hidden',
  } as Partial<CSSStyleDeclaration>);
  if (extra?.style) Object.assign(box.style, extra.style);
  box.title = 'Toque para abrir o relatório';
  document.body.appendChild(box);
  const heap = (): number | null => {
    const m = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
    return m ? m.usedJSHeapSize / 1048576 : null;
  };
  const draw = () => { const d = getDraw?.(); return d ? drawStats(d.samples, d.count) : null; };
  const report = (): PerfReport => {
    const s = meter.session();
    const st = meter.session(t0 + WARMUP_S * 1000);
    const d = draw();
    return {
      url: location.href, userAgent: navigator.userAgent, devicePixelRatio: window.devicePixelRatio,
      viewport: [window.innerWidth, window.innerHeight], seconds: Math.round((performance.now() - t0) / 1000),
      pauses: { count: meter.pauses, seconds: Math.round(meter.pausedMs / 1000) },
      frames: s.frames, avgFps: round1(s.avgFps), lowFps: round1(s.lowFps), worstMs: Math.round(s.worstMs),
      steady: {
        seconds: Math.max(0, Math.round((performance.now() - t0) / 1000) - WARMUP_S), frames: st.frames, avgFps: round1(st.avgFps),
        lowFps: round1(st.lowFps), worstMs: Math.round(st.worstMs), pctOver33: round1(st.over33 * 100), pctOver50: round1(st.over50 * 100),
      },
      jsDrawMs: d && d.n ? { avg: round1(d.avg), p95: round1(d.p95), max: round1(d.max), frames: d.n } : null,
      gpu: getStats(), heapMB: heap() === null ? null : Math.round(heap()!),
      ...(extra ? { extra: extra.report() } : {}),
    };
  };
  let sheet: HTMLDivElement | null = null;
  let raf = 0;
  const loop = (now: number) => { meter.frame(now); raf = requestAnimationFrame(loop); };
  raf = requestAnimationFrame(loop);
  let holdUntil = 0; // mensagens ('copiado', instruções) ficam um tempo antes da linha de medição voltar
  const timer = window.setInterval(() => {
    if (sheet || performance.now() < holdUntil) return; // com o relatório aberto o painel fica parado
    const d = draw();
    box.textContent = perfLine(meter.snapshot(), getStats(), heap(), d && d.n ? d.avg : null) + (extra ? ` | ${extra.line()}` : '');
  }, 500);
  /**
   * Toque no painel: relatório **legível na tela** (para tirar print no celular), com os botões Atualizar, Copiar JSON e Fechar. O JSON completo continua
   * disponível (Copiar JSON; se o navegador não liberar a área de transferência, ele aparece numa caixa de texto selecionada).
   */
  const closeSheet = (): void => { sheet?.remove(); sheet = null; };
  const openSheet = (): void => {
    closeSheet();
    const box2 = document.createElement('div');
    Object.assign(box2.style, {
      position: 'fixed', left: '6px', top: '6px', maxWidth: 'calc(100vw - 12px)', maxHeight: 'calc(100vh - 12px)', overflow: 'auto', zIndex: '10000',
      background: 'rgba(10,6,24,0.96)', color: '#fff', border: '1px solid #8a7cff', borderRadius: '6px', padding: '8px 10px', touchAction: 'manipulation',
    } as Partial<CSSStyleDeclaration>);
    const pre = document.createElement('pre');
    Object.assign(pre.style, { margin: '0 0 6px', font: '11px/1.4 ui-monospace, Menlo, monospace', whiteSpace: 'pre-wrap', userSelect: 'text' } as Partial<CSSStyleDeclaration>);
    const render = (): void => { pre.textContent = formatReport(report(), extra?.lines?.() ?? []); };
    render();
    const row = document.createElement('div');
    row.style.display = 'flex'; row.style.gap = '6px';
    const btn = (label: string, on: () => void): void => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = label;
      Object.assign(b.style, { font: '12px system-ui, sans-serif', padding: '6px 10px', borderRadius: '4px', border: '1px solid #8a7cff', background: '#241c4a', color: '#fff', touchAction: 'manipulation' } as Partial<CSSStyleDeclaration>);
      b.addEventListener('click', (e) => { e.stopPropagation(); on(); });
      row.appendChild(b);
    };
    btn('Atualizar', render);
    btn('Copiar JSON', () => {
      const json = JSON.stringify(report(), null, 2);
      const clip = navigator.clipboard;
      const fallback = (): void => { pre.textContent = json; const r = document.createRange(); r.selectNodeContents(pre); const sel = getSelection(); sel?.removeAllRanges(); sel?.addRange(r); };
      if (clip?.writeText) void clip.writeText(json).then(() => { pre.textContent = 'JSON copiado ✓ (toque em Atualizar para ver o relatório de novo)'; }, fallback);
      else fallback();
    });
    btn('Fechar', closeSheet);
    box2.append(pre, row);
    box2.addEventListener('click', (e) => e.stopPropagation());
    document.body.appendChild(box2);
    sheet = box2;
  };
  box.addEventListener('click', () => { if (sheet) closeSheet(); else openSheet(); });
  return () => { cancelAnimationFrame(raf); clearInterval(timer); box.remove(); };
}
