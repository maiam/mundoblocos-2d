import { TILE } from '../config';
import { Block, isDoor, type BlockId } from '../world/blocks';
import type { Sprite } from './textures';

/**
 * SPEC-PAREDES-001, adaptada para o renderizador 2D oficial.
 * Somente materiais de CONSTRUÇÃO; nenhuma terra, pedra natural, grama,
 * tronco, nuvem ou piso passa a ser parede por estar numa fileira.
 */
export const ADAPTIVE_WALL_BLOCKS: ReadonlySet<BlockId> = new Set([
  Block.STONE_BRICK, Block.STONE_SMOOTH, Block.STONE_POLISHED,
  Block.OAK_PLANKS, Block.CHERRY_PLANKS, Block.BIRCH_PLANKS,
  Block.MARBLE_CELESTIAL, Block.MARBLE_ORNATE,
  Block.STONE_CELESTIAL, Block.STONE_GOLDEN,
]);

type BlockReader = {
  getLevel(x: number, y: number, level: number): BlockId;
};

/**
 * Sem T/canto: um bloco afina somente se seus dois vizinhos horizontais
 * são do mesmo material (ou uma porta já existente, tratada como pilar),
 * e não há blocos diretamente ao norte/sul no MESMO nível.
 * Blocos que não são construtivos sempre permanecem maciços.
 */
export function horizontalWallShape(
  view: BlockReader, id: BlockId, x: number, y: number, level: number,
): 'solid' | 'thin' {
  if (!ADAPTIVE_WALL_BLOCKS.has(id)) return 'solid';
  const connects = (nx: number): boolean => {
    const neighbor = view.getLevel(nx, y, level);
    return neighbor === id || (level === 0 && isDoor(neighbor));
  };
  if (!connects(x - 1) || !connects(x + 1)) return 'solid';
  if (view.getLevel(x, y - 1, level) !== Block.AIR) return 'solid';
  if (view.getLevel(x, y + 1, level) !== Block.AIR) return 'solid';
  return 'thin';
}

/** Cálculo puro das duas partes da imagem da parede. */
export function thinWallSlices(canvasH: number, spriteH: number,
  topY: number, frontY: number, bottomY: number): {
    topSrcY: number; topSrcH: number; frontSrcY: number; frontSrcH: number;
    topY: number; topH: number; frontY: number; frontH: number;
  } {
  const split = Math.round(canvasH * TILE / spriteH);
  const rearCut = Math.floor(split / 2);
  const rearY = Math.round((topY + frontY) / 2);
  return {
    topSrcY: rearCut, topSrcH: split - rearCut,
    frontSrcY: split, frontSrcH: canvasH - split,
    topY: rearY, topH: frontY - rearY,
    frontY, frontH: bottomY - frontY,
  };
}

/**
 * Face frontal INTACTA e alinhada ao pilar; o topo passa a ocupar só a metade
 * da profundidade a partir da frente (+Y no mapa). Não há perspectiva nova.
 * Mesmas texturas, coordenadas e zoom usados no desenho de cubos normal.
 */
export function drawThinHorizontalWall(
  ctx: CanvasRenderingContext2D, sprite: Sprite,
  left: number, right: number, topY: number, frontY: number, bottomY: number,
): void {
  const crop = thinWallSlices(sprite.canvas.height, sprite.h, topY, frontY, bottomY);
  if (crop.topSrcH > 0 && crop.topH > 0) {
    ctx.drawImage(sprite.canvas, 0, crop.topSrcY, sprite.canvas.width, crop.topSrcH,
      left, crop.topY, right - left, crop.topH);
    // Filete no limite traseiro do topo fino: termina na mesma face frontal.
    ctx.fillStyle = 'rgba(255,255,255,0.19)';
    ctx.fillRect(left, crop.topY, right - left, 1);
  }
  if (crop.frontSrcH > 0 && crop.frontH > 0) {
    ctx.drawImage(sprite.canvas, 0, crop.frontSrcY, sprite.canvas.width, crop.frontSrcH,
      left, crop.frontY, right - left, crop.frontH);
  }
}
