import { Block, type BlockId, isOpen, isWallDoor } from '../world/blocks';
import { wallCapMask, wallFront, type WallFront, type WallNeighbors } from '../world/walls';

/**
 * Atlas de paredes por material (W3, ADR 0027): 16 tampas (128 × 128, grade 4 × 4, índice = máscara N·1 + L·2 + S·4 + O·8) e, abaixo,
 * 4 frentes (128 × 154). Gerado por `scripts/build-wall-atlas.py` a partir de `assets-src/paredes/<material>/`. Funções puras:
 * layout do atlas e escolha da peça (sem DOM nem Three).
 */
export const WALL_ART_CELL = 128;
export const WALL_ART_FRONT_H = 154;
export const WALL_ATLAS_W = 4 * WALL_ART_CELL;
/** Atlas: 16 tampas (4 × 4), 4 frentes numa fileira e 3 quadros da porta (fechada, intermediário, aberta) em outra fileira. */
export const WALL_ATLAS_H = 4 * WALL_ART_CELL + 2 * WALL_ART_FRONT_H;

export type WallFrontPiece = 'front_mid' | 'front_end_left' | 'front_end_right' | 'front_post';
/** Quadros da porta de parede: fechada, intermediário (animação) e aberta. */
export type WallDoorPiece = 'door_closed' | 'door_half' | 'door_open';
export const WALL_DOOR_PIECES: readonly WallDoorPiece[] = ['door_closed', 'door_half', 'door_open'];
export const WALL_FRONT_PIECES: readonly WallFrontPiece[] = ['front_mid', 'front_end_left', 'front_end_right', 'front_post'];

/** Retângulo de uma peça no atlas, em pixels (origem no canto superior-esquerdo). */
export interface AtlasRect { x: number; y: number; w: number; h: number }

export function capRect(mask: number): AtlasRect {
  return { x: (mask % 4) * WALL_ART_CELL, y: Math.floor(mask / 4) * WALL_ART_CELL, w: WALL_ART_CELL, h: WALL_ART_CELL };
}

export function frontRect(piece: WallFrontPiece | WallDoorPiece): AtlasRect {
  const door = (WALL_DOOR_PIECES as readonly string[]).indexOf(piece);
  if (door >= 0) return { x: door * WALL_ART_CELL, y: 4 * WALL_ART_CELL + WALL_ART_FRONT_H, w: WALL_ART_CELL, h: WALL_ART_FRONT_H };
  return { x: WALL_FRONT_PIECES.indexOf(piece as WallFrontPiece) * WALL_ART_CELL, y: 4 * WALL_ART_CELL, w: WALL_ART_CELL, h: WALL_ART_FRONT_H };
}

/** Qual das 4 frentes desenhar para a variante de frente do autotile. */
export function frontPieceFor(variant: WallFront): WallFrontPiece {
  switch (variant) {
    case 'mid': return 'front_mid';
    case 'left': return 'front_end_left';
    case 'right': return 'front_end_right';
    default: return 'front_post'; // 'single' e 'end' (bloco isolado e fim de coluna)
  }
}

export interface WallArtPiece {
  /** Máscara da tampa (0..15). */
  cap: number;
  /** Frente a desenhar, ou `null` quando há parede ao sul (a frente fica escondida). */
  front: WallFrontPiece | WallDoorPiece | null;
}

/** Peça de arte de uma parede, dados os vizinhos: tampa pela máscara; frente só onde NÃO há parede ao sul. */
export function wallArtPiece(nb: WallNeighbors, door: WallDoorPiece | null = null): WallArtPiece {
  const variant = nb.s ? null : wallFront(nb);
  // Porta: a tampa é a da fileira (a verga) e a frente é o quadro da porta no lugar da frente da parede.
  return { cap: wallCapMask(nb), front: variant ? (door ?? frontPieceFor(variant)) : null };
}

/** Quadro da porta pelo id do bloco (`null` se não é porta de parede); `half` força o quadro intermediário (animação). */
export function doorPieceFor(id: BlockId, half = false): WallDoorPiece | null {
  if (!isWallDoor(id)) return null;
  return half ? 'door_half' : isOpen(id) ? 'door_open' : 'door_closed';
}

/** Bloco cuja arte (atlas) a parede usa: a porta de parede usa o atlas do material da parede. */
export function wallArtBase(id: BlockId): BlockId {
  return id === Block.WALL_DOOR_PLANKS || id === Block.WALL_DOOR_PLANKS_OPEN ? Block.WALL_PLANKS : id;
}

/** Materiais de parede que já têm arte (id do bloco → nome da pasta em `assets-src/paredes`). */
export const WALL_ART_MATERIALS: Readonly<Partial<Record<BlockId, string>>> = { [Block.WALL_PLANKS]: 'tabuas', [Block.WALL_STONE]: 'pedra' };
