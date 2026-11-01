import { CHUNK_SIZE, TILE } from '../config';
import { type BlockId, blockDef } from '../world/blocks';
import type { Chunk } from '../world/chunk';
import { hash2 } from '../world/random';
import type { World } from '../world/world';
import { rgba } from './color';
import { type BlockTextures, groundVariant, TEX_RES } from './textures';

const CHUNK_PX = CHUNK_SIZE * TILE;
/** Altura da barranca (face frontal do chão) vista sobre a água. */
const BANK_H = 7;
/** Frames sem uso antes de liberar o cache de um chunk. */
const IDLE_FRAMES = 90;

interface CachedChunk {
  canvas: HTMLCanvasElement;
  version: number;
  lastUsed: number;
}

/**
 * Pré-renderiza a camada de CHÃO de cada chunk (com barrancas, espuma, grade
 * e sombras dos objetos) em um canvas offscreen, invalidado pela `version`.
 * Objetos e personagem são desenhados por frame, ordenados por profundidade.
 */
export class ChunkRenderer {
  private readonly cache = new Map<Chunk, CachedChunk>();
  private readonly pool: HTMLCanvasElement[] = [];
  private frame = 0;

  constructor(private readonly world: World, private readonly tex: BlockTextures) {}

  beginFrame(): void {
    this.frame++;
    if (this.frame % 30 === 0) {
      for (const [chunk, entry] of this.cache) {
        if (this.frame - entry.lastUsed > IDLE_FRAMES) {
          this.cache.delete(chunk);
          if (this.pool.length < 8) this.pool.push(entry.canvas);
        }
      }
    }
  }

  get(chunk: Chunk, allowRender: boolean): HTMLCanvasElement | null {
    const cached = this.cache.get(chunk);
    if (cached && cached.version === chunk.version) {
      cached.lastUsed = this.frame;
      return cached.canvas;
    }
    if (!allowRender) return cached?.canvas ?? null;
    const canvas = cached?.canvas ?? this.pool.pop() ?? createChunkCanvas();
    this.render(chunk, canvas);
    this.cache.set(chunk, { canvas, version: chunk.version, lastUsed: this.frame });
    return canvas;
  }

  isFresh(chunk: Chunk): boolean {
    return this.cache.get(chunk)?.version === chunk.version;
  }

  private render(chunk: Chunk, canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(TEX_RES, 0, 0, TEX_RES, 0, 0);
    ctx.clearRect(0, 0, CHUNK_PX, CHUNK_PX);
    const world = this.world;
    const seed = world.seed;
    const x0 = chunk.cx * CHUNK_SIZE;
    const y0 = chunk.cy * CHUNK_SIZE;
    const liquid = (id: BlockId) => blockDef(id).liquid;

    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const x = x0 + lx;
        const y = y0 + ly;
        const px = lx * TILE;
        const py = ly * TILE;
        const g = chunk.getGround(lx, ly);
        const tile = groundVariant(this.tex, g, hash2(seed, x, y));
        if (tile) ctx.drawImage(tile, px, py, TILE, TILE);

        if (liquid(g)) {
          // Barranca: o chão ao norte parece mais alto que a água.
          const north = world.getGround(x, y - 1);
          if (!liquid(north)) {
            const bank = this.tex.bankColor.get(north) ?? '#9a6a42';
            const grad = ctx.createLinearGradient(0, py, 0, py + BANK_H);
            grad.addColorStop(0, bank);
            grad.addColorStop(1, rgba(bank, 0.75));
            ctx.fillStyle = grad;
            ctx.fillRect(px, py, TILE, BANK_H);
            ctx.fillStyle = 'rgba(30, 20, 60, 0.35)';
            ctx.fillRect(px, py + BANK_H, TILE, 3);
          }
          // Espuma nas margens laterais e sul.
          ctx.fillStyle = 'rgba(235, 252, 255, 0.7)';
          if (!liquid(world.getGround(x - 1, y))) ctx.fillRect(px, py, 2, TILE);
          if (!liquid(world.getGround(x + 1, y))) ctx.fillRect(px + TILE - 2, py, 2, TILE);
          if (!liquid(world.getGround(x, y + 1))) ctx.fillRect(px, py + TILE - 2, TILE, 2);
        }

        // Grade sutil de blocos.
        ctx.fillStyle = 'rgba(40, 30, 80, 0.07)';
        ctx.fillRect(px, py, TILE, 1);
        ctx.fillRect(px, py, 1, TILE);

        // Sombra projetada pelos objetos (luz de cima-esquerda → sombra ao sul/leste).
        const obj = blockDef(chunk.getObject(lx, ly));
        if (obj.shape === 'cube') {
          // Pilhas mais altas projetam sombra maior.
          const tall = chunk.getUpper(lx, ly) !== 0 ? 1.45 : 1;
          ctx.fillStyle = `rgba(30, 20, 70, ${0.26 * tall})`;
          ctx.beginPath();
          ctx.ellipse(px + TILE * 0.6 + (tall - 1) * 6, py + TILE - 1, TILE * 0.55 * tall, 6 * tall, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (obj.shape === 'tree') {
          ctx.fillStyle = 'rgba(30, 20, 70, 0.24)';
          ctx.beginPath();
          ctx.ellipse(px + TILE * 0.62, py + TILE * 0.82, TILE * 0.75, TILE * 0.32, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
}

function createChunkCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = CHUNK_PX * TEX_RES;
  c.height = CHUNK_PX * TEX_RES;
  return c;
}
