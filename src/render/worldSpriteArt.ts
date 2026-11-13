import { Block, blockDef, isDoor, joinsFence, type BlockId } from '../world/blocks';
import { hash2 } from '../world/random';
import type { World } from '../world/world';
import { FENCE_FRAME, FENCE_OFFSET, FENCE_SCALE, fenceParts } from './fence';
import type { BlockTextures } from './textures';
import { isTownArt } from './townArt';
import type { SpriteDraw } from './three/chunkSprites';

/**
 * Qual sprite 2D desenha cada objeto do Mundo no 3D (ADR 0031, M2.3) — as MESMAS escolhas do `Renderer.drawObject` 2D:
 * variação por célula (hash da seed; na cidade, independente dela), porta por estado, cerca emendada pelos vizinhos.
 * Cubos e paredes têm render próprio (`ChunkBlocks`) e devolvem null. Ainda sem animação de porta nem brilhos (M3).
 */
export function worldSpriteArt(world: World, textures: BlockTextures): (id: BlockId, x: number, y: number) => SpriteDraw | null {
  const fenceCache = new Map<number, SpriteDraw>();
  const fence = (x: number, y: number): SpriteDraw | null => {
    const pieces = textures.fencePieces;
    if (!pieces) return null;
    const j = (dx: number, dy: number) => joinsFence(world.getObject(x + dx, y + dy));
    const n = j(0, -1), e = j(1, 0), s = j(0, 1), w = j(-1, 0);
    const key = (n ? 1 : 0) | (e ? 2 : 0) | (s ? 4 : 0) | (w ? 8 : 0);
    let hit = fenceCache.get(key);
    if (hit) return hit;
    // Compõe as peças (cortes na âncora, como `Renderer.drawFence`) num quadro do tamanho da tira; só composição de canvas.
    const { w: fw, h: fh, ax, ay } = FENCE_FRAME;
    const c = document.createElement('canvas');
    c.width = fw;
    c.height = fh;
    const ctx = c.getContext('2d')!;
    const parts = fenceParts(n, e, s, w);
    const piece = (p: number, sx: number, sy: number, sw: number, sh: number) => ctx.drawImage(pieces[p], sx, sy, sw, sh, sx, sy, sw, sh);
    if (parts.whole !== null) piece(parts.whole, 0, 0, fw, fh);
    else {
      if (parts.north) piece(1, 0, 0, fw, ay);
      if (parts.west) piece(0, 0, 0, ax, fh);
      if (parts.east) piece(0, ax, 0, fw - ax, fh);
      if (parts.south) piece(1, 0, ay, fw, fh - ay);
      if (parts.post) piece(2, 0, 0, fw, fh);
    }
    const wpx = fw * FENCE_SCALE, hpx = fh * FENCE_SCALE;
    hit = {
      walkable: false,
      sprite: { canvas: c, ox: FENCE_OFFSET.x, oy: FENCE_OFFSET.y, w: wpx, h: hpx, hit: { x: FENCE_OFFSET.x, y: FENCE_OFFSET.y, w: wpx, h: hpx } },
    };
    fenceCache.set(key, hit);
    return hit;
  };

  return (id, x, y) => {
    if (id === Block.AIR) return null;
    const def = blockDef(id);
    if (def.shape === 'cube' || def.shape === 'wall' || def.shape === 'wall-door') return null;
    if (isDoor(id)) {
      const open = id === Block.OAK_DOOR_OPEN;
      const sprite = textures.doorFrames[open ? 3 : 0];
      return sprite ? { sprite, walkable: open } : null;
    }
    if (id === Block.FENCE) return fence(x, y);
    const vars = textures.variants.get(id);
    const salt = isTownArt(id) ? 0x7041 : world.seed;
    const sprite = vars ? vars[Math.floor(hash2(salt, x * 7 + 3, y * 13 - 1) * vars.length)] : textures.objects.get(id);
    return sprite ? { sprite, walkable: !def.solid } : null;
  };
}

