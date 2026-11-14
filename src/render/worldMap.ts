import { CHUNK_SIZE } from '../config';
import type { Exploration } from '../game/exploration';
import type { Facing } from '../game/walker';
import type { World } from '../world/world';
import { MapChunkCache } from './mapChunks';
import { drawMarkerShape, type MinimapMarker } from './mapMarkers';

/**
 * Mapa grande (tela cheia): tudo o que o jogador já descobriu, com arrastar para mover, roda/botões/pinça para aproximar e
 * marcadores (cidade, covil, tenda, amigos e o próprio jogador). Só lê (`World` + `Exploration`), como o minimapa, e usa o mesmo
 * cache de imagens de chunk. Aberto = o jogo fica pausado (o `Game` decide); desenha em quadros enquanto está aberto.
 */

export type { MinimapMarker } from './mapMarkers';

/** Pixels de tela por célula: do mais afastado ao mais aproximado. */
export const MAP_MIN_SCALE = 0.5;
export const MAP_MAX_SCALE = 12;
/** Chunks refeitos por quadro (o mapa grande pode ter centenas; o resto aparece nos quadros seguintes). */
const BUILD_BUDGET = 24;

/** Retângulo (em células) que contém os chunks descobertos, ou null se não há nenhum. Puro (testável). */
export function exploredBounds(chunks: ReadonlyArray<{ cx: number; cy: number }>): { x0: number; y0: number; x1: number; y1: number } | null {
  if (!chunks.length) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const c of chunks) {
    x0 = Math.min(x0, c.cx * CHUNK_SIZE);
    y0 = Math.min(y0, c.cy * CHUNK_SIZE);
    x1 = Math.max(x1, (c.cx + 1) * CHUNK_SIZE);
    y1 = Math.max(y1, (c.cy + 1) * CHUNK_SIZE);
  }
  return { x0, y0, x1, y1 };
}

/** Escala que enquadra `b` numa tela `w × h` (com margem), limitada a [MAP_MIN_SCALE, MAP_MAX_SCALE]. Puro. */
export function fitScale(b: { x0: number; y0: number; x1: number; y1: number }, w: number, h: number): number {
  const s = Math.min(w / (b.x1 - b.x0 + 2 * CHUNK_SIZE), h / (b.y1 - b.y0 + 2 * CHUNK_SIZE));
  return Math.max(MAP_MIN_SCALE, Math.min(MAP_MAX_SCALE, s));
}

export interface WorldMapView {
  world: World;
  exploration: Exploration;
  player: { x: number; y: number; facing: Facing };
  markers: MinimapMarker[];
  /** Só os chunks dentro deste retângulo (células) entram: no mundo, tudo menos o covil; no covil, só o covil. null = todos. */
  filter: ((cx: number, cy: number) => boolean) | null;
}

const ANGLE: Record<Facing, number> = { up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 };

export class WorldMap {
  readonly root: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly chunks = new MapChunkCache(2000);
  private view: (() => WorldMapView) | null = null;
  private raf = 0;
  /** Centro da vista (células) e escala (px por célula). */
  private cx = 0;
  private cy = 0;
  private scale = 3;
  private readonly pointers = new Map<number, { x: number; y: number }>();
  private pinch = 0;
  private openFlag = false;

  constructor(parent: HTMLElement, private readonly onClose: () => void) {
    this.root = document.createElement('div');
    this.root.className = 'worldmap';
    this.root.hidden = true;
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-label', 'Mapa do mundo');
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'worldmap-canvas';
    const bar = document.createElement('div');
    bar.className = 'worldmap-bar';
    const mk = (label: string, title: string, fn: () => void): HTMLButtonElement => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.title = title;
      b.setAttribute('aria-label', title);
      b.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
      return b;
    };
    bar.append(
      mk('＋', 'Aproximar', () => this.zoomBy(1.5)),
      mk('－', 'Afastar', () => this.zoomBy(1 / 1.5)),
      mk('◎', 'Centralizar em mim', () => this.centerOnPlayer()),
      mk('▣', 'Ver tudo o que já explorei', () => this.fitAll()),
    );
    const close = mk('✕', 'Fechar o mapa', () => this.close());
    close.className = 'worldmap-close';
    const title = document.createElement('div');
    title.className = 'worldmap-title';
    title.textContent = 'Mapa';
    this.root.append(this.canvas, title, bar, close);
    parent.appendChild(this.root);
    this.ctx = this.canvas.getContext('2d')!;
    this.bindPointer();
  }

  get isOpen(): boolean {
    return this.openFlag;
  }

  /** Abre; `view` é chamado a cada quadro (posição e marcadores atuais). */
  open(view: () => WorldMapView): void {
    this.view = view;
    this.openFlag = true;
    this.root.hidden = false;
    this.centerOnPlayer();
    this.fitIfSmall();
    const loop = (): void => {
      if (!this.openFlag) return;
      this.draw();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  close(): void {
    if (!this.openFlag) return;
    this.openFlag = false;
    this.root.hidden = true;
    cancelAnimationFrame(this.raf);
    this.pointers.clear();
    this.onClose();
  }

  destroy(): void {
    this.openFlag = false;
    cancelAnimationFrame(this.raf);
    this.root.remove();
    this.chunks.clear();
  }

  private centerOnPlayer(): void {
    const v = this.view?.();
    if (v) { this.cx = v.player.x; this.cy = v.player.y; }
  }

  /** Abre aproximado no jogador; se o que já foi explorado cabe na tela, enquadra tudo. */
  private fitIfSmall(): void {
    const v = this.view?.();
    if (!v) return;
    const b = this.bounds(v);
    if (!b) { this.scale = 4; return; }
    const w = this.canvas.clientWidth || 800;
    const h = this.canvas.clientHeight || 500;
    this.scale = Math.min(6, Math.max(2, fitScale(b, w, h)));
  }

  private fitAll(): void {
    const v = this.view?.();
    if (!v) return;
    const b = this.bounds(v);
    if (!b) return;
    this.cx = (b.x0 + b.x1) / 2;
    this.cy = (b.y0 + b.y1) / 2;
    this.scale = fitScale(b, this.canvas.clientWidth || 800, this.canvas.clientHeight || 500);
  }

  private bounds(v: WorldMapView): { x0: number; y0: number; x1: number; y1: number } | null {
    return exploredBounds(v.exploration.chunkCoords().filter((c) => !v.filter || v.filter(c.cx, c.cy)));
  }

  private zoomBy(f: number, ax?: number, ay?: number): void {
    const next = Math.max(MAP_MIN_SCALE, Math.min(MAP_MAX_SCALE, this.scale * f));
    // Mantém sob o dedo/cursor a mesma célula (zoom "para onde se aponta").
    if (ax !== undefined && ay !== undefined) {
      const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
      const wx = this.cx + (ax - w / 2) / this.scale;
      const wy = this.cy + (ay - h / 2) / this.scale;
      this.cx = wx - (ax - w / 2) / next;
      this.cy = wy - (ay - h / 2) / next;
    }
    this.scale = next;
  }

  private bindPointer(): void {
    const c = this.canvas;
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      const r = c.getBoundingClientRect();
      this.zoomBy(e.deltaY < 0 ? 1.2 : 1 / 1.2, e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });
    c.addEventListener('pointerdown', (e) => {
      c.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this.pinch = this.pointers.size === 2 ? this.pinchDistance() : 0;
    });
    c.addEventListener('pointermove', (e) => {
      const p = this.pointers.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      if (this.pointers.size === 1) {
        this.cx -= dx / this.scale;
        this.cy -= dy / this.scale;
      } else if (this.pointers.size === 2) {
        const d = this.pinchDistance();
        if (this.pinch > 0 && d > 0) {
          const [a, b] = [...this.pointers.values()];
          const r = c.getBoundingClientRect();
          this.zoomBy(d / this.pinch, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
        }
        this.pinch = d;
      }
    });
    // `lostpointercapture` também termina o toque (armadilha já vivida: senão o gesto fica "preso").
    const end = (e: PointerEvent): void => {
      this.pointers.delete(e.pointerId);
      this.pinch = this.pointers.size === 2 ? this.pinchDistance() : 0;
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    c.addEventListener('lostpointercapture', end);
  }

  private pinchDistance(): number {
    const [a, b] = [...this.pointers.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  }

  private draw(): void {
    const v = this.view?.();
    if (!v) return;
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (!w || !h) return;
    if (this.canvas.width !== Math.round(w * dpr) || this.canvas.height !== Math.round(h * dpr)) {
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
    }
    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#1d1838';
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;
    this.chunks.beginFrame();
    const s = this.scale;
    const toX = (x: number): number => w / 2 + (x - this.cx) * s;
    const toY = (y: number): number => h / 2 + (y - this.cy) * s;
    // Só os chunks descobertos que aparecem na tela.
    const cs = CHUNK_SIZE * s;
    let budget = BUILD_BUDGET;
    for (const { cx, cy } of v.exploration.chunkCoords()) {
      if (v.filter && !v.filter(cx, cy)) continue;
      const sx = toX(cx * CHUNK_SIZE), sy = toY(cy * CHUNK_SIZE);
      if (sx > w || sy > h || sx + cs < 0 || sy + cs < 0) continue;
      const fog = v.exploration.chunk(cx, cy);
      if (!fog) continue;
      const got = this.chunks.get(v.world, cx, cy, fog, budget > 0);
      if (!got) continue;
      if (got.built) budget--;
      ctx.drawImage(got.image.canvas, Math.floor(sx), Math.floor(sy), Math.ceil(cs) + 1, Math.ceil(cs) + 1);
    }
    const r = Math.max(5, Math.min(11, s * 2.2));
    for (const m of v.markers) {
      drawMarkerShape(ctx, m.kind, toX(m.x), toY(m.y), r, 1.6);
    }
    this.drawPlayer(toX(v.player.x), toY(v.player.y), v.player.facing);
    this.chunks.evict();
  }

  private drawPlayer(x: number, y: number, facing: Facing): void {
    const ctx = this.ctx;
    const r = 9;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ANGLE[facing]);
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.3);
    ctx.lineTo(r, r);
    ctx.lineTo(0, r * 0.45);
    ctx.lineTo(-r, r);
    ctx.closePath();
    ctx.fillStyle = '#fff7ea';
    ctx.strokeStyle = '#2a1a48';
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}
