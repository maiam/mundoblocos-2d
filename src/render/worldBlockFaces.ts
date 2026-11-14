import { CUBE_FRONT, TILE } from '../config';
import type { BlockId } from '../world/blocks';
import { slabBaseOf } from '../world/slabs';
import type { BlockFaces } from './three/blockMaterials';
import { TEX_RES, type BlockTextures } from './textures';
import { v2Faces, V2_BLOCKS } from './materialsV2';

const T = TILE;
const F = CUBE_FRONT;
const RES = TILE * TEX_RES;

function square(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = c.height = RES;
  return [c, c.getContext('2d')!];
}

/**
 * Imagens de um cubo do Mundo para o 3D (ADR 0031, M2.2): topo = a textura de chão do material (a mesma do 2D); frente
 * **provisória** (ADR 0031 § 6, decisão 5): o próprio topo, escurecido pelo material (K = 1 pede frente quadrada); quando o
 * V2 tem frente própria (terra sob a grama, casca da tora) usa essa arte, esticada à altura de uma célula, até a arte nova chegar.
 * Só composição de canvas: nada de ler pixels (CLAUDE.md).
 */
export function worldBlockFaces(textures: BlockTextures): (id: number) => BlockFaces {
  return (id) => {
    // Lajes (piloto): topo e frente são os da Tábua de Carvalho.
    const bid = slabBaseOf(id) as BlockId;
    const [top, tctx] = square();
    const src = textures.groundTop.get(bid);
    if (src) tctx.drawImage(src, 0, 0, RES, RES);
    else { // sem textura: cor lisa do bloco (nunca deixa o cubo invisível)
      tctx.fillStyle = '#b8a48c';
      tctx.fillRect(0, 0, RES, RES);
    }
    const v2 = V2_BLOCKS[bid];
    const faces = v2 && v2.front !== v2.top ? v2Faces(bid, T, F, TEX_RES) : null;
    let front = top;
    if (faces) {
      // O V2 pinta a frente numa faixa de F abaixo do topo (altura T): pinta, recorta a faixa e estica até a altura da célula.
      const tall = document.createElement('canvas');
      tall.width = RES;
      tall.height = Math.ceil((T + F) * TEX_RES);
      const ctx = tall.getContext('2d')!;
      ctx.scale(TEX_RES, TEX_RES);
      faces.front(ctx);
      const [f, fctx] = square();
      fctx.drawImage(tall, 0, T * TEX_RES, RES, F * TEX_RES, 0, 0, RES, RES);
      front = f;
    }
    return { top, front, ground: top };
  };
}
