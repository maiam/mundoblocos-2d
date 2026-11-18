import { Block, blockDef, FLOWER_BLOCKS, ISO_PROPS, isDoor, isFence, isGate, joinsFence, type BlockId, wildFlowerIndex } from '../world/blocks';
import { hash2 } from '../world/random';
import type { World } from '../world/world';
import { FENCE_FRAME, FENCE_OFFSET, FENCE_SCALE, FencePiece, fenceParts, drawFenceShadow } from './fence';
import type { BlockTextures } from './textures';
import { isTownArt } from './townArt';
import type { SpriteDraw } from './three/chunkSprites';
import { objectScaleFor } from './worldScale';

/**
 * Qual sprite 2D desenha cada objeto do Mundo no 3D (ADR 0031, M2.3) — as MESMAS escolhas do `Renderer.drawObject` 2D:
 * variação por célula (hash da seed; na cidade, independente dela), cerca emendada pelos vizinhos. As portas ficam de fora:
 * `DoorSprites` as desenha com a animação de abrir/fechar.
 * Cubos e paredes têm render próprio (`ChunkBlocks`) e devolvem null. Ainda sem animação de porta nem brilhos (M3).
 */
/** Objetos do conjunto isométrico: o plano gira 45° para encarar a câmera isométrica (ADR 0036). */
const ISO_PROP_SET: ReadonlySet<BlockId> = new Set(ISO_PROPS);

export function worldSpriteArt(world: World, textures: BlockTextures, isometric = false): (id: BlockId, x: number, y: number) => SpriteDraw | null {
  const fenceCache = new Map<number, SpriteDraw>();
  const fence = (id: BlockId, x: number, y: number): SpriteDraw | null => {
    const pieces = textures.fencePieces.get(id);
    if (!pieces) return null;
    const j = (dx: number, dy: number) => joinsFence(world.getObject(x + dx, y + dy));
    const n = j(0, -1), e = j(1, 0), s = j(0, 1), w = j(-1, 0);
    const key = id * 16 + ((n ? 1 : 0) | (e ? 2 : 0) | (s ? 4 : 0) | (w ? 8 : 0));
    let hit = fenceCache.get(key);
    if (hit) return hit;
    // Compõe as peças (cortes na âncora, como `Renderer.drawFence`) num quadro do tamanho da tira; só composição de canvas.
    const { w: fw, h: fh, ax } = FENCE_FRAME;
    const c = document.createElement('canvas');
    c.width = fw;
    c.height = fh;
    const ctx = c.getContext('2d')!;
    const parts = fenceParts(n, e, s, w);
    const piece = (p: number, sx: number, sy: number, sw: number, sh: number) => ctx.drawImage(pieces[p], sx, sy, sw, sh, sx, sy, sw, sh);
    if (parts.whole !== null) piece(parts.whole, 0, 0, fw, fh);
    else {
      if (parts.north) piece(FencePiece.ArmNorth, 0, 0, fw, fh);
      if (parts.west) piece(FencePiece.Horizontal, 0, 0, ax, fh);
      if (parts.east) piece(FencePiece.Horizontal, ax, 0, fw - ax, fh);
      if (parts.post) piece(FencePiece.Post, 0, 0, fw, fh);
      if (parts.south) piece(FencePiece.ArmSouth, 0, 0, fw, fh);
    }
    const wpx = fw * FENCE_SCALE, hpx = fh * FENCE_SCALE;
    // Sombra no chão: sprite à parte (translúcido; o sprite sólido do 3D descartaria o que tem pouco alfa), atrás da cerca.
    const sc = document.createElement('canvas');
    sc.width = fw;
    sc.height = fh;
    drawFenceShadow(sc.getContext('2d')!, FENCE_FRAME.ax, FENCE_FRAME.ay, 1, n || parts.whole === FencePiece.Vertical, e || parts.whole === FencePiece.Horizontal, s || parts.whole === FencePiece.Vertical, w || parts.whole === FencePiece.Horizontal);
    hit = {
      walkable: false,
      sprite: { canvas: c, ox: FENCE_OFFSET.x, oy: FENCE_OFFSET.y, w: wpx, h: hpx, hit: { x: FENCE_OFFSET.x, y: FENCE_OFFSET.y, w: wpx, h: hpx } },
      shadow: { canvas: sc, ox: FENCE_OFFSET.x, oy: FENCE_OFFSET.y, w: wpx, h: hpx, hit: { x: 0, y: 0, w: 0, h: 0 } },
    };
    fenceCache.set(key, hit);
    return hit;
  };

  return (id, x, y) => {
    if (id === Block.AIR) return null;
    if (isometric && id === Block.CAULDRON) return null; // o Santuário desenha o caldeirão como malha 3D (`IsoCauldrons`)
    const def = blockDef(id);
    if (def.shape === 'cube' || def.shape === 'wall' || def.shape === 'wall-door') return null;
    if (isGate(id) && textures.gateFrames.size) return null; // porteira animada: `DoorSprites` (instância própria)
    if (isDoor(id)) return null; // portas têm render próprio, com animação (`DoorSprites`, M3.4)
    if (isFence(id)) return fence(id, x, y);
    const vars = textures.variants.get(id);
    const salt = isTownArt(id) ? 0x7041 : world.seed;
    // A flor do campo desenha a espécie que ela solta ao ser quebrada (`wildFlowerIndex`: mesma conta, 15 quadros).
    const pick = id === Block.FLOWER && vars?.length === FLOWER_BLOCKS.length ? wildFlowerIndex(world.seed, x, y) : vars ? Math.floor(hash2(salt, x * 7 + 3, y * 13 - 1) * vars.length) : 0;
    const sprite = vars ? vars[pick] : textures.objects.get(id);
    // Grade fina (ADR 0032): quem mantém os pixels de hoje cresce em células (`objectScaleFor`; árvore = tronco 1 × 1, desenho alto).
    // sebes da cidade repetem em todas as células finas (linha contínua): ficam do tamanho da célula, sem ampliar
    const f = id === Block.HEDGE ? 1 : objectScaleFor(def.shape);
    const scale = f > 1 ? f : undefined;
    return sprite ? { sprite, walkable: !def.solid, stack: textures.stackDraw.get(id), scale, yaw: ISO_PROP_SET.has(id) || isometric ? Math.PI / 4 : undefined } : null;
  };
}

