import { CHUNK_SIZE, TILE } from '../config';
import type { Camera } from '../game/camera';
import type { World } from '../world/world';
import { Background, type SkyState } from './background';
import { CHUNK_PAD_TOP, ChunkRenderer, type GlowPoint } from './chunkRenderer';
import { rgba } from './color';
import { Particles } from './particles';
import { createBlockTextures, type BlockTextures } from './textures';

/** Máximo de chunks re-renderizados por frame. */
const MAX_CHUNK_RENDERS_PER_FRAME = 3;

export interface RenderOptions {
  showChunkBorders: boolean;
  hover: { x: number; y: number; valid: boolean } | null;
  time: number;
  elapsed: number;
  dt: number;
}

export class Renderer {
  readonly textures: BlockTextures;
  private readonly chunks: ChunkRenderer;
  private readonly background: Background;
  private readonly particles = new Particles();
  private ctx: CanvasRenderingContext2D;
  sky: SkyState | null = null;

  constructor(canvas: HTMLCanvasElement, private readonly world: World) {
    this.ctx = canvas.getContext('2d')!;
    this.textures = createBlockTextures();
    this.chunks = new ChunkRenderer(world, this.textures);
    this.background = new Background(world.seed);
  }

  draw(cam: Camera, opts: RenderOptions): void {
    const ctx = this.ctx;
    const dpr = window.devicePixelRatio || 1;
    const w = cam.width;
    const h = cam.height;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const sky = this.background.draw(ctx, cam, w, h, opts.time, opts.elapsed);
    this.sky = sky;

    const rect = cam.visibleChunks(0);
    const size = CHUNK_SIZE * TILE;
    const glows: GlowPoint[] = [];
    let budget = MAX_CHUNK_RENDERS_PER_FRAME;

    for (let cy = rect.cy0; cy <= rect.cy1; cy++) {
      for (let cx = rect.cx0; cx <= rect.cx1; cx++) {
        const chunk = this.world.getChunk(cx, cy);
        if (!chunk) continue;
        const needs = !this.isFresh(chunk);
        const entry = this.chunks.get(chunk, needs && budget > 0);
        if (needs && budget > 0) budget--;
        if (!entry) continue;
        // Arredonda bordas para não surgir costura entre chunks.
        const sx0 = Math.round(cam.worldToScreenX(cx * size));
        const sx1 = Math.round(cam.worldToScreenX((cx + 1) * size));
        const sy0 = Math.round(cam.worldToScreenY(cy * size));
        const sy1 = Math.round(cam.worldToScreenY((cy + 1) * size));
        const pad = Math.round(CHUNK_PAD_TOP * cam.zoom);
        ctx.drawImage(entry.canvas, sx0, sy0 - pad, sx1 - sx0, sy1 - sy0 + pad);
        for (const g of entry.glows) glows.push(g);
      }
    }

    this.drawGlows(glows, cam, opts.elapsed);

    // Tinta do ciclo dia/noite sobre o mundo.
    if (sky.tintA > 0.001) {
      ctx.fillStyle = rgba(sky.tint, sky.tintA);
      ctx.fillRect(0, 0, w, h);
      if (glows.length) this.drawGlows(glows, cam, opts.elapsed, 0.6);
    }

    const [cwx, cwy] = cam.screenToWorld(w / 2, h / 2);
    const bx = Math.floor(cwx / TILE);
    const underground = this.world.isUnderground(bx, Math.floor(cwy / TILE) - 2);
    this.particles.update(opts.dt, w, h, this.world.biomeAt(bx), sky.night, underground);
    this.particles.draw(ctx);

    if (opts.showChunkBorders) this.drawChunkBorders(cam, rect);
    if (opts.hover) this.drawHover(cam, opts.hover);
  }

  private isFresh(chunk: Parameters<ChunkRenderer['get']>[0]): boolean {
    const e = this.chunks.get(chunk, false);
    return !!e && e.version === chunk.version;
  }

  /** Remove caches de chunks descarregados. */
  prune(): void {
    const loaded = new Set<unknown>();
    this.world.forEachChunk((c) => loaded.add(c));
    this.chunks.prune((c) => loaded.has(c));
  }

  private drawGlows(glows: GlowPoint[], cam: Camera, elapsed: number, strength = 1): void {
    if (!glows.length) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const g of glows) {
      const sx = cam.worldToScreenX(g.x * TILE);
      const sy = cam.worldToScreenY(g.y * TILE);
      if (sx < -100 || sy < -100 || sx > cam.width + 100 || sy > cam.height + 100) continue;
      const pulse = 0.75 + 0.25 * Math.sin(elapsed * 2 + g.x * 1.3 + g.y * 0.7);
      const r = TILE * 1.6 * cam.zoom;
      const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
      grad.addColorStop(0, rgba(g.color, 0.38 * pulse * strength));
      grad.addColorStop(1, rgba(g.color, 0));
      ctx.fillStyle = grad;
      ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
    }
    ctx.restore();
  }

  private drawChunkBorders(cam: Camera, rect: ReturnType<Camera['visibleChunks']>): void {
    const ctx = this.ctx;
    const size = CHUNK_SIZE * TILE;
    ctx.save();
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = 'rgba(255, 236, 140, 0.75)';
    ctx.font = '600 12px "Nunito", system-ui, sans-serif';
    for (let cy = rect.cy0; cy <= rect.cy1; cy++) {
      for (let cx = rect.cx0; cx <= rect.cx1; cx++) {
        const sx = Math.round(cam.worldToScreenX(cx * size)) + 0.5;
        const sy = Math.round(cam.worldToScreenY(cy * size)) + 0.5;
        const s = size * cam.zoom;
        ctx.strokeRect(sx, sy, s, s);
        const loaded = !!this.world.getChunk(cx, cy);
        const label = `chunk ${cx}, ${cy}`;
        const tw = ctx.measureText(label).width;
        ctx.fillStyle = 'rgba(30, 20, 70, 0.6)';
        ctx.fillRect(sx + 4, sy + 4, tw + 12, 18);
        ctx.fillStyle = loaded ? '#fff1a8' : '#ff9ab0';
        ctx.fillText(label, sx + 10, sy + 17);
      }
    }
    ctx.restore();
  }

  private drawHover(cam: Camera, hover: NonNullable<RenderOptions['hover']>): void {
    const ctx = this.ctx;
    const sx = cam.worldToScreenX(hover.x * TILE);
    const sy = cam.worldToScreenY(hover.y * TILE);
    const s = TILE * cam.zoom;
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = hover.valid ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 120, 140, 0.9)';
    ctx.shadowColor = hover.valid ? 'rgba(160, 220, 255, 0.9)' : 'rgba(255, 80, 120, 0.8)';
    ctx.shadowBlur = 8;
    ctx.strokeRect(sx + 1, sy + 1, s - 2, s - 2);
    ctx.restore();
  }

  /** Ícone (dataURL) de um bloco para a hotbar. */
  iconFor(id: number): string {
    const t = this.textures.tile.get(id as never);
    return t ? t.toDataURL() : '';
  }

}
