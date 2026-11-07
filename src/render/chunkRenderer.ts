import { CHUNK_SIZE, TILE } from '../config';
import { Block, type BlockId, blockDef } from '../world/blocks';
import type { Chunk } from '../world/chunk';
import { hash2 } from '../world/random';
import type { World } from '../world/world';
import { rgba } from './color';
import { type BlockTextures, TEX_RES } from './textures';

const CHUNK_PX = CHUNK_SIZE * TILE;
/** Altura da barranca (face frontal do chão) vista sobre a água. */
const BANK_H = 7;
/** Altura da parede interna visível de um buraco. */
const WALL_H = 13;
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
/** Árvores pequenas (mudas e jovens): sombra reduzida. */
const SMALL_TREES = new Set<number>([Block.OAK_SAPLING, Block.OAK_YOUNG, Block.APPLE_SAPLING, Block.APPLE_YOUNG]);

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

  /** Marca todos os chunks para redesenhar (ex.: chegou arte que estava carregando em segundo plano). */
  invalidateAll(): void {
    for (const entry of this.cache.values()) entry.version = -1;
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

  /**
   * Borda do mundo limitado: onde o vizinho é céu aberto (VOID), a nuvem ganha
   * uma orla fofa (embaixo: "barriga" sombreada da nuvem; nas laterais/topo: brilho).
   */
  private drawSkyEdges(ctx: CanvasRenderingContext2D, x: number, y: number, px: number, py: number): void {
    const voidAt = (bx: number, by: number) => this.world.getGround(bx, by) === Block.VOID;
    if (voidAt(x, y + 1)) {
      const g = ctx.createLinearGradient(0, py + TILE - 10, 0, py + TILE);
      g.addColorStop(0, 'rgba(140, 150, 220, 0)');
      g.addColorStop(1, 'rgba(120, 128, 205, 0.55)');
      ctx.fillStyle = g;
      ctx.fillRect(px, py + TILE - 10, TILE, 10);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.arc(px + 4 + k * 8, py + TILE - 3, 4.2, Math.PI, 0);
        ctx.fill();
      }
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    if (voidAt(x, y - 1)) ctx.fillRect(px, py, TILE, 2);
    if (voidAt(x - 1, y)) ctx.fillRect(px, py, 2, TILE);
    if (voidAt(x + 1, y)) ctx.fillRect(px + TILE - 2, py, 2, TILE);
  }

  /** Buraco: fundo escuro, parede interna ao norte (vista 3/4) e bordas com contorno. */
  private drawHole(ctx: CanvasRenderingContext2D, x: number, y: number, px: number, py: number): void {
    const hole = (bx: number, by: number) => this.world.getGround(bx, by) === Block.HOLE;
    const g = ctx.createLinearGradient(0, py, 0, py + TILE);
    g.addColorStop(0, '#2b2040');
    g.addColorStop(1, '#3a2c4a');
    ctx.fillStyle = g;
    ctx.fillRect(px, py, TILE, TILE);
    if (!hole(x, y - 1)) {
      // Parede de terra visível do lado norte.
      const wall = ctx.createLinearGradient(0, py, 0, py + WALL_H);
      wall.addColorStop(0, '#9a6a42');
      wall.addColorStop(1, '#5e3c2a');
      ctx.fillStyle = wall;
      ctx.fillRect(px, py, TILE, WALL_H);
      ctx.fillStyle = 'rgba(255, 230, 190, 0.35)';
      ctx.fillRect(px, py, TILE, 1.5);
      ctx.fillStyle = 'rgba(40, 24, 50, 0.5)';
      for (let i = 0; i < 3; i++) ctx.fillRect(px + 5 + i * 10, py + 5 + (i % 2) * 4, 3, 2);
    }
    ctx.fillStyle = 'rgba(20, 12, 36, 0.55)';
    if (!hole(x - 1, y)) ctx.fillRect(px, py, 2.5, TILE);
    if (!hole(x + 1, y)) ctx.fillRect(px + TILE - 2.5, py, 2.5, TILE);
    if (!hole(x, y + 1)) {
      ctx.fillStyle = 'rgba(255, 240, 210, 0.4)';
      ctx.fillRect(px, py + TILE - 1.5, TILE, 1.5);
    }
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
        const h = hash2(seed, x, y);
        if (g === Block.HOLE) {
          this.drawHole(ctx, x, y, px, py);
        } else if (g === Block.WATER) {
          const w = this.tex.water;
          ctx.drawImage(w[Math.floor(h * w.length) % w.length], px, py, TILE, TILE);
        } else {
          // Material como chão: topo da arte da prancha SEMPRE na direção em que foi desenhado (regra do dono do
          // produto: nada gira nem espelha). Só a variação, quando o material tem mais de uma, é sorteada por célula.
          const vars = this.tex.groundVariants.get(g);
          const top = vars ? vars[Math.floor(hash2(seed, x * 3 + 1, y * 5 + 2) * vars.length)] : this.tex.groundTop.get(g);
          if (top) ctx.drawImage(top, px, py, TILE, TILE);
        }

        if (g !== Block.VOID && g !== Block.HOLE) this.drawSkyEdges(ctx, x, y, px, py);

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
          const tall = 1 + 0.45 * (chunk.filledLevels(lx, ly) - 1);
          ctx.fillStyle = `rgba(30, 20, 70, ${0.26 * tall})`;
          ctx.beginPath();
          ctx.ellipse(px + TILE * 0.6 + (tall - 1) * 6, py + TILE - 1, TILE * 0.55 * tall, 6 * tall, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (obj.shape === 'rock' && obj.id !== Block.TENT_PART) {
          ctx.fillStyle = 'rgba(30, 20, 70, 0.28)';
          ctx.beginPath();
          ctx.ellipse(px + TILE * 0.55, py + TILE - 3, TILE * 0.62, 7, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (obj.shape === 'door') {
          // Porta: sombra estreita ao pé (fechada) — aberta, só a lâmina de lado.
          ctx.fillStyle = 'rgba(30, 20, 70, 0.22)';
          ctx.beginPath();
          ctx.ellipse(px + TILE * 0.55, py + TILE - 2, TILE * (obj.solid ? 0.55 : 0.25), 4, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (obj.shape === 'wall') {
          // Parede alta: sombra larga ao pé.
          ctx.fillStyle = 'rgba(30, 20, 70, 0.3)';
          ctx.beginPath();
          ctx.ellipse(px + TILE * 0.6, py + TILE - 1, TILE * 0.62, 7, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (obj.shape === 'fence') {
          // Cerca/portão: faixa fina de sombra ao pé.
          ctx.fillStyle = 'rgba(30, 20, 70, 0.18)';
          ctx.beginPath();
          ctx.ellipse(px + TILE * 0.55, py + TILE - 3, TILE * 0.5, 4, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (obj.shape === 'tree') {
          // Muda e árvore jovem: sombra menor (a arte já traz o tufo de grama no pé).
          const k = SMALL_TREES.has(obj.id) ? 0.45 : 1;
          ctx.fillStyle = 'rgba(30, 20, 70, 0.24)';
          ctx.beginPath();
          ctx.ellipse(px + TILE * 0.62, py + TILE * 0.82, TILE * 0.75 * k, TILE * 0.32 * k, 0, 0, Math.PI * 2);
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
