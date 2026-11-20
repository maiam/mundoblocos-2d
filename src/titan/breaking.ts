import { T } from './voxel';

/**
 * Tempos de quebra e estágios de rachadura do Titã (ADR 0042). Puro. Os tempos são **totais desde a pressão**: os primeiros 200 ms são a espera que
 * separa o toque curto (coloca) da pressão mantida (quebra); o progresso só começa depois deles.
 */
export const HOLD_MS = 200;
export const CRACK_STAGES = 10;
/** Tolerância de arrasto no toque (px CSS) e no movimento relativo do mouse capturado: acima disso o gesto vira câmera. */
export const DRAG_TOLERANCE_PX = 10;

/** O que está na mira: bloco, lanterna instalada ou lasca solta (item de superfície). */
export type TargetKind = 'block' | 'lantern' | 'shard';

/** Tempos iniciais totais (ms), desde a pressão. */
export const BREAK_MS = { sand: 600, ice: 1200, rock: 1600, slab: 1000, collect: 350 } as const;

/** Tempo total para concluir a ação sobre o alvo, ou `null` se não há o que quebrar (rocha-mãe, líquido). */
export function breakTotalMs(kind: TargetKind, block?: number, pick = false): number | null {
  if (kind === 'lantern' || kind === 'shard') return BREAK_MS.collect;
  if (block === T.VEIN_COPPER) return pick ? Math.round(BREAK_MS.rock * PICK_FACTOR) : null; // só uma picareta o quebra (ADR 0063)
  const t = baseBreakMs(block);
  return t !== null && pick && ROCK_CLASS.has(block as number) ? Math.round(t * PICK_FACTOR) : t;
}

/** Com picareta, os blocos de rocha cedem nesta fração do tempo (provisório, ADR 0063). */
export const PICK_FACTOR = 0.6;
const ROCK_CLASS: ReadonlySet<number> = new Set([T.DARK_ROCK, T.VEIN_ROCK, T.SLAB, T.SLAB_TOP, T.SLAB_DOUBLE]);

function baseBreakMs(block?: number): number | null {
  switch (block) {
    case T.SAND: case T.DAMP_SAND: return BREAK_MS.sand;
    case T.FROST: case T.VEIN_FROST: return BREAK_MS.ice;
    case T.DARK_ROCK: case T.VEIN_ROCK: case T.WORKBENCH: case T.WORKBENCH_90: case T.WORKBENCH_180: case T.WORKBENCH_270: return BREAK_MS.rock;
    case T.MARCO: case T.MARCO_90: case T.MARCO_180: case T.MARCO_270: case T.PAINEL: case T.PAINEL_Z: return BREAK_MS.collect; // peças pequenas da margem: recolhidas como a lanterna
    case T.SLAB_DOUBLE: return BREAK_MS.rock; // duas lajes juntas: como o cubo de rocha
    case T.SLAB: case T.SLAB_TOP: return BREAK_MS.slab; // meio bloco de rocha: mais rápida que o cubo
    case T.EMBER: return BREAK_MS.ice; // depósito de brasa: cristal em rocha mole, como o gelo
    default: return null;
  }
}

/** Progresso 0–1: `(tempoPressionado − 200 ms) / (tempoTotal − 200 ms)`, limitado. */
export function breakProgress(elapsedMs: number, totalMs: number): number {
  const span = totalMs - HOLD_MS;
  if (span <= 0) return elapsedMs >= totalMs ? 1 : 0;
  return Math.min(1, Math.max(0, (elapsedMs - HOLD_MS) / span));
}

/** Estágio de rachadura (0–9) para um progresso 0–1: o estágio 0 aparece assim que a quebra começa (200 ms). */
export function crackStage(progress: number): number {
  return Math.min(CRACK_STAGES - 1, Math.max(0, Math.floor(progress * CRACK_STAGES)));
}
