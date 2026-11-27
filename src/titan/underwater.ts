import { isWaterPlant, LAKE_SURFACE_Y } from './voxel';

/**
 * Aparência submersa do Lago Escuro (ADR 0057): regras puras, sem DOM nem Three.js. O renderer consulta a célula do **olho** (não os pés: `Body.inLiquid` segue só para a física)
 * e mistura névoa, luz ambiente, céu e o véu da tela pelo estado de imersão. Nada refaz malha; tudo é uniform, cor de névoa ou opacidade.
 */
/** Névoa submersa (carvão-violeta): `near` e o `far` com a vista recém-mergulhada (8 blocos) e já adaptada (14, em 2 s). */
export const UNDERWATER_FOG_NEAR = 1;
export const UNDERWATER_FAR_START = 8;
export const UNDERWATER_FAR_ADAPTED = 14;
export const UNDERWATER_ADAPT_SECONDS = 2;
/** Entrada e saída do véu/da mistura da cena (≈ 150 ms). */
export const UNDERWATER_BLEND_SECONDS = 0.15;
/** Luz ambiente mínima no fundo (só a parcela do dia; a luz de lanterna é separada). */
export const UNDERWATER_AMBIENT_FLOOR = 0.18;

/** Os olhos estão dentro do líquido? `cell` = bloco da célula do olho; só vale abaixo da superfície (Y = 64). */
export function eyesSubmerged(eyeY: number, cell: number, lake: number): boolean {
  return eyeY < LAKE_SURFACE_Y && (cell === lake || isWaterPlant(cell)); // com ou sem planta aquática (ADR 0135)
}

/** Profundidade dos olhos abaixo da superfície, em blocos (0 fora d'água). */
export const eyeDepth = (eyeY: number, submerged: boolean): number => (submerged ? Math.max(0, LAKE_SURFACE_Y - eyeY) : 0);

/** Fração da luz ambiente que chega à profundidade `depth` (blocos): `max(0,18, exp(−0,18 · profundidade))`. */
export const underwaterAmbient = (depth: number): number => Math.max(UNDERWATER_AMBIENT_FLOOR, Math.exp(-0.18 * Math.max(0, depth)));

/** Fim da névoa linear (`far`) com a adaptação 0–1: 8 blocos ao mergulhar, ~14 depois de 2 s. */
export const underwaterFar = (adapt: number): number => UNDERWATER_FAR_START + (UNDERWATER_FAR_ADAPTED - UNDERWATER_FAR_START) * Math.min(1, Math.max(0, adapt));

export interface UnderwaterState { /** 0 = fora d'água, 1 = totalmente submerso (suaviza entrada e saída). */ mix: number; /** 0–1: a vista se adapta e abre a névoa; volta a 0 ao emergir. */ adapt: number }

/** Avança o estado em `dt` segundos: a mistura segue o alvo em ~150 ms; a adaptação cresce em 2 s dentro d'água e zera ao sair. */
export function stepUnderwater(s: UnderwaterState, inWater: boolean, dt: number): UnderwaterState {
  const k = Math.min(1, Math.max(0, dt)) / UNDERWATER_BLEND_SECONDS;
  const mix = inWater ? Math.min(1, s.mix + k) : Math.max(0, s.mix - k);
  const adapt = inWater ? Math.min(1, s.adapt + Math.max(0, dt) / UNDERWATER_ADAPT_SECONDS) : 0;
  return { mix, adapt };
}
