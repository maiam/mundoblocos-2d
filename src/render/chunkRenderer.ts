import { CHUNK_SIZE, TILE } from '../config';
import { Block, type BlockId, blockDef } from '../world/blocks';
import type { Chunk } from '../world/chunk';
import type { World } from '../world/world';
import { type BlockTextures, GRASS_TUFT_H } from './textures';

/** Margem superior do canvas do chunk para tufos que transbordam para cima. */
export const CHUNK_PAD_TOP = GRASS_TUFT_H + 2;
const CHUNK_PX = CHUNK_SIZE * TILE;

export interface GlowPoint {
  x: number;
  y: number;
  color: string;
}

interface CachedChunk {
  canvas: HTMLCanvasElement;
  version: number;
  glows: GlowPoint[];
}

/**
 * Pré-renderiza cada chunk em um canvas offscreen (cache invalidado pela
 * `version` do chunk). Desenhar o mundo vira um drawImage por chunk.
 */
export class ChunkRenderer {
  private readonly cache = new Map<Chunk, CachedChunk>();
  private readonly pool: HTMLCanvasElement[] = [];

  constructor(private readonly world: World, private readonly tex: BlockTextures) {}

  /** Retorna o cache válido; re-renderiza se houver orçamento. */
  get(chunk: Chunk, allowRender: boolean): CachedChunk | null {
    const cached = this.cache.get(chunk);
    if (cached && cached.version === chunk.version) return cached;
    if (!allowRender) return cached ?? null;
    const canvas = cached?.canvas ?? this.pool.pop() ?? createChunkCanvas();
    const glows = this.render(chunk, canvas);
    const entry = { canvas, version: chunk.version, glows };
    this.cache.set(chunk, entry);
    return entry;
  }

  /** Libera canvases de chunks que não estão mais carregados. */
  prune(isLoaded: (c: Chunk) => boolean): void {
    for (const [chunk, entry] of this.cache) {
      if (!isLoaded(chunk)) {
        this.cache.delete(chunk);
        if (this.pool.length < 32) this.pool.push(entry.canvas);
      }
    }
  }

  private render(chunk: Chunk, canvas: HTMLCanvasElement): GlowPoint[] {
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const world = this.world;
    const gen = world.generator;
    const x0 = chunk.cx * CHUNK_SIZE;
    const y0 = chunk.cy * CHUNK_SIZE;
    const glows: GlowPoint[] = [];
    const tufts: [number, number, BlockId][] = [];

    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const x = x0 + lx;
      const surface = gen.surfaceY(x);
      const desert = gen.biomeAt(x).key === 'desert';
      for (let ly = 0; ly < CHUNK_SIZE; ly++) {
        const y = y0 + ly;
        const px = lx * TILE;
        const py = CHUNK_PAD_TOP + ly * TILE;
        let id = chunk.get(lx, ly);
        const def = blockDef(id);
        const depth = y - surface;
        const above = world.getBlock(x, y - 1);
        const aboveDef = blockDef(above);

        // 1) Parede de fundo em cavernas (atrás de ar, água, folhas, enfeites).
        if (!def.opaque && depth > 0) {
          const wallId = depth <= 4 ? (desert ? Block.SANDSTONE : Block.DIRT) : Block.STONE;
          ctx.drawImage(this.tex.wall.get(wallId)!, px, py);
        }

        // 2) Grama coberta por bloco opaco vira terra.
        if ((id === Block.GRASS || id === Block.ENCHANTED_GRASS) && aboveDef.opaque) id = Block.DIRT;

        const t = this.tex.tile.get(id);
        if (t) ctx.drawImage(t, px, py);

        // 3) Sombra de contato sob blocos sólidos (oclusão de ambiente).
        if (!def.solid && aboveDef.solid && aboveDef.opaque) {
          const g = ctx.createLinearGradient(0, py, 0, py + 12);
          g.addColorStop(0, 'rgba(20, 14, 48, 0.42)');
          g.addColorStop(1, 'rgba(20, 14, 48, 0)');
          ctx.fillStyle = g;
          ctx.fillRect(px, py, TILE, 12);
        }

        // Bordas expostas ganham traço mais forte (silhueta do terreno).
        if (def.solid && def.opaque) this.exposedEdges(ctx, x, y, px, py);

        // 4) Escurecimento por profundidade (exceto blocos luminosos).
        if (depth > 3 && !def.glow) {
          const a = Math.min(0.6, (depth - 3) / 30);
          ctx.fillStyle = `rgba(14, 10, 34, ${a})`;
          ctx.fillRect(px, py, TILE, TILE);
        }

        if (def.glow) {
          const color = this.tex.glowColor.get(id);
          if (color) glows.push({ x: x + 0.5, y: y + 0.5, color });
        }
        if (this.tex.tufts.has(id) && above === Block.AIR) tufts.push([px, py, id]);
      }
    }

    // 5) Tufos de grama transbordando para a célula de cima (por último, por cima de tudo).
    for (const [px, py, id] of tufts) {
      const tuft = this.tex.tufts.get(id)!;
      ctx.drawImage(tuft, px, py - tuft.height + 2);
    }
    return glows;
  }

  private exposedEdges(ctx: CanvasRenderingContext2D, x: number, y: number, px: number, py: number): void {
    const open = (bx: number, by: number) => !blockDef(this.world.getBlock(bx, by)).opaque;
    ctx.fillStyle = 'rgba(30, 20, 60, 0.55)';
    if (open(x - 1, y)) ctx.fillRect(px, py, 1.5, TILE);
    if (open(x + 1, y)) ctx.fillRect(px + TILE - 1.5, py, 1.5, TILE);
    if (open(x, y + 1)) ctx.fillRect(px, py + TILE - 1.5, TILE, 1.5);
    if (open(x, y - 1)) {
      ctx.fillStyle = 'rgba(255, 250, 230, 0.35)';
      ctx.fillRect(px + 2, py + 1, TILE - 4, 1);
    }
  }
}

function createChunkCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = CHUNK_PX;
  c.height = CHUNK_PX + CHUNK_PAD_TOP;
  return c;
}
