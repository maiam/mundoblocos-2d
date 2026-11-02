import { CHUNK_SIZE, CUBE_FRONT, MAX_STACK, TILE } from '../config';
import type { Camera } from '../game/camera';
import type { ItemDrop } from '../game/drops';
import type { Actor } from '../game/entities';
import type { Player } from '../game/player';
import { Block, blockDef, type BlockId, isDoor } from '../world/blocks';
import { hash2 } from '../world/random';
import type { World } from '../world/world';
import { ActorSprites, drawHeart } from './character';
import { ItemIcons, loadCropSprites } from './itemArt';
import { ChunkRenderer } from './chunkRenderer';
import { rgba } from './color';
import { type SkyState, skyAt } from './daycycle';
import { Particles } from './particles';
import { createBlockTextures, type BlockTextures, type Sprite } from './textures';

/** Máximo de chunks (chão) re-renderizados por frame. */
const MAX_CHUNK_RENDERS_PER_FRAME = 2;
/** Duração da animação de abrir/fechar a porta (s). */
const DOOR_ANIM_S = 0.32;

export interface RenderOptions {
  player: Player;
  /** Todos os atores (personagem + NPCs), desenhados com ordenação por profundidade. */
  actors: Actor[];
  showChunkBorders: boolean;
  hover: { x: number; y: number; valid: boolean } | null;
  /** Quebra em andamento (segurando): célula e progresso 0..1. */
  breaking: { x: number; y: number; progress: number } | null;
  /** Itens caídos no chão (colheita). */
  drops: ItemDrop[];
  /** Alvo à frente da personagem parada (botão de ação): contorno de seleção. */
  focus: { x: number; y: number; valid: boolean } | null;
  /** Ovelha sob o cursor quando o trigo está selecionado (posição dos pés, em células). */
  hoverSheep: { x: number; y: number; valid: boolean; attack?: boolean } | null;
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
  private readonly actorSprites = new ActorSprites();
  private readonly itemIcons = new ItemIcons();
  private readonly particles = new Particles();
  private readonly ctx: CanvasRenderingContext2D;
  sky: SkyState = skyAt(0.3);
  /** Estado visto por porta (aparência apenas): quando mudou de aberta/fechada, para animar. */
  private readonly doorAnim = new Map<number, { open: boolean; since: number }>();

  constructor(canvas: HTMLCanvasElement, private readonly world: World) {
    this.ctx = canvas.getContext('2d')!;
    this.textures = createBlockTextures();
    this.chunks = new ChunkRenderer(world, this.textures);
    loadCropSprites(this.textures.objects);
  }

  draw(cam: Camera, opts: RenderOptions): void {
    const ctx = this.ctx;
    const dpr = window.devicePixelRatio || 1;
    const w = cam.width;
    const h = cam.height;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    // Fundo (visível além das bordas de mundos limitados): céu do perfil.
    const [skyTop, skyBottom] = this.world.profile.sky;
    if (skyTop === skyBottom) {
      ctx.fillStyle = skyTop;
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, skyTop);
      g.addColorStop(1, skyBottom);
      ctx.fillStyle = g;
    }
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
    const by1 = Math.floor(wy1 / TILE) + 4; // sprites altos/pilhas de 3/portas sobem até ~2,5 células
    const glows: Glow[] = [];
    const p = opts.player;
    // Atores e itens caídos agrupados pela linha da base; dentro da linha, de trás para frente.
    type Drawable = { y: number; draw: () => void };
    const byRow = new Map<number, Drawable[]>();
    const enqueue = (y: number, draw: () => void) => {
      const row = Math.min(by1, Math.max(by0, Math.floor(y)));
      const list = byRow.get(row);
      if (list) list.push({ y, draw }); else byRow.set(row, [{ y, draw }]);
    };
    for (const a of opts.actors) enqueue(a.y, () => this.drawActor(cam, a, opts.elapsed));
    for (const d of opts.drops) enqueue(d.y, () => this.drawDrop(cam, d, opts.elapsed));
    if (opts.hoverSheep) {
      const hs = opts.hoverSheep;
      enqueue(hs.y - 0.01, () => this.drawSheepRing(cam, hs));
    }

    for (let y = by0; y <= by1; y++) {
      for (let x = bx0; x <= bx1; x++) {
        const id = this.world.getObject(x, y);
        if (isDoor(id)) {
          this.drawDoor(cam, id, x, y, opts.elapsed);
        } else if (id !== Block.AIR) {
          this.drawObject(cam, id, x, y, 0, glows);
          for (let level = 1; level < MAX_STACK; level++) {
            const up = this.world.getLevel(x, y, level);
            if (up === Block.AIR) break;
            this.drawObject(cam, up, x, y, level, glows);
          }
        } else if (blockDef(this.world.getGround(x, y)).liquid) {
          this.waterGlint(cam, x, y, opts.elapsed);
        }
      }
      const items = byRow.get(y);
      if (items) {
        items.sort((a, b) => a.y - b.y);
        for (const it of items) it.draw();
      }
    }

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
    if (opts.focus) this.drawFocus(cam, opts.focus, opts.elapsed);
    if (opts.hover) this.drawHover(cam, opts.hover);
    if (opts.breaking) this.drawBreaking(cam, opts.breaking);
  }

  private drawObject(cam: Camera, id: BlockId, x: number, y: number, level: number, glows: Glow[]): void {
    const vars = this.textures.variants.get(id);
    const sprite = vars ? vars[Math.floor(hash2(this.world.seed, x * 7 + 3, y * 13 - 1) * vars.length)] : this.textures.objects.get(id);
    if (sprite) {
      const n = this.textures.stackDraw.get(id) ?? 1;
      for (let k = 0; k < n; k++) this.drawSprite(cam, sprite, x, y, level + k);
    }
    const glow = this.textures.glowColor.get(id);
    if (glow) {
      const lift = blockDef(id).shape === 'tree' ? -0.9 : 0.1 - (level * CUBE_FRONT) / TILE;
      glows.push({ x: x + 0.5, y: y + lift, color: glow });
    }
  }

  /** Porta: quadro estático (fechada/aberta) ou da animação logo após mudar de estado. */
  private drawDoor(cam: Camera, id: BlockId, x: number, y: number, elapsed: number): void {
    const open = id === Block.OAK_DOOR_OPEN;
    const key = x * 100003 + y;
    let st = this.doorAnim.get(key);
    if (!st) {
      if (this.doorAnim.size > 1024) this.doorAnim.clear();
      st = { open, since: -Infinity }; // primeira vez vista: sem animação
      this.doorAnim.set(key, st);
    } else if (st.open !== open) {
      st.open = open;
      st.since = elapsed;
    }
    const t = (elapsed - st.since) / DOOR_ANIM_S;
    const step = Math.min(3, Math.floor(t * 4));
    const frame = t < 1 ? (open ? step : 4 + step) : open ? 3 : 0;
    this.drawSprite(cam, this.textures.doorFrames[frame], x, y);
  }

  /** Desenha um sprite na célula; cada nível de pilha sobe CUBE_FRONT px. */
  private drawSprite(cam: Camera, s: Sprite, x: number, y: number, level = 0): void {
    const z = cam.zoom;
    const sx = Math.round(cam.worldToScreenX(x * TILE + s.ox));
    const sy = Math.round(cam.worldToScreenY(y * TILE + s.oy - level * CUBE_FRONT));
    this.ctx.drawImage(s.canvas, sx, sy, Math.round(s.w * z), Math.round(s.h * z));
  }

  private drawActor(cam: Camera, a: Actor, elapsed: number): void {
    const fx = cam.worldToScreenX(a.x * TILE);
    const fy = cam.worldToScreenY(a.y * TILE - a.visualZ * CUBE_FRONT);
    const sheet = this.actorSprites.get(a.kind);
    sheet.draw(this.ctx, fx, fy, cam.zoom, a, elapsed);
    if (a.inLove) {
      // Coração flutuando acima da cabeça enquanto está apaixonada.
      const bob = Math.sin(elapsed * 3 + a.x) * 3 * cam.zoom;
      const size = 9 * cam.zoom * (1 + 0.08 * Math.sin(elapsed * 6));
      drawHeart(this.ctx, fx, fy - sheet.drawHeight * cam.zoom - 4 * cam.zoom + bob, size);
    }
  }

  /** Item caído: ícone pequeno quicando, com sombra. */
  private drawDrop(cam: Camera, d: ItemDrop, elapsed: number): void {
    const img = this.itemIcons.get(d.item);
    const fx = cam.worldToScreenX(d.x * TILE);
    const fy = cam.worldToScreenY(d.y * TILE);
    const z = cam.zoom;
    // Pulo de saída (primeiros 0,4 s) + flutuação.
    const pop = d.age < 0.4 ? Math.sin((d.age / 0.4) * Math.PI) * 10 : 0;
    const bob = 2 + Math.sin(elapsed * 4 + d.x * 3) * 1.5;
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(30, 20, 70, 0.28)';
    ctx.beginPath();
    ctx.ellipse(fx, fy, 6 * z, 2.2 * z, 0, 0, Math.PI * 2);
    ctx.fill();
    if (!img) return;
    const s = 15 * z;
    const ratio = img.naturalWidth / img.naturalHeight;
    ctx.drawImage(img, fx - (s * ratio) / 2, fy - s - (bob + pop) * z, s * ratio, s);
  }

  /** Anel sob a ovelha indicando que ela pode (ou não) receber trigo. */
  private drawSheepRing(cam: Camera, hs: NonNullable<RenderOptions['hoverSheep']>): void {
    const ctx = this.ctx;
    const fx = cam.worldToScreenX(hs.x * TILE);
    const fy = cam.worldToScreenY(hs.y * TILE);
    // Dourado = pode receber trigo; rosado = não pode; vermelho = alvo do golpe de espada.
    const [stroke, glow] = hs.attack
      ? ['rgba(255, 70, 70, 0.95)', 'rgba(255, 40, 40, 0.85)']
      : hs.valid
        ? ['rgba(255, 236, 160, 0.95)', 'rgba(255, 212, 107, 0.9)']
        : ['rgba(255, 120, 140, 0.9)', 'rgba(255, 80, 120, 0.8)'];
    ctx.save();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = stroke;
    ctx.shadowColor = glow;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.ellipse(fx, fy, 0.5 * TILE * cam.zoom, 0.2 * TILE * cam.zoom, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
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

  /** Retângulo de tela do que está no topo da célula (objeto, ou o chão). */
  private cellScreenRect(cam: Camera, x: number, y: number): { sx: number; sy: number; w: number; h: number } {
    const top = this.world.topBlock(x, y);
    const sprite = top ? this.textures.objects.get(top.id) : undefined;
    const r = sprite?.hit ?? { x: 0, y: 0, w: TILE, h: TILE };
    const lift = (top?.level ?? 0) * CUBE_FRONT;
    return {
      sx: cam.worldToScreenX(x * TILE + r.x),
      sy: cam.worldToScreenY(y * TILE + r.y - lift),
      w: r.w * cam.zoom,
      h: r.h * cam.zoom,
    };
  }

  /**
   * Seleção do alvo à frente: cantoneiras que "respiram" ao redor do bloco do
   * topo (ou da célula), douradas se há ação possível, rosadas se não.
   */
  private drawFocus(cam: Camera, f: NonNullable<RenderOptions['focus']>, elapsed: number): void {
    const ctx = this.ctx;
    const { sx, sy, w, h } = this.cellScreenRect(cam, f.x, f.y);
    const pulse = 1 + 0.06 * Math.sin(elapsed * 5);
    const cx = sx + w / 2;
    const cy = sy + h / 2;
    const hw = (w / 2) * pulse + 2;
    const hh = (h / 2) * pulse + 2;
    const len = Math.min(w, h) * 0.28;
    ctx.save();
    ctx.lineWidth = Math.max(2.5, cam.zoom * 1.4);
    ctx.lineCap = 'round';
    ctx.strokeStyle = f.valid ? '#ffe9a8' : 'rgba(255, 150, 170, 0.9)';
    ctx.shadowColor = f.valid ? 'rgba(255, 212, 107, 0.95)' : 'rgba(255, 80, 120, 0.7)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    for (const [sxn, syn] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
      const x = cx + sxn * hw;
      const y = cy + syn * hh;
      ctx.moveTo(x, y - syn * len);
      ctx.lineTo(x, y);
      ctx.lineTo(x - sxn * len, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  /** Rachaduras que crescem com o progresso + anel de carregamento. */
  private drawBreaking(cam: Camera, b: NonNullable<RenderOptions['breaking']>): void {
    const ctx = this.ctx;
    const { sx, sy, w, h } = this.cellScreenRect(cam, b.x, b.y);
    const cx = sx + w / 2;
    const cy = sy + h / 2;
    const p = Math.min(1, b.progress);
    ctx.save();
    ctx.beginPath();
    ctx.rect(sx, sy, w, h);
    ctx.clip();
    ctx.fillStyle = `rgba(20, 12, 40, ${0.25 * p})`;
    ctx.fillRect(sx, sy, w, h);
    // Rachaduras determinísticas a partir do centro; mais ramos conforme avança.
    ctx.strokeStyle = `rgba(30, 18, 50, ${0.5 + 0.4 * p})`;
    ctx.lineWidth = Math.max(1.5, cam.zoom);
    ctx.lineCap = 'round';
    const branches = Math.ceil(p * 7);
    const reach = Math.max(w, h) * 0.55 * p;
    for (let i = 0; i < branches; i++) {
      const a = (i / 7) * Math.PI * 2 + hash2(b.x * 31 + i, b.y, 5) * 0.8;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      let px = cx;
      let py = cy;
      for (let k = 1; k <= 3; k++) {
        const jitter = (hash2(b.x + k, b.y + i, 9) - 0.5) * 0.9;
        px = cx + Math.cos(a + jitter) * reach * (k / 3);
        py = cy + Math.sin(a + jitter) * reach * (k / 3);
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.restore();

    const r = Math.max(14, Math.min(w, h) * 0.32);
    ctx.save();
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(28, 22, 64, 0.55)';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#ffd46b';
    ctx.shadowColor = 'rgba(255, 212, 107, 0.8)';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private drawHover(cam: Camera, hover: NonNullable<RenderOptions['hover']>): void {
    const ctx = this.ctx;
    const top = this.world.topBlock(hover.x, hover.y);
    const sprite = top ? this.textures.objects.get(top.id) : undefined;
    const r = sprite?.hit ?? { x: 0, y: 0, w: TILE, h: TILE };
    const lift = (top?.level ?? 0) * CUBE_FRONT;
    const sx = cam.worldToScreenX(hover.x * TILE + r.x);
    const sy = cam.worldToScreenY(hover.y * TILE + r.y - lift);
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
    for (let y = gy + 3; y >= gy; y--) {
      for (const x of [gx, gx - 1, gx + 1]) {
        const stackTop = this.world.topBlock(x, y);
        if (!stackTop) continue;
        const height = stackTop.level;
        const id: BlockId = stackTop.id;
        const s = this.textures.objects.get(id);
        if (!s) continue;
        // A pilha inteira é clicável: do topo do bloco de cima até a base da célula.
        const lx = wx - x * TILE;
        const ly = wy - y * TILE;
        const top = s.hit.y - height * CUBE_FRONT;
        if (lx >= s.hit.x && lx < s.hit.x + s.hit.w && ly >= top && ly < s.hit.y + s.hit.h) {
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
