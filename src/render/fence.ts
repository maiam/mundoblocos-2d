import { TILE } from '../config';

/**
 * Cerca de tábuas que se emenda sozinha (aparência; a regra de bloquear/abrir fica no `World`).
 *
 * Cada célula de cerca olha os 4 vizinhos (cerca ou portão contam) e monta o desenho com 3 peças da tira
 * `fence.webp` (`scripts/extract-fence.py`), todas com a mesma âncora no centro da célula:
 * - trecho reto (leste+oeste ou norte+sul, nada mais): a peça inteira, com o poste do meio;
 * - qualquer outro caso (canto, "T", cruz, ponta, cerca solta): só as metades que apontam para vizinhos
 *   + o poste grande por cima (os postes sempre cobrem as travessas, como na referência).
 * Portão: desenho próprio com os dois postes nas bordas da célula, onde chegam as travessas das vizinhas.
 */

/**
 * Quadro de cada peça na tira (px da imagem) e a âncora = centro da base do poste (que fica no centro da célula). Cerca v2 (v0.93.95, arte do dono do
 * produto, `scripts/extract-fence-v2.py`): 128 px por célula (distância entre postes = 1 célula); o poste tem 60 px de altura e os trilhos horizontais
 * ficam a 13–22 e 34–44 acima da base; o trilho vertical passa a ~26 px de altura (por isso o corte norte/sul, `cutY`, é na linha 64 e não na âncora).
 */
export const FENCE_FRAME = { w: 128, h: 128, ax: 64, ay: 90, cutY: 64 } as const;
/**
 * Porteira: 5 poses (0°, 22,5°, 45°, 67,5°, 90°) lado a lado, cada uma `w × h`; a base dos postes cai na linha `postBase` e a pose ocupa a célula
 * inteira (os postes ficam a ±0,33 célula do centro e cotos de trilho chegam às bordas, onde as cercas vizinhas terminam).
 */
export const GATE_FRAME = { w: 128, h: 76, postBase: 61, poses: 5 } as const;

export const enum FencePiece { Horizontal = 0, Vertical = 1, Post = 2 }

/** O que desenhar numa célula de cerca, dados os vizinhos que se emendam. */
export interface FenceParts {
  /** Peça inteira (trecho reto) ou null. */
  whole: FencePiece | null;
  north: boolean;
  south: boolean;
  west: boolean;
  east: boolean;
  /** Poste grande por cima. */
  post: boolean;
}

export function fenceParts(n: boolean, e: boolean, s: boolean, w: boolean): FenceParts {
  if (e && w && !n && !s) return { whole: FencePiece.Horizontal, north: false, south: false, west: false, east: false, post: false };
  if (n && s && !e && !w) return { whole: FencePiece.Vertical, north: false, south: false, west: false, east: false, post: false };
  return { whole: null, north: n, south: s, west: w, east: e, post: true };
}

/** Escala px da tira → px de mundo. */
export const FENCE_SCALE = TILE / FENCE_FRAME.w;
/** Canto superior esquerdo do quadro em relação ao canto da célula (px de mundo). */
export const FENCE_OFFSET = {
  x: TILE / 2 - FENCE_FRAME.ax * FENCE_SCALE,
  y: TILE / 2 - FENCE_FRAME.ay * FENCE_SCALE,
} as const;
