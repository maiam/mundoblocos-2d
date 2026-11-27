import { toolOf, type Tier, type ToolKind } from './items';
import { isCoralBlock, isPickVein, isWall, T } from './voxel';

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

/** Coleta de lanterna/lasca solta (não é bloco): tempo total fixo, desde a pressão. */
export const COLLECT_MS = 350;

/**
 * Quebra por **dureza do bloco**, na fórmula da Minecraft Wiki (ADR 0117, auditoria #16): tempo = dureza × 1,5 s ÷ velocidade da ferramenta certa;
 * bloco que exige ferramenta (rocha) sem ela = dureza × 5 s; arredondado para cima em ticks de 50 ms. Os `HOLD_MS` do gesto somam por fora.
 */
export const BASE_MS = 1500;
export const NEEDS_TOOL_MS = 5000;
export const TICK_MS = 50;
/** Velocidade por nível da ferramenta certa (Wiki: madeira 2, pedra 4; cobre 5, entre a pedra e o ferro 6 — provisório). */
export const TOOL_SPEED: Readonly<Record<Tier, number>> = { wood: 2, rock: 4, copper: 5 };

/** Dureza por bloco (Wiki). Entradas marcadas `provisório` não têm equivalente na Wiki. */
const SOIL_SOFT = 0.5; // terra, areia
const SOIL = 0.6; // grama, argila, terra arada
const HARD_PLANK = 2; // tábuas, toras, mureta
const STONE_H = 1.5; // pedra, tijolo de pedra
const SMOOTH_H = 2; // pedra lisa, lajes, degraus, tijolo, mureta
/** Titã sem equivalente (provisório): a dureza que mantém o tempo líquido de mão antigo (÷ 1,5 s). */
const LEGACY_SAND = 0.27, LEGACY_SLAB = 0.53, LEGACY_ICE = 0.53, LEGACY_COLLECT = 0.1;
const COPPER_ORE = 3;

const HARDNESS = new Map<number, number>();
const setH = (h: number, ...ids: number[]) => ids.forEach((i) => HARDNESS.set(i, h));
setH(SOIL_SOFT, T.DIRT, T.BEACH, T.DIRT_INFERTILE, T.SAND, T.DAMP_SAND);
setH(SOIL, T.GRASS, T.FARMLAND_DRY, T.FARMLAND_WET, T.CLAY_BLOCK);
setH(0.65, T.PATH);
setH(STONE_H, T.STONE, T.STONE_BRICK, T.DARK_ROCK, T.VEIN_ROCK, T.CARAPACE, T.EMBER_BLOCK); // rocha do Titã: provisório = pedra
setH(SMOOTH_H, T.STONE_SMOOTH, T.BRICK_BLOCK, T.STONE_SLAB, T.STONE_SLAB_TOP, T.STONE_STAIR, T.STONE_STAIR_90, T.STONE_STAIR_180, T.STONE_STAIR_270, T.SLAB, T.SLAB_TOP, T.SLAB_DOUBLE, ...Array.from({ length: 16 }, (_, m) => T.STONE_WALL + m));
setH(3.5, T.BRAZIER, T.BRAZIER_LIT, ...Array.from({ length: 8 }, (_, t) => T.FURNACE + t)); // fornalha da Wiki (a do Orvalis, ADR 0120, e o braseiro do Titã)
setH(HARD_PLANK, T.LOG_OAK, T.LOG_CHERRY, T.LOG_BIRCH, T.PLANKS_OAK, T.PLANKS_CHERRY, T.PLANKS_BIRCH);
setH(2.5, T.CARPENTRY, T.CARPENTRY_90, T.CARPENTRY_180, T.CARPENTRY_270, T.WORKBENCH, T.WORKBENCH_90, T.WORKBENCH_180, T.WORKBENCH_270, T.CHEST, T.CHEST_90, T.CHEST_180, T.CHEST_270); // bancada e baú da Wiki
setH(0.2, T.LEAVES_OAK, T.LEAVES_CHERRY, T.LEAVES_BIRCH, T.BED, T.BED_90, T.BED_180, T.BED_270, T.BED_HEAD, T.BED_HEAD_90, T.BED_HEAD_180, T.BED_HEAD_270); // folhas e cama da Wiki
setH(LEGACY_SAND, T.REED_BLOCK);
setH(LEGACY_SLAB, T.REED_SLAB, T.REED_SLAB_TOP, T.REED_STAIR, T.REED_STAIR_90, T.REED_STAIR_180, T.REED_STAIR_270, T.REED_CHAIR, T.REED_CHAIR_90, T.REED_CHAIR_180, T.REED_CHAIR_270);
for (let d = T.DOOR; d <= T.DOOR_LAST; d++) HARDNESS.set(d, LEGACY_SLAB);
setH(LEGACY_ICE, T.FROST, T.VEIN_FROST, T.EMBER);
for (let i = 0; i < 10; i++) setH(1.5, T.CORAL_BLOCK + i); // blocos de coral (Wiki: dureza 1,5, ADR 0136)
setH(0.5, T.DRIED_KELP_BLOCK); // bloco de alga seca (Wiki: dureza 0,5, ADR 0135)
setH(1, T.MELON); setH(1, T.PUMPKIN); // melancia e abóbora (Wiki: dureza 1, machado, ADR 0128)
setH(3, T.COAL_ORE); setH(5, T.COAL_BLOCK); // minério de carvão (3) e bloco de carvão (5): picareta (Wiki, ADR 0122)
setH(0, T.TORCH, T.TORCH_WALL, T.TORCH_WALL_90, T.TORCH_WALL_180, T.TORCH_WALL_270); // tocha: dureza 0, sai assim que o gesto de quebrar começa (Wiki: instantânea)
setH(LEGACY_COLLECT, T.MARCO, T.MARCO_90, T.MARCO_180, T.MARCO_270, T.PAINEL, T.PAINEL_Z);

/** Dureza do bloco (`null` = não quebra: rocha-mãe, líquido, ar). Veios de cobre/âmbar têm dureza própria (só picareta). */
export const hardnessOf = (block: number | undefined): number | null => (block === undefined ? null : block === T.VEIN_COPPER || block === T.EMBER_VEIN ? COPPER_ORE : HARDNESS.get(block) ?? null);

const toTick = (ms: number): number => Math.ceil(ms / TICK_MS - 1e-9) * TICK_MS;

/** Tempo total para concluir a ação sobre o alvo, ou `null` se não há o que quebrar (rocha-mãe, líquido). */
export function breakTotalMs(kind: TargetKind, block?: number, pick: Tier | boolean | null = false): number | null {
  if (kind === 'creature') return null; // animal na mira: o toque curto golpeia, segurar não quebra nada (ADR 0069)
  if (kind === 'lantern' || kind === 'shard') return COLLECT_MS;
  const tier: Tier | null = pick === true ? 'rock' : pick || null;
  const h = hardnessOf(block);
  if (h === null) return null;
  if (block === T.VEIN_COPPER || block === T.EMBER_VEIN) return tier ? HOLD_MS + toTick((h * BASE_MS) / TOOL_SPEED[tier]) : null; // só uma picareta o quebra (ADR 0063)
  const right = tier !== null && (pick === true ? blockToolOf(block) === 'pick' : blockToolOf(block) !== null); // quem decide se a ferramenta serve é `toolAdvantage`
  const needsTool = blockToolOf(block) === 'pick';
  const ms = right && tier ? (h * BASE_MS) / TOOL_SPEED[tier] : h * (needsTool ? NEEDS_TOOL_MS : BASE_MS);
  return HOLD_MS + toTick(ms);
}

const ROCK_CLASS: ReadonlySet<number> = new Set([T.DARK_ROCK, T.VEIN_ROCK, T.SLAB, T.SLAB_TOP, T.SLAB_DOUBLE, T.BRAZIER, T.BRAZIER_LIT, ...Array.from({ length: 8 }, (_, t) => T.FURNACE + t), T.CARAPACE, T.EMBER_BLOCK, T.COAL_ORE, T.COAL_BLOCK, T.STONE, T.STONE_SMOOTH, T.STONE_BRICK, T.STONE_STAIR, T.STONE_STAIR_90, T.STONE_STAIR_180, T.STONE_STAIR_270, T.BRICK_BLOCK, ...Array.from({ length: 16 }, (_, m) => T.STONE_WALL + m), T.STONE_SLAB, T.STONE_SLAB_TOP]);

const WOOD_CLASS: ReadonlySet<number> = new Set([T.LOG_OAK, T.LOG_CHERRY, T.LOG_BIRCH, T.PLANKS_OAK, T.PLANKS_CHERRY, T.PLANKS_BIRCH, T.CARPENTRY, T.CARPENTRY_90, T.CARPENTRY_180, T.CARPENTRY_270, T.WORKBENCH, T.WORKBENCH_90, T.WORKBENCH_180, T.WORKBENCH_270, T.CHEST, T.CHEST_90, T.CHEST_180, T.CHEST_270]);
const SOIL_CLASS: ReadonlySet<number> = new Set([T.GRASS, T.DIRT, T.BEACH, T.PATH, T.FARMLAND_DRY, T.FARMLAND_WET, T.DIRT_INFERTILE, T.CLAY_BLOCK, T.SAND, T.DAMP_SAND]);
/** Que ferramenta é a certa para o bloco (como no Minecraft): picareta para rocha e veios, machado para madeira, pá para solo; `null` = nenhuma ajuda. */
export function blockToolOf(block: number | undefined): ToolKind | null {
  if (block === undefined) return null;
  if (ROCK_CLASS.has(block) || isPickVein(block) || isWall(block)) return 'pick';
  if (WOOD_CLASS.has(block) || block === T.MELON || block === T.PUMPKIN) return 'axe'; // melancia e abóbora: machado (Wiki, ADR 0128)
  if (isCoralBlock(block)) return 'pick'; // coral: picareta (Wiki, ADR 0136)
  if (SOIL_CLASS.has(block)) return 'shovel';
  return null;
}
/** Nível da ferramenta na mão **se ela é a certa para o bloco** (senão `null`: a mão nua): é o que `breakTotalMs` recebe (ADR 0112; antes recebia só "tem picareta", sempre no nível de rocha). */
export function toolAdvantage(item: number | undefined | null, block: number | undefined): Tier | null {
  const t = toolOf(item);
  return t && blockToolOf(block) === t.kind ? t.tier : null;
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
