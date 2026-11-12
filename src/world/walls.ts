/**
 * Autotile das paredes (ADR 0027): funções PURAS (sem DOM, sem `Math.random`) que, olhando os vizinhos, dizem qual peça de
 * arte desenhar. Fonte de verdade da forma; o `render/` só escolhe a imagem da peça. Vale para Santuário e Mundo.
 *
 * Eixos: x leste, y sul (para baixo na tela). Uma parede é um bloco de nível único; qualquer material de parede conecta com
 * qualquer outro (a forma não depende do material).
 *
 * - **Frente:** aparece só onde o vizinho ao sul NÃO é parede (a frente de uma parede coberta ao sul fica escondida). Variantes
 *   pelos vizinhos leste/oeste: solta, ponta esquerda, meio, ponta direita.
 * - **Tampa:** máscara de 4 bits dos vizinhos (N=1, E=2, S=4, W=8 → 16 peças) mais os cantos internos (um canto é interno quando
 *   os dois vizinhos ortogonais são parede e o diagonal não é).
 */

export interface WallNeighbors {
  n: boolean; e: boolean; s: boolean; w: boolean;
  ne: boolean; se: boolean; sw: boolean; nw: boolean;
}

/** Lê os 8 vizinhos de (x, y) por um predicado `isWall` (o chamador decide o que é parede). */
export function wallNeighbors(isWall: (x: number, y: number) => boolean, x: number, y: number): WallNeighbors {
  return {
    n: isWall(x, y - 1), e: isWall(x + 1, y), s: isWall(x, y + 1), w: isWall(x - 1, y),
    ne: isWall(x + 1, y - 1), se: isWall(x + 1, y + 1), sw: isWall(x - 1, y + 1), nw: isWall(x - 1, y - 1),
  };
}

export type WallFront = 'single' | 'left' | 'mid' | 'right';

/** Variante da frente, ou `null` quando há parede ao sul (frente escondida). */
export function wallFront(nb: WallNeighbors): WallFront | null {
  if (nb.s) return null;
  if (nb.w && nb.e) return 'mid';
  if (nb.e) return 'left'; // só há parede a leste: esta é a ponta esquerda da fileira
  if (nb.w) return 'right';
  return 'single';
}

export const WALL_CAP_PIECES = 16;
export const CAP_N = 1;
export const CAP_E = 2;
export const CAP_S = 4;
export const CAP_W = 8;

/** Máscara de 4 bits da tampa (0..15): bit ligado = há parede nesse lado. */
export function wallCapMask(nb: WallNeighbors): number {
  return (nb.n ? CAP_N : 0) | (nb.e ? CAP_E : 0) | (nb.s ? CAP_S : 0) | (nb.w ? CAP_W : 0);
}

export const INNER_NE = 1;
export const INNER_SE = 2;
export const INNER_SW = 4;
export const INNER_NW = 8;

/** Cantos internos da tampa (bits NE=1, SE=2, SW=4, NW=8): os dois vizinhos ortogonais são parede e o diagonal não. */
export function wallInnerCorners(nb: WallNeighbors): number {
  return (nb.n && nb.e && !nb.ne ? INNER_NE : 0) | (nb.s && nb.e && !nb.se ? INNER_SE : 0) |
    (nb.s && nb.w && !nb.sw ? INNER_SW : 0) | (nb.n && nb.w && !nb.nw ? INNER_NW : 0);
}

export interface WallPiece {
  /** Frente (`null` = escondida pela parede ao sul). */
  front: WallFront | null;
  /** Tampa: índice 0..15 (máscara N/E/S/W). */
  cap: number;
  /** Cantos internos da tampa (bits NE/SE/SW/NW). */
  inner: number;
}

/** A peça completa de uma parede, dado seus vizinhos. */
export function wallPiece(nb: WallNeighbors): WallPiece {
  return { front: wallFront(nb), cap: wallCapMask(nb), inner: wallInnerCorners(nb) };
}
