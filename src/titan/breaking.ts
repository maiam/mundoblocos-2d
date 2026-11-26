import type { Tier } from './items';
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
export type TargetKind = 'block' | 'lantern' | 'shard' | 'creature';

/** Tempos iniciais totais (ms), desde a pressão. */
export const BREAK_MS = { sand: 600, ice: 1200, rock: 1600, slab: 1000, collect: 350, wood: 1000, leaves: 400 } as const;

/** Tempo total para concluir a ação sobre o alvo, ou `null` se não há o que quebrar (rocha-mãe, líquido). */
export function breakTotalMs(kind: TargetKind, block?: number, pick: Tier | boolean | null = false): number | null {
  if (kind === 'creature') return null; // animal na mira: o toque curto golpeia, segurar não quebra nada (ADR 0069)
  if (kind === 'lantern' || kind === 'shard') return BREAK_MS.collect;
  const tier: Tier | null = pick === true ? 'rock' : pick || null;
  if (block === T.VEIN_COPPER || block === T.EMBER_VEIN) return tier ? Math.round(BREAK_MS.rock * PICK_FACTOR[tier]) : null; // só uma picareta o quebra (ADR 0063)
  const t = baseBreakMs(block);
  return t !== null && tier && ROCK_CLASS.has(block as number) ? Math.round(t * PICK_FACTOR[tier]) : t;
}

/** Com picareta, os blocos de rocha cedem nesta fração do tempo, por nível (provisório, ADR 0063 e 0065). */
export const PICK_FACTOR: Readonly<Record<Tier, number>> = { rock: 0.6, copper: 0.4 };
const ROCK_CLASS: ReadonlySet<number> = new Set([T.DARK_ROCK, T.VEIN_ROCK, T.SLAB, T.SLAB_TOP, T.SLAB_DOUBLE, T.BRAZIER, T.BRAZIER_LIT, T.CARAPACE, T.EMBER_BLOCK, T.CHEST, T.CHEST_90, T.CHEST_180, T.CHEST_270, T.STONE, T.STONE_SMOOTH, T.STONE_BRICK, T.STONE_STAIR, T.STONE_STAIR_90, T.STONE_STAIR_180, T.STONE_STAIR_270, T.STONE_SLAB, T.STONE_SLAB_TOP]);

function baseBreakMs(block?: number): number | null {
  if (block !== undefined && block >= T.DOOR && block <= T.DOOR_LAST) return BREAK_MS.slab; // a porta cede como os móveis de junco (ADR 0102)
  switch (block) {
    case T.GRASS: case T.DIRT: case T.BEACH: return BREAK_MS.sand; // Orvalis em voxel (ADR 0105): terra, grama e areia da praia cedem como a areia
    case T.STONE: case T.STONE_SMOOTH: case T.STONE_BRICK: return BREAK_MS.rock; // pedra de obra (ADR 0108)
    case T.STONE_SLAB: case T.STONE_SLAB_TOP: case T.STONE_STAIR: case T.STONE_STAIR_90: case T.STONE_STAIR_180: case T.STONE_STAIR_270: return BREAK_MS.slab; // meio bloco: mais rápida que o cubo
    case T.LOG_OAK: case T.LOG_CHERRY: case T.LOG_BIRCH: case T.PLANKS_OAK: case T.PLANKS_CHERRY: case T.PLANKS_BIRCH: case T.CARPENTRY: case T.CARPENTRY_90: case T.CARPENTRY_180: case T.CARPENTRY_270: return BREAK_MS.wood; // tábuas e mesa (ADR 0107)
    case T.LEAVES_OAK: case T.LEAVES_CHERRY: case T.LEAVES_BIRCH: return BREAK_MS.leaves;
    case T.SAND: case T.DAMP_SAND: case T.REED_BLOCK: return BREAK_MS.sand; // o bloco de junco cede como a areia (ADR 0100)
    case T.REED_SLAB: case T.REED_SLAB_TOP: return BREAK_MS.slab;
    case T.REED_STAIR: case T.REED_STAIR_90: case T.REED_STAIR_180: case T.REED_STAIR_270: case T.REED_CHAIR: case T.REED_CHAIR_90: case T.REED_CHAIR_180: case T.REED_CHAIR_270: return BREAK_MS.slab; // móveis de junco: cedem como a laje
    case T.FROST: case T.VEIN_FROST: return BREAK_MS.ice;
    case T.DARK_ROCK: case T.VEIN_ROCK: case T.BRAZIER: case T.BRAZIER_LIT: case T.CARAPACE: case T.EMBER_BLOCK: case T.WORKBENCH: case T.WORKBENCH_90: case T.WORKBENCH_180: case T.WORKBENCH_270: case T.CHEST: case T.CHEST_90: case T.CHEST_180: case T.CHEST_270: case T.BED: case T.BED_90: case T.BED_180: case T.BED_270: case T.BED_HEAD: case T.BED_HEAD_90: case T.BED_HEAD_180: case T.BED_HEAD_270: return BREAK_MS.rock;
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
