/**
 * Autotile das paredes (ADR 0027): funções PURAS (sem DOM, sem `Math.random`) que, olhando os vizinhos, dizem a forma e qual
 * peça de arte desenhar. Fonte de verdade da forma; o `render/` só escolhe a imagem/geometria. Vale para Santuário e Mundo.
 *
 * Modelo (medido numa cena do Core Keeper): a parede é uma **placa fina** de espessura `WALL_THICKNESS` (~0,3 célula) nos dois
 * sentidos, no centro da célula: um poste central mais um braço até a borda da célula em cada lado que tem parede vizinha.
 * A colisão continua sendo a célula inteira (só o desenho é fino). Daí saem sozinhos os comportamentos observados:
 * - fileira leste–oeste: faces sul de célula inteira (frente larga, de `WORLD_SCALE.wall` de altura);
 * - fileira norte–sul: faixa fina; **só o último bloco ao sul mostra a frente** (fina); os demais só mostram a tampa;
 * - bloco isolado: poste fino.
 *
 * Eixos: x leste, y sul (para baixo na tela). Qualquer material de parede conecta com qualquer outro.
 */

/** Espessura da placa, em células (a faixa fina medida: ~0,2–0,3; a sombra do topo ~0,35). */
export const WALL_THICKNESS = 0.3;
const C0 = (1 - WALL_THICKNESS) / 2;
const C1 = (1 + WALL_THICKNESS) / 2;

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

export type WallFront = 'single' | 'end' | 'left' | 'mid' | 'right';

/**
 * Variante da frente, ou `null` quando nada da frente aparece (continuação de uma fileira norte–sul: há parede ao sul e
 * nenhuma a leste/oeste). `single`: poste isolado; `end`: último bloco ao sul de uma fileira norte–sul; `left`/`mid`/`right`:
 * fileira leste–oeste (o braço leste, o poste com braços dos dois lados, o braço oeste).
 */
export function wallFront(nb: WallNeighbors): WallFront | null {
  if (nb.s && !nb.e && !nb.w) return null;
  if (nb.w && nb.e) return 'mid';
  if (nb.e) return 'left'; // só há parede a leste: esta é a ponta esquerda da fileira
  if (nb.w) return 'right';
  return nb.n ? 'end' : 'single';
}

/** Peça fina (fileira norte–sul pura ou poste): nenhum vizinho a leste/oeste. */
export function wallThin(nb: WallNeighbors): boolean {
  return !nb.e && !nb.w;
}

/** Retângulo em coordenadas da célula (0..1): x leste, z sul. */
export interface WallRect { x0: number; x1: number; z0: number; z1: number }

/** Pegada da parede na célula: o poste central e um braço até a borda em cada lado com parede vizinha (sem sobreposição). */
export function wallFootprint(nb: WallNeighbors): WallRect[] {
  const rects: WallRect[] = [{ x0: C0, x1: C1, z0: C0, z1: C1 }];
  if (nb.n) rects.push({ x0: C0, x1: C1, z0: 0, z1: C0 });
  if (nb.s) rects.push({ x0: C0, x1: C1, z0: C1, z1: 1 });
  if (nb.w) rects.push({ x0: 0, x1: C0, z0: C0, z1: C1 });
  if (nb.e) rects.push({ x0: C1, x1: 1, z0: C0, z1: C1 });
  return rects;
}

/**
 * Faixas de x (0..1) cuja face sul está exposta, no plano z = (1 + espessura) / 2: o poste (se não há braço ao sul) e os
 * braços leste/oeste. O braço sul esconde o poste, e a face sul dele só aparece no último bloco da fileira (que então não tem
 * vizinho ao sul). Faixas contíguas são unidas.
 */
export function wallFrontRanges(nb: WallNeighbors): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  const add = (x0: number, x1: number): void => {
    const last = out[out.length - 1];
    if (last && last[1] === x0) last[1] = x1;
    else out.push([x0, x1]);
  };
  if (nb.w) add(0, C0);
  if (!nb.s) add(C0, C1);
  if (nb.e) add(C1, 1);
  return out;
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
