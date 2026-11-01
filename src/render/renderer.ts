import { CHUNK_SIZE, TILE } from '../config';
import type { Camera } from '../game/camera';
import type { Player } from '../game/player';
import { Block, blockDef, type BlockId } from '../world/blocks';
import { hash2 } from '../world/random';
import type { World } from '../world/world';
import { CharacterSprite } from './character';
import { ChunkRenderer } from './chunkRenderer';
import { rgba } from './color';
import { type SkyState, skyAt } from './daycycle';
import { Particles } from './particles';
import { createBlockTextures, type BlockTextures, type Sprite } from './textures';

/** Máximo de chunks (chão) re-renderizados por frame. */
const MAX_CHUNK_RENDERS_PER_FRAME = 2;

export interface RenderOptions {
  player: Player;
  showChunkBorders: boolean;
  hover: { x: number; y: number; valid: boolean } | null;
  time: number;
  elapsed: number;
  dt: number;
}

interface Glow {
  x: number;
  y: number;
  color: string;
}

/**
 * Frame em vista superior inclinada: chão (cache por chunk) → objetos e personagem
 * ordenados por linha (profundidade) → sombras de nuvens → tinta dia/noite →
 * brilhos → partículas → overlays.
 */
export class Renderer {
  readonly textures: BlockTextures;
  private readonly chunks: ChunkRenderer;
  private readonly character = new CharacterSprite();
  private readonly particles = new Particles();
  private readonly ctx: CanvasRenderingContext2D;
  sky: SkyState = skyAt(0.3);

  constructor(canvas: HTMLCanvasElement, private readonly world: World) {
    this.ctx = canvas.getContext('2d')!;
    this.textures = createBlockTextures();
    this.chunks = new ChunkRenderer(world, this.textures);
  }

  draw(cam: Camera, opts: RenderOptions): void {
    const ctx = this.ctx;
    const dpr = window.devicePixelRatio || 1;
    const w = cam.width;
    const h = cam.height;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = '#1b1838';
    ctx.fillRect(0, 0, w, h);

    // 1) Chão.
    this.chunks.beginFrame();
    const rect = cam.visibleChunks(0);
    const size = CHUNK_SIZE * TILE;
    let budget = MAX_CHUNK_RENDERS_PER_FRAME;
    for (let cy = rect.cy0; cy <= rect.cy1; cy++) {
      for (let cx = rect.cx0; cx <= rect.cx1; cx++) {
        const chunk = this.world.getChunk(cx, cy);
        if (!chunk) continue;
        const needs = !this.chunks.isFresh(chunk);
        const img = this.chunks.get(chunk, needs && budget > 0);
        if (needs && budget > 0) budget--;
        if (!img) continue;
        const sx0 = Math.round(cam.worldToScreenX(cx * size));
        const sx1 = Math.round(cam.worldToScreenX((cx + 1) * size));
        const sy0 = Math.round(cam.worldToScreenY(cy * size));
        const sy1 = Math.round(cam.worldToScreenY((cy + 1) * size));
        ctx.drawImage(img, sx0, sy0, sx1 - sx0, sy1 - sy0);
      }
    }

    // 2) Objetos + personagem por linha (de trás para frente).
    const [wx0, wy0] = cam.screenToWorld(0, 0);
    const [wx1, wy1] = cam.screenToWorld(w, h);
    const bx0 = Math.floor(wx0 / TILE) - 1;
    const bx1 = Math.floor(wx1 / TILE) + 1;
    const by0 = Math.floor(wy0 / TILE) - 1;
    const by1 = Math.floor(wy1 / TILE) + 3; // sprites altos sobem até 2 células
    const glows: Glow[] = [];
    const p = opts.player;
    const playerRow = Math.floor(p.y);
    let playerDrawn = false;

    for (let y = by0; y <= by1; y++) {
      for (let x = bx0; x <= bx1; x++) {
        const id = this.world.getObject(x, y);
        if (id !== Block.AIR) {
          const sprite = this.textures.objects.get(id);
          if (sprite) this.drawSprite(cam, sprite, x, y);
          const glow = this.textures.glowColor.get(id);
          if (glow) glows.push({ x: x + 0.5, y: y + (blockDef(id).shape === 'tree' ? -0.9 : 0.1), color: glow });
        } else if (blockDef(this.world.getGround(x, y)).liquid) {
          this.waterGlint(cam, x, y, opts.elapsed);
        }
      }
      if (y === playerRow) {
        this.drawPlayer(cam, p);
        playerDrawn = true;
      }
    }
    if (!playerDrawn) this.drawPlayer(cam, p);

    // 3) Sombras de nuvens passando.
    this.drawCloudShadows(cam, opts.elapsed, wx0, wy0, wx1, wy1);

    // 4) Ciclo dia/noite + brilhos (mais visíveis à noite).
    const sky = (this.sky = skyAt(opts.time));
    this.drawGlows(glows, cam, opts.elapsed, 0.7);
    if (sky.tintA > 0.001) {
      ctx.fillStyle = rgba(sky.tint, sky.tintA);
      ctx.fillRect(0, 0, w, h);
      this.drawGlows(glows, cam, opts.elapsed, sky.night);
    }

    // 5) Partículas do bioma onde o personagem está.
    this.particles.update(opts.dt, w, h, this.world.biomeAt(p.cellX, p.cellY), sky.night);
    this.particles.draw(ctx);

    if (opts.showChunkBorders) this.drawChunkBorders(cam, rect);
    if (opts.hover) this.drawHover(cam, opts.hover);
  }

  private drawSprite(cam: Camera, s: Sprite, x: number, y: number): void {
    const z = cam.zoom;
    const sx = Math.round(cam.worldToScreenX(x * TILE + s.ox));
    const sy = Math.round(cam.worldToScreenY(y * TILE + s.oy));
    this.ctx.drawImage(s.canvas, sx, sy, Math.round(s.w * z), Math.round(s.h * z));
  }

  private drawPlayer(cam: Camera, p: Player): void {
    const fx = cam.worldToScreenX(p.x * TILE);
    const fy = cam.worldToScreenY(p.y * TILE);
    this.character.draw(this.ctx, fx, fy, cam.zoom, p.facing, p.moving, p.walkTime);
  }

  private waterGlint(cam: Camera, x: number, y: number, elapsed: number): void {
    const hsh = hash2(this.world.seed, x, y);
    const phase = Math.sin(elapsed * 1.6 + hsh * 40);
    if (phase < 0.93) return;
    const a = (phase - 0.93) / 0.07;
    const sx = cam.worldToScreenX((x + 0.25 + hsh * 0.5) * TILE);
    const sy = cam.worldToScreenY((y + 0.3 + hsh * 0.4) * TILE);
    const r = 3 * cam.zoom;
    const ctx = this.ctx;
    ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * a})`;
    ctx.beginPath();
    ctx.moveTo(sx, sy - r);
    ctx.quadraticCurveTo(sx, sy, sx + r, sy);
    ctx.quadraticCurveTo(sx, sy, sx, sy + r);
    ctx.quadraticCurveTo(sx, sy, sx - r, sy);
    ctx.quadraticCurveTo(sx, sy, sx, sy - r);
    ctx.fill();
  }

  private drawCloudShadows(cam: Camera, elapsed: number, wx0: number, wy0: number, wx1: number, wy1: number): void {
    const cell = TILE * 14;
    const drift = elapsed * 9;
    const ctx = this.ctx;
    const gx0 = Math.floor((wx0 - drift) / cell) - 1;
    const gx1 = Math.floor((wx1 - drift) / cell) + 1;
    const gy0 = Math.floor(wy0 / cell) - 1;
    const gy1 = Math.floor(wy1 / cell) + 1;
    for (let gy = gy0; gy <= gy1; gy++) {
      for (let gx = gx0; gx <= gx1; gx++) {
        if (hash2(this.world.seed, gx, gy * 3 + 1) < 0.55) continue;
        const cx = (gx + hash2(this.world.seed, gx, gy)) * cell + drift;
        const cy = (gy + hash2(this.world.seed, gy, gx)) * cell;
        const r = cell * (0.35 + hash2(this.world.seed, gx + 9, gy) * 0.3) * cam.zoom;
        const sx = cam.worldToScreenX(cx);
        const sy = cam.worldToScreenY(cy);
        const g = ctx.createRadialGradient(sx, sy, r * 0.2, sx, sy, r);
        g.addColorStop(0, 'rgba(30, 24, 80, 0.13)');
        g.addColorStop(1, 'rgba(30, 24, 80, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(sx, sy, r, r * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawGlows(glows: Glow[], cam: Camera, elapsed: number, strength: number): void {
    if (!glows.length || strength <= 0.01) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const g of glows) {
      const sx = cam.worldToScreenX(g.x * TILE);
      const sy = cam.worldToScreenY(g.y * TILE);
      const pulse = 0.75 + 0.25 * Math.sin(elapsed * 2 + g.x * 1.3 + g.y * 0.7);
      const r = TILE * 1.5 * cam.zoom;
      const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
      grad.addColorStop(0, rgba(g.color, 0.35 * pulse * strength));
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
    ctx.strokeStyle = 'rgba(255, 236, 140, 0.8)';
    ctx.font = '600 12px "Nunito", system-ui, sans-serif';
    for (let cy = rect.cy0; cy <= rect.cy1; cy++) {
      for (let cx = rect.cx0; cx <= rect.cx1; cx++) {
        const sx = Math.round(cam.worldToScreenX(cx * size)) + 0.5;
        const sy = Math.round(cam.worldToScreenY(cy * size)) + 0.5;
        const s = size * cam.zoom;
        ctx.strokeRect(sx, sy, s, s);
        const label = `chunk ${cx}, ${cy}`;
        const tw = ctx.measureText(label).width;
        ctx.fillStyle = 'rgba(30, 20, 70, 0.6)';
        ctx.fillRect(sx + 4, sy + 4, tw + 12, 18);
        ctx.fillStyle = this.world.getChunk(cx, cy) ? '#fff1a8' : '#ff9ab0';
        ctx.fillText(label, sx + 10, sy + 17);
      }
    }
    ctx.restore();
  }

  private drawHover(cam: Camera, hover: NonNullable<RenderOptions['hover']>): void {
    const ctx = this.ctx;
    const id = this.world.getObject(hover.x, hover.y);
    const sprite = id !== Block.AIR ? this.textures.objects.get(id) : undefined;
    const r = sprite?.hit ?? { x: 0, y: 0, w: TILE, h: TILE };
    const sx = cam.worldToScreenX(hover.x * TILE + r.x);
    const sy = cam.worldToScreenY(hover.y * TILE + r.y);
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = hover.valid ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 120, 140, 0.9)';
    ctx.shadowColor = hover.valid ? 'rgba(160, 220, 255, 0.9)' : 'rgba(255, 80, 120, 0.8)';
    ctx.shadowBlur = 8;
    ctx.strokeRect(sx + 1, sy + 1, r.w * cam.zoom - 2, r.h * cam.zoom - 2);
    ctx.restore();
  }

  /**
   * Célula do objeto sob o ponto da tela, considerando que sprites sobem acima
   * da própria célula (testa primeiro os mais à frente). Sem objeto: célula do chão.
   */
  pick(cam: Camera, sx: number, sy: number): { x: number; y: number; hasObject: boolean } {
    const [wx, wy] = cam.screenToWorld(sx, sy);
    const gx = Math.floor(wx / TILE);
    const gy = Math.floor(wy / TILE);
    for (let y = gy + 2; y >= gy; y--) {
      for (const x of [gx, gx - 1, gx + 1]) {
        const id: BlockId = this.world.getObject(x, y);
        if (id === Block.AIR) continue;
        const s = this.textures.objects.get(id);
        if (!s) continue;
        const lx = wx - x * TILE;
        const ly = wy - y * TILE;
        if (lx >= s.hit.x && lx < s.hit.x + s.hit.w && ly >= s.hit.y && ly < s.hit.y + s.hit.h) {
          return { x, y, hasObject: true };
        }
      }
    }
    return { x: gx, y: gy, hasObject: false };
  }

  iconFor(id: BlockId): string {
    return this.textures.icons.get(id) ?? '';
  }
}
