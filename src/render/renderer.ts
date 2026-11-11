import { CHUNK_SIZE, CUBE_FRONT, MAX_STACK, TILE } from '../config';
import type { Camera } from '../game/camera';
import type { ItemDrop } from '../game/drops';
import type { Actor } from '../game/entities';
import type { Player } from '../game/player';
import { Block, blockDef, type BlockId, isDoor, isGate, joinsFence } from '../world/blocks';
import { FENCE_FRAME, FENCE_OFFSET, FENCE_SCALE, fenceParts } from './fence';
import { hash2 } from '../world/random';
import type { World } from '../world/world';
import { ActorSprites, drawHeart } from './character';
import { ItemIcons, itemIconUrl, loadCropSprites } from './itemArt';
import { getWaterArt } from './blockArt';
import { type ItemId, stackBlock } from '../world/items';
import { ChunkRenderer } from './chunkRenderer';
import { rgba } from './color';
import { type SkyState, skyAt } from './daycycle';
import { Particles } from './particles';
import { addDungeonTextures, createBlockTextures, cubeSpriteV2, drawCubeParts, type BlockTextures, type Sprite } from './textures';
import { type CubeView, cubeEdges, materialsV2InWorld, V2_BLOCKS } from './materialsV2';
import { drawThinHorizontalWall, horizontalWallShape } from './adaptiveWalls';
import { loadDungeonArt } from './blockArt';
import { isTownArt, TOWN_REACH } from './townArt';
import { DamageNumbers } from './damageNumbers';
import type { Hit } from '../world/progression';
import type { InteriorLayout } from '../world/interiors';
import type { Rect } from '../world/dungeon';
import { art } from './art';

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
  /** Flash vermelho de dano (1 → 0). */
  hurtFlash: number;
  /** Personagem dentro da dungeon: penumbra com luz ao redor dela. */
  inDungeon: boolean;
  /** Célula diante da entrada da dungeon (farol + seta na borda da tela), ou null. */
  entrance: [number, number] | null;
  /** Dentro do covil: área do labirinto (o resto da tela fica escuro — de dentro não se vê o mundo). */
  dungeonArea?: Rect | null;
  /** Cômodo onde a personagem está (ADR 0014): desenha só a arte dele e os atores, sem mundo em volta. */
  interior?: InteriorLayout | null;
  /** Escurecer ao passar por uma porta (1 → 0). */
  fade?: number;
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
  /** Ícones dos itens caídos: itens pelo pacote de arte; materiais pelo ícone do bloco. */
  private readonly itemIcons = new ItemIcons((id) => {
    const b = stackBlock(id);
    return b !== null ? this.iconFor(b) : itemIconUrl(id as ItemId);
  });
  private readonly particles = new Particles();
  private readonly damageNumbers = new DamageNumbers();
  private readonly ctx: CanvasRenderingContext2D;
  sky: SkyState = skyAt(0.3);
  /** Arte dos interiores por id (carrega em segundo plano; sem ela, o cômodo aparece só com o chão escuro). */
  private readonly interiorArt = new Map<string, HTMLImageElement>();
  /** Estado visto por porta (aparência apenas): quando mudou de aberta/fechada, para animar. */
  private readonly doorAnim = new Map<number, { open: boolean; since: number }>();
  /** O que o contorno dos cubos V2 precisa saber dos vizinhos (só leitura do mundo; ADR 0023). */
  private readonly cubeView: CubeView = {
    height: (x, y) => {
      let n = 0;
      while (n < MAX_STACK && blockDef(this.world.getLevel(x, y, n)).shape === 'cube') n++;
      return n;
    },
    v2: (x, y, level) => V2_BLOCKS[this.world.getLevel(x, y, level)] !== undefined,
  };

  constructor(canvas: HTMLCanvasElement, private readonly world: World) {
    this.ctx = canvas.getContext('2d')!;
    this.textures = createBlockTextures({ town: !!world.town });
    // Arte da dungeon em segundo plano (não atrasa o início): quando chega, entra nas texturas e o chão redesenha.
    void loadDungeonArt().then((d) => { if (d && addDungeonTextures(this.textures)) this.chunks.invalidateAll(); });
    this.chunks = new ChunkRenderer(world, this.textures);
    loadCropSprites(this.textures.objects);
    for (const [id, url] of Object.entries(art().interiors ?? {})) {
      if (!url) continue;
      const img = new Image();
      img.src = url;
      this.interiorArt.set(id, img);
    }
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

    if (opts.interior) {
      this.drawInterior(cam, opts, opts.interior);
      return;
    }

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

    // Buracos enchendo de água (animação da arte; o chão vira água no fim).
    this.drawWaterFlows(cam);

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

    // Construções da cidade são sprites largos/altos ancorados no canto inferior esquerdo: varre além da tela
    // (à esquerda e abaixo) só para elas.
    const town = !!this.world.town;
    const sx0 = town ? bx0 - TOWN_REACH.right : bx0;
    const sy1 = town ? by1 + TOWN_REACH.up : by1;
    const gates: number[] = [];
    for (let y = by0; y <= sy1; y++) {
      gates.length = 0;
      for (let x = sx0; x <= bx1; x++) {
        const id = this.world.getObject(x, y);
        // Sprites largos/altos ancorados no canto inferior esquerdo (cidade, caverna do covil): desenhados mesmo com a âncora fora da tela.
        if ((x < bx0 || y > by1) && !isTownArt(id) && id !== Block.DUNGEON_CAVE) continue;
        if (isDoor(id)) {
          this.drawDoor(cam, id, x, y, opts.elapsed);
        } else if (id === Block.FENCE && this.textures.fencePieces) {
          this.drawFence(cam, x, y, this.textures.fencePieces);
        } else if (isGate(id)) {
          gates.push(x); // depois da linha: os postes do portão cobrem as travessas das cercas vizinhas
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
      for (const gx of gates) this.drawObject(cam, this.world.getObject(gx, y), gx, y, 0, glows);
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

    // Números de dano (por cima da noite, para ler sempre).
    this.damageNumbers.draw(ctx, cam, opts.dt);

    // Farol na entrada da dungeon (visível também à noite).
    if (opts.entrance) this.drawBeacon(cam, opts.entrance, opts.elapsed, w, h);
    // Dentro do covil: fora do labirinto é só escuridão (o covil é isolado do mapa).
    if (opts.dungeonArea) this.darkenOutside(cam, opts.dungeonArea, w, h);
    // Dentro da dungeon: penumbra, com luz ao redor da personagem.
    if (opts.inDungeon) {
      const px = cam.worldToScreenX(p.x * TILE);
      const py = cam.worldToScreenY(p.y * TILE - 20);
      const g = ctx.createRadialGradient(px, py, TILE * cam.zoom * 1.6, px, py, Math.max(w, h) * 0.6);
      g.addColorStop(0, 'rgba(18, 8, 30, 0)');
      g.addColorStop(1, 'rgba(18, 8, 30, 0.7)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }

    // 5) Partículas do bioma onde o personagem está.
    this.particles.update(opts.dt, w, h, this.world.biomeAt(p.cellX, p.cellY), sky.night);
    this.particles.draw(ctx);

    if (opts.showChunkBorders) this.drawChunkBorders(cam, rect);
    this.drawOverlays(cam, opts);
  }

  /** Seleção, quebra, vinheta de dano e escurecer de porta (comuns ao mundo e aos interiores). */
  private drawOverlays(cam: Camera, opts: RenderOptions): void {
    const ctx = this.ctx;
    const w = cam.width;
    const h = cam.height;
    if (opts.focus) this.drawFocus(cam, opts.focus, opts.elapsed);
    if (opts.hover) this.drawHover(cam, opts.hover);
    if (opts.breaking) this.drawBreaking(cam, opts.breaking);
    // Dano: vinheta vermelha.
    if (opts.hurtFlash > 0) {
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7);
      g.addColorStop(0, 'rgba(255, 40, 80, 0)');
      g.addColorStop(1, `rgba(255, 40, 80, ${0.45 * opts.hurtFlash})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    if (opts.fade) {
      ctx.fillStyle = `rgba(10, 6, 16, ${Math.min(1, opts.fade)})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  /**
   * Interior: fundo escuro, a arte do cômodo cobrindo a área dele (a grade do mapa divide a imagem em partes iguais) e
   * os atores lá dentro por profundidade. Sem chão do mundo, céu, nuvens, noite nem partículas.
   */
  /** Pinta de escuro tudo fora do retângulo (células). */
  private darkenOutside(cam: Camera, a: Rect, w: number, h: number): void {
    const ctx = this.ctx;
    const x0 = Math.max(0, Math.round(cam.worldToScreenX(a.x0 * TILE)));
    const y0 = Math.max(0, Math.round(cam.worldToScreenY(a.y0 * TILE)));
    const x1 = Math.min(w, Math.round(cam.worldToScreenX((a.x1 + 1) * TILE)));
    const y1 = Math.min(h, Math.round(cam.worldToScreenY((a.y1 + 1) * TILE)));
    ctx.fillStyle = '#0b0612';
    ctx.fillRect(0, 0, w, y0);
    ctx.fillRect(0, y1, w, h - y1);
    ctx.fillRect(0, y0, x0, y1 - y0);
    ctx.fillRect(x1, y0, w - x1, y1 - y0);
  }

  private drawInterior(cam: Camera, opts: RenderOptions, room: InteriorLayout): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#120c18';
    ctx.fillRect(0, 0, cam.width, cam.height);
    const a = room.area;
    const x0 = Math.round(cam.worldToScreenX(a.x0 * TILE));
    const y0 = Math.round(cam.worldToScreenY(a.y0 * TILE));
    const x1 = Math.round(cam.worldToScreenX((a.x1 + 1) * TILE));
    const y1 = Math.round(cam.worldToScreenY((a.y1 + 1) * TILE));
    const img = this.interiorArt.get(room.def.id);
    if (img?.complete && img.naturalWidth) ctx.drawImage(img, x0, y0, x1 - x0, y1 - y0);
    else {
      ctx.fillStyle = '#7a4a2a';
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    }
    const inside = (x: number, y: number) => x >= a.x0 && x <= a.x1 + 1 && y >= a.y0 && y <= a.y1 + 1;
    const items: Array<{ y: number; draw: () => void }> = [];
    for (const act of opts.actors) if (inside(act.x, act.y)) items.push({ y: act.y, draw: () => this.drawActor(cam, act, opts.elapsed) });
    for (const d of opts.drops) if (inside(d.x, d.y)) items.push({ y: d.y, draw: () => this.drawDrop(cam, d, opts.elapsed) });
    items.sort((p, q) => p.y - q.y);
    for (const it of items) it.draw();
    this.damageNumbers.draw(ctx, cam, opts.dt);
    this.drawOverlays(cam, opts);
  }

  /**
   * Entrada da dungeon: coluna de luz roxa pulsando sobre a célula da frente; fora da tela, uma seta na borda
   * aponta para ela (o jogador a encontra a partir do início).
   */
  private drawBeacon(cam: Camera, [ex, ey]: [number, number], elapsed: number, w: number, h: number): void {
    const ctx = this.ctx;
    const z = cam.zoom;
    const sx = cam.worldToScreenX((ex + 0.5) * TILE);
    const sy = cam.worldToScreenY((ey + 0.5) * TILE);
    const pulse = 0.75 + 0.25 * Math.sin(elapsed * 3);
    const margin = 28;
    if (sx > -40 && sx < w + 40 && sy > -40 && sy < h + 40) {
      const colH = TILE * 3.2 * z;
      const g = ctx.createLinearGradient(0, sy - colH, 0, sy);
      g.addColorStop(0, 'rgba(190, 120, 255, 0)');
      g.addColorStop(1, `rgba(190, 120, 255, ${0.8 * pulse})`);
      ctx.fillStyle = g;
      ctx.fillRect(sx - 9 * z, sy - colH, 18 * z, colH);
      ctx.fillStyle = `rgba(255, 245, 255, ${0.55 * pulse})`;
      ctx.fillRect(sx - 2.5 * z, sy - colH * 0.8, 5 * z, colH * 0.8);
      ctx.fillStyle = `rgba(230, 200, 255, ${0.8 * pulse})`;
      ctx.beginPath();
      ctx.ellipse(sx, sy, 12 * z, 4.5 * z, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    // Seta na borda da tela, na direção da entrada.
    const ang = Math.atan2(sy - h / 2, sx - w / 2);
    const k = Math.min((w / 2 - margin) / Math.abs(Math.cos(ang) || 1e-6), (h / 2 - margin * 2.6) / Math.abs(Math.sin(ang) || 1e-6)); // longe da hotbar
    const ax = w / 2 + Math.cos(ang) * k;
    const ay = h / 2 + Math.sin(ang) * k;
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(ang);
    ctx.globalAlpha = 0.6 + 0.4 * pulse;
    ctx.fillStyle = '#c38cff';
    ctx.strokeStyle = '#2a1a48';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(-8, -10);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-8, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  /** Quadro da animação de enchimento sobre cada buraco que está enchendo (linha pela direção da água). */
  private drawWaterFlows(cam: Camera): void {
    const art = getWaterArt();
    if (!art) return;
    const fw = art.flow.width / 4;
    const fh = art.flow.height / 4;
    const row = { west: 0, east: 1, south: 2, north: 3 } as const;
    for (const f of this.world.waterFlows()) {
      const frame = Math.min(3, Math.floor(f.t * 4));
      const sx = Math.round(cam.worldToScreenX(f.x * TILE));
      const sy = Math.round(cam.worldToScreenY(f.y * TILE));
      const s = Math.round(TILE * cam.zoom);
      this.ctx.drawImage(art.flow, frame * fw, row[f.from] * fh, fw, fh, sx, sy, s, s);
    }
  }

  private drawObject(cam: Camera, id: BlockId, x: number, y: number, level: number, glows: Glow[]): void {
    // Cubo V2 (o padrão): desenhado como parte da massa de cubos vizinhos, sem risco entre eles (ADR 0023).
    const thinWall = horizontalWallShape(this.world, id, x, y, level) === 'thin';
    if (V2_BLOCKS[id] && materialsV2InWorld()) {
      const v2 = cubeSpriteV2(id, level, cubeEdges(this.cubeView, x, y, level));
      if (v2) {
        if (thinWall) this.drawAdaptiveWall(cam, v2, x, y, level);
        else this.drawCubeV2(cam, v2, x, y, level);
        return;
      }
    }
    const vars = this.textures.variants.get(id);
    // Variação por célula; na cidade, independente da seed (a cidade é sempre a mesma).
    const salt = isTownArt(id) ? 0x7041 : this.world.seed;
    const sprite = vars ? vars[Math.floor(hash2(salt, x * 7 + 3, y * 13 - 1) * vars.length)] : this.textures.objects.get(id);
    if (sprite) {
      const n = this.textures.stackDraw.get(id) ?? 1;
      for (let k = 0; k < n; k++) {
        if (thinWall) this.drawAdaptiveWall(cam, sprite, x, y, level + k);
        else this.drawSprite(cam, sprite, x, y, level + k);
      }
    }
    const glow = this.textures.glowColor.get(id);
    if (glow) {
      const at = this.textures.glowAt.get(id);
      const lift = blockDef(id).shape === 'tree' ? -0.9 : 0.1 - (level * CUBE_FRONT) / TILE;
      glows.push(at ? { x: x + 0.5 + at[0], y: y + 1 + at[1], color: glow } : { x: x + 0.5, y: y + lift, color: glow });
    }
  }

  /** Cerca: emenda com os vizinhos (cerca ou portão) cortando as peças na âncora (`render/fence.ts`). */
  private drawFence(cam: Camera, x: number, y: number, pieces: HTMLCanvasElement[]): void {
    const j = (dx: number, dy: number) => joinsFence(this.world.getObject(x + dx, y + dy));
    const parts = fenceParts(j(0, -1), j(1, 0), j(0, 1), j(-1, 0));
    const { w, h, ax, ay } = FENCE_FRAME;
    const z = cam.zoom * FENCE_SCALE;
    const left = cam.worldToScreenX(x * TILE + FENCE_OFFSET.x);
    const top = cam.worldToScreenY(y * TILE + FENCE_OFFSET.y);
    // Recorte (sx, sy, sw, sh) da peça, desenhado na mesma posição do quadro.
    const piece = (p: number, sx: number, sy: number, sw: number, sh: number) =>
      this.ctx.drawImage(pieces[p], sx, sy, sw, sh, Math.round(left + sx * z), Math.round(top + sy * z), Math.ceil(sw * z), Math.ceil(sh * z));
    if (parts.whole !== null) {
      piece(parts.whole, 0, 0, w, h);
      return;
    }
    if (parts.north) piece(1, 0, 0, w, ay);
    if (parts.west) piece(0, 0, 0, ax, h);
    if (parts.east) piece(0, ax, 0, w - ax, h);
    if (parts.south) piece(1, 0, ay, w, h - ay);
    if (parts.post) piece(2, 0, 0, w, h);
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

  /**
   * Cubo V2: as bordas (esquerda, direita, topo, divisão topo/frente e base) vêm do mesmo arredondamento, então cubos
   * vizinhos e níveis empilhados se encostam sem fresta nem sobreposição, em qualquer zoom.
   */
  private drawCubeV2(cam: Camera, s: Sprite, x: number, y: number, level: number): void {
    const left = Math.round(cam.worldToScreenX(x * TILE));
    const right = Math.round(cam.worldToScreenX((x + 1) * TILE));
    const wy = y * TILE + s.oy - level * CUBE_FRONT;
    const rowY = (wyy: number) => Math.round(cam.worldToScreenY(wyy));
    // Topo/frente divididos em y + TILE: a borda de baixo do nível de cima é a de cima da frente deste nível.
    drawCubeParts(this.ctx, s, left, right, rowY(wy), rowY(wy + TILE), rowY(wy + s.h));
  }

  /**
   * Paredes horizontais no motor 2D já existente: o topo perde só a metade
   * TRASEIRA, enquanto a face frontal ocupa o mesmo plano dos pilares.
   */
  private drawAdaptiveWall(cam: Camera, sprite: Sprite, x: number, y: number, level: number): void {
    const left = Math.round(cam.worldToScreenX(x * TILE));
    const right = Math.round(cam.worldToScreenX((x + 1) * TILE));
    const wy = y * TILE + sprite.oy - level * CUBE_FRONT;
    const rowY = (value: number) => Math.round(cam.worldToScreenY(value));
    drawThinHorizontalWall(this.ctx, sprite, left, right,
      rowY(wy), rowY(wy + TILE), rowY(wy + sprite.h));
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
    if (a.label) {
      // Nome de outro jogador acima da cabeça (multiplayer).
      const ctx = this.ctx;
      const ty = fy - sheet.drawHeight * cam.zoom - 4 * cam.zoom;
      ctx.font = `800 ${Math.round(11 * cam.zoom)}px Nunito, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.lineWidth = 3 * cam.zoom;
      ctx.strokeStyle = 'rgba(28, 22, 64, 0.9)';
      ctx.strokeText(a.label, fx, ty);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(a.label, fx, ty);
    }
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
    // Construção da cidade sob o cursor pelo desenho inteiro (telhado incluído); a mais ao sul (da frente) vence.
    let building: { x: number; y: number } | null = null;
    for (const b of this.world.town?.buildings ?? []) {
      const s = this.textures.variants.get(b.id)?.[0];
      if (!s) continue;
      const lx = wx - b.x * TILE;
      const ly = wy - b.y * TILE;
      if (lx >= s.ox && lx < s.ox + s.w && ly >= s.oy && ly < TILE && (!building || b.y > building.y)) building = { x: b.x, y: b.y };
    }
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
          // Objeto atrás da construção (mais ao norte) fica escondido por ela: vale a construção.
          if (building && building.y >= y) return { ...building, hasObject: true };
          return { x, y, hasObject: true };
        }
      }
    }
    if (building) return { ...building, hasObject: true };
    return { x: gx, y: gy, hasObject: false };
  }

  /** Mostra o número de um dano que entrou (chamado pelo jogo a cada acerto). */
  addDamage(x: number, y: number, hit: Hit, target: 'enemy' | 'player'): void {
    this.damageNumbers.add(x, y, hit, target);
  }

  iconFor(id: BlockId): string {
    return this.textures.icons.get(id) ?? '';
  }
}
