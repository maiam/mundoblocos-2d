import { blockDef } from '../world/blocks';
import { blockColor } from './mapColors';

/**
 * Efeitos da quebra de blocos (v0.93.94): cor das lascas, tremor do bloco e tempos. Funções PURAS; o desenho é `three/breakChips.ts`
 * (lascas) e `ChunkBlocks.setShake` (tremor). O jogo (`ActionController`) continua dono de quanto falta para quebrar: aqui só o visual.
 */

/** Cor (0–1) das lascas de um bloco: a do minimapa/material; madeira e pedra sem cor própria ganham um tom; null = não solta lascas (flor, capim…). */
export function chipColor(id: number): [number, number, number] | null {
  const own = blockColor(id);
  const d = blockDef(id);
  const css = own ?? (d.organic === 'wood' ? '#b98a56' : d.stone ? '#9b9a96' : d.soft ? '#8a5a36' : null);
  if (!css) return null;
  const n = parseInt(css.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** De quanto em quanto tempo (s) saem lascas enquanto se segura a quebra, e quantas por vez (cresce com o progresso). */
export const CHIP_EVERY = 0.2;
export function chipsPerBurst(progress: number): number {
  return 1 + Math.round(Math.min(1, progress));
}

/** Estágios de rachadura (v0.93.98): 0 = inteiro; cada estágio acrescenta fissuras. `progress` 0..1 da quebra. */
export const CRACK_STAGES = 4;
export function crackStage(progress: number): number {
  if (!(progress > 0.08)) return 0;
  return Math.min(CRACK_STAGES, 1 + Math.floor(((Math.min(1, progress) - 0.08) / 0.92) * CRACK_STAGES * 0.999));
}

/** Lascas do estouro final (o bloco se desfaz). */
export const BREAK_BURST_CHIPS = 10;
/** Janela (s) depois que a quebra termina em que ainda se confere se o bloco sumiu (o jogo aplica a quebra um instante depois). */
export const BREAK_GRACE = 0.5;

/**
 * Tremor do bloco que se quebra: deslocamento (células) em x, altura e z. Cresce com o progresso (até ~0,035 célula) e oscila rápido, com
 * fases diferentes por eixo, para parecer pancada e não vibração uniforme. `t` = tempo (s).
 */
export function breakShake(t: number, progress: number): { dx: number; dy: number; dz: number } {
  const a = 0.008 + 0.027 * Math.min(1, Math.max(0, progress));
  return { dx: Math.sin(t * 61) * a, dy: Math.abs(Math.sin(t * 47 + 1.3)) * a * 0.6, dz: Math.sin(t * 53 + 2.1) * a * 0.7 };
}
