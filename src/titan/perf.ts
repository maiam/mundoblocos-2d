/**
 * Medição do Titã (v0.95.1): tempo de cada etapa separado — luz, malha (CPU), criação da geometria e desenho (incluindo o envio à GPU no quadro em que
 * a malha nova aparece) — para decidir com número se o gargalo pede worker, antes de mover trabalho de lugar. Puro (sem DOM): recebe tempos em ms.
 */
export interface StageStats { n: number; avg: number; p95: number; max: number }

const CAP = 2000;
const r2 = (n: number): number => Math.round(n * 100) / 100;

export class TitanPerf {
  private readonly stages = new Map<string, number[]>();
  private readonly counters = new Map<string, number>();

  /** Guarda uma amostra (as últimas `CAP` de cada etapa). */
  record(stage: string, ms: number): void {
    let a = this.stages.get(stage);
    if (!a) { a = []; this.stages.set(stage, a); }
    a.push(ms);
    if (a.length > CAP) a.shift();
  }

  count(name: string, by = 1): void { this.counters.set(name, (this.counters.get(name) ?? 0) + by); }
  counter(name: string): number { return this.counters.get(name) ?? 0; }

  samples(stage: string): number[] { return this.stages.get(stage) ?? []; }

  stats(stage: string): StageStats {
    const a = this.stages.get(stage);
    if (!a || a.length === 0) return { n: 0, avg: 0, p95: 0, max: 0 };
    const s = [...a].sort((x, y) => x - y);
    return { n: s.length, avg: r2(s.reduce((t, v) => t + v, 0) / s.length), p95: r2(s[Math.min(s.length - 1, Math.floor(s.length * 0.95))]), max: r2(s[s.length - 1]) };
  }

  /** Todas as etapas medidas (para o relatório). */
  report(): { stages: Record<string, StageStats>; counters: Record<string, number> } {
    const stages: Record<string, StageStats> = {};
    for (const k of [...this.stages.keys()].sort()) stages[k] = this.stats(k);
    return { stages, counters: Object.fromEntries([...this.counters].sort()) };
  }

  /** Linha curta do painel: média e p95 de cada etapa, em ms. */
  line(): string {
    const part = (label: string, stage: string): string => { const s = this.stats(stage); return s.n ? `${label} ${s.avg.toFixed(1)}/${s.p95.toFixed(1)}` : `${label} –`; };
    return [part('luz', 'light'), part('malha', 'mesh'), part('geo', 'geom'), part('quadro+malha', 'drawAfterBuild'), `lanternas ${this.counter('lanterns')}`, `seções ${this.counter('sections')}`].join(' · ') + ' (ms média/p95)';
  }
}
