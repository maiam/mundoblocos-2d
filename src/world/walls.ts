/**
 * Autotile das paredes (ADR 0027): funções PURAS (sem DOM, sem `Math.random`) que, olhando os vizinhos, dizem a forma e qual
 * peça de arte desenhar. Fonte de verdade da forma; o `render/` só escolhe a imagem/geometria. Vale para Santuário e Mundo.
 *
 * Modelo (medido numa cena do Core Keeper): a parede é uma **placa fina** de espessura `DEFAULT_WALL_THICKNESS` (x 0,25 · z 0,35, por eixo) nos dois
 * sentidos, no centro da célula: um poste central mais um braço até a borda da célula em cada lado que tem parede vizinha.
 * A colisão continua sendo a célula inteira (só o desenho é fino). Daí saem sozinhos os comportamentos observados:
 * - fileira leste–oeste: faces sul de célula inteira (frente larga, de `WORLD_SCALE.wall` de altura);
 * - fileira norte–sul: faixa fina; **só o último bloco ao sul mostra a frente** (fina); os demais só mostram a tampa;
 * - bloco isolado: poste fino.
 *
 * Eixos: x leste, y sul (para baixo na tela). Qualquer material de parede conecta com qualquer outro.
 */

/**
 * Espessura da placa, em células, em cada eixo: `x` = largura das faixas norte–sul e do poste; `z` = profundidade da tampa das
 * fileiras leste–oeste (e onde a face sul fica dentro da célula). Medido no Core Keeper: faixa fina ~0,2–0,3 e tampa ~0,35.
 */
export interface WallThickness { x: number; z: number }
/** Valor escolhido pelo dono do produto em 13/11/2026 (comparando `?espessura=` no protótipo): faixa 0,25 e tampa 0,35. */
export const DEFAULT_WALL_THICKNESS: WallThickness = { x: 0.25, z: 0.35 };

/** Limita a espessura a um intervalo que ainda forma parede (0,1 a 1,0 da célula; 1,0 = a coluna ocupa a célula inteira). */
export function clampWallThickness(t: WallThickness): WallThickness {
  const c = (v: number): number => Math.min(1, Math.max(0.1, Number.isFinite(v) ? v : 0.3));
  return { x: c(t.x), z: c(t.z) };
}

/** Lê `a,b` (x,z) ou só `a` (os dois eixos); `null` se não for um número válido. */
export function parseWallThickness(text: string | null | undefined): WallThickness | null {
  if (!text) return null;
  const parts = text.split(',').map((p) => Number(p.trim()));
  if (parts.length < 1 || parts.length > 2 || parts.some((n) => !Number.isFinite(n))) return null;
  return clampWallThickness({ x: parts[0], z: parts[parts.length - 1] });
}

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

/** Parte da pegada: o poste central ou o braço (norte/sul = barra vertical da coluna; leste/oeste = barra horizontal da fileira). */
export type WallPartKind = 'post' | 'n' | 's' | 'w' | 'e';
export interface WallPart { kind: WallPartKind; rect: WallRect }

/** Pegada da parede na célula, por parte: o poste central e um braço até a borda em cada lado com parede vizinha (sem sobreposição). */
export function wallFootprintParts(nb: WallNeighbors, t: WallThickness = DEFAULT_WALL_THICKNESS): WallPart[] {
  const x0 = (1 - t.x) / 2, x1 = (1 + t.x) / 2, z0 = (1 - t.z) / 2, z1 = (1 + t.z) / 2;
  const parts: WallPart[] = [{ kind: 'post', rect: { x0, x1, z0, z1 } }];
  if (nb.n) parts.push({ kind: 'n', rect: { x0, x1, z0: 0, z1: z0 } });
  if (nb.s) parts.push({ kind: 's', rect: { x0, x1, z0: z1, z1: 1 } });
  // Com a coluna da largura da célula (x = 1) os braços leste/oeste têm comprimento zero: não existem.
  if (nb.w && x0 > 1e-9) parts.push({ kind: 'w', rect: { x0: 0, x1: x0, z0, z1 } });
  if (nb.e && x0 > 1e-9) parts.push({ kind: 'e', rect: { x0: x1, x1: 1, z0, z1 } });
  return parts;
}

/** Pegada da parede na célula (só os retângulos). */
export function wallFootprint(nb: WallNeighbors, t: WallThickness = DEFAULT_WALL_THICKNESS): WallRect[] {
  return wallFootprintParts(nb, t).map((p) => p.rect);
}

/**
 * Faixas de x (0..1) cuja face sul está exposta, no plano z = (1 + t.z) / 2: o poste (se não há braço ao sul) e os
 * braços leste/oeste. O braço sul esconde o poste, e a face sul dele só aparece no último bloco da fileira (que então não tem
 * vizinho ao sul). Faixas contíguas são unidas.
 */
export function wallFrontRanges(nb: WallNeighbors, t: WallThickness = DEFAULT_WALL_THICKNESS): Array<[number, number]> {
  const C0 = (1 - t.x) / 2, C1 = (1 + t.x) / 2;
  const out: Array<[number, number]> = [];
  const add = (x0: number, x1: number): void => {
    const last = out[out.length - 1];
    if (last && last[1] === x0) last[1] = x1;
    else out.push([x0, x1]);
  };
  if (nb.w && C0 > 1e-9) add(0, C0);
  if (!nb.s) add(C0, C1);
  if (nb.e && C0 > 1e-9) add(C1, 1);
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
