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

/** Quadro de cada peça na tira (px da imagem) e a âncora = centro da célula dentro do quadro. */
export const FENCE_FRAME = { w: 128, h: 192, ax: 64, ay: 112 } as const;
/** Portão: quadro (px) e onde fica o pé dos postes; os centros dos postes caem nas bordas da célula. */
export const GATE_FRAME = { w: 168, h: 137, postBase: 125, cell: 128 } as const;

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
