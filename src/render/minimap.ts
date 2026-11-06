import { CHUNK_SIZE } from '../config';
import type { Exploration } from '../game/exploration';
import type { Facing } from '../game/walker';
import type { World } from '../world/world';
import { mapColor } from './mapColors';

/**
 * Minimapa redondo do canto superior direito: o mundo em volta do jogador (norte sempre para cima), coberto pela
 * névoa onde ele ainda não andou. Só lê: o mapa vem do `World` (`mapColors`) e o que já foi visto da `Exploration`.
 * Cada chunk vira uma imagem de 16 × 16 px, refeita só quando o mapa ou a névoa dele mudam. Nunca lê pixels de volta.
 */

/** Raio mostrado (células). */
export const MINIMAP_RADIUS = 36;
/** Imagens de chunk refeitas por atualização (o resto fica para a próxima, sem travar o quadro). */
const BUILD_BUDGET = 6;
const MAX_CACHE = 600;
/** Intervalo entre redesenhos (ms): o mapa anda devagar, não precisa de 60 quadros. */
const REDRAW_MS = 100;

export type MinimapMarkerKind = 'town' | 'dungeon' | 'tent' | 'friend';

export interface MinimapMarker {
  kind: MinimapMarkerKind;
  x: number;
  y: number;
  /** Marcador que fica na borda quando está longe (cidade, tenda). */
  pinned?: boolean;
}

export interface MinimapView {
  world: World;
  exploration: Exploration;
  player: { x: number; y: number; facing: Facing };
  markers: MinimapMarker[];
  /** Dentro de um cômodo: mostra só o nome (o cômodo é um espaço à parte). */
  place: string | null;
}

interface ChunkImage {
  canvas: HTMLCanvasElement;
  terrain: number;
  fog: number;
  used: number;
}

const ANGLE: Record<Facing, number> = { up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 };
const MARKER_COLOR: Record<MinimapMarkerKind, string> = {
  town: '#ffd46b', dungeon: '#e8574a', tent: '#f3e3c0', friend: '#7fd4ff',
};

export class Minimap {
  readonly root: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly label: HTMLElement;
  private readonly cache = new Map<string, ChunkImage>();
  private tick = 0;
  private last = -Infinity;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'minimap';
    this.root.setAttribute('aria-label', 'Mapa');
    this.canvas = document.createElement('canvas');
    this.label = document.createElement('span');
    this.label.className = 'minimap-place';
    this.label.hidden = true;
    this.root.append(this.canvas, this.label);
    parent.appendChild(this.root);
    this.ctx = this.canvas.getContext('2d')!;
  }

  destroy(): void {
    this.root.remove();
    this.cache.clear();
  }

  /** Redesenha (no máximo a cada `REDRAW_MS`, a não ser com `force`). */
  update(v: MinimapView, now: number, force = false): void {
    if (!force && now - this.last < REDRAW_MS) return;
    this.last = now;
    this.tick++;
    this.label.hidden = !v.place;
    this.label.textContent = v.place ?? '';
    if (v.place) {
      this.clear();
      return;
    }
    this.draw(v);
  }

  private resize(): number {
    const dpr = window.devicePixelRatio || 1;
    const size = Math.round(this.canvas.clientWidth * dpr);
    if (size && this.canvas.width !== size) {
      this.canvas.width = size;
      this.canvas.height = size;
    }
    return size;
  }

  private clear(): void {
    const size = this.resize();
    const ctx = this.ctx;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#1d1838';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  private draw(v: MinimapView): void {
    const size = this.resize();
    if (!size) return;
    const ctx = this.ctx;
    const half = size / 2;
    const cell = size / (MINIMAP_RADIUS * 2); // px por célula
    const { x: px, y: py } = v.player;
    this.clear();
    ctx.save();
    ctx.beginPath();
    ctx.arc(half, half, half - 1, 0, Math.PI * 2);
    ctx.clip();
    // Chunks visíveis no círculo; quem ainda não foi descoberto fica no fundo escuro (névoa).
    ctx.imageSmoothingEnabled = false;
    const cx0 = Math.floor((px - MINIMAP_RADIUS) / CHUNK_SIZE);
    const cx1 = Math.floor((px + MINIMAP_RADIUS) / CHUNK_SIZE);
    const cy0 = Math.floor((py - MINIMAP_RADIUS) / CHUNK_SIZE);
    const cy1 = Math.floor((py + MINIMAP_RADIUS) / CHUNK_SIZE);
    let budget = BUILD_BUDGET;
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const fog = v.exploration.chunk(cx, cy);
        if (!fog) continue;
        const img = this.chunkImage(v, cx, cy, fog, budget > 0);
        if (!img) continue;
        if (img.built) budget--;
        const sx = half + (cx * CHUNK_SIZE - px) * cell;
        const sy = half + (cy * CHUNK_SIZE - py) * cell;
        const s = CHUNK_SIZE * cell;
        ctx.drawImage(img.canvas, Math.floor(sx), Math.floor(sy), Math.ceil(s) + 1, Math.ceil(s) + 1);
      }
    }
    // Vinheta suave na borda (cara de mapa).
    const g = ctx.createRadialGradient(half, half, half * 0.62, half, half, half);
    g.addColorStop(0, 'rgba(20, 14, 40, 0)');
    g.addColorStop(1, 'rgba(20, 14, 40, 0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    for (const m of v.markers) this.drawMarker(m, px, py, half, cell, size);
    ctx.restore();
    this.drawPlayer(half, size, v.player.facing);
    this.evict();
  }

  private chunkImage(
    v: MinimapView, cx: number, cy: number, fog: { bits: Uint8Array; version: number }, canBuild: boolean,
  ): (ChunkImage & { built: boolean }) | null {
    const key = `${cx},${cy}`;
    const terrain = v.world.getChunk(cx, cy)?.version ?? 0;
    const cached = this.cache.get(key);
    if (cached && cached.terrain === terrain && cached.fog === fog.version) {
      cached.used = this.tick;
      return { ...cached, built: false };
    }
    // Sem orçamento neste quadro: mostra a imagem antiga, se houver (atualiza na próxima).
    if (!canBuild) return cached ? { ...cached, built: false } : null;
    const canvas = cached?.canvas ?? document.createElement('canvas');
    canvas.width = CHUNK_SIZE;
    canvas.height = CHUNK_SIZE;
    const c = canvas.getContext('2d')!;
    c.clearRect(0, 0, CHUNK_SIZE, CHUNK_SIZE);
    const x0 = cx * CHUNK_SIZE;
    const y0 = cy * CHUNK_SIZE;
    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const i = ly * CHUNK_SIZE + lx;
        if (!(fog.bits[i >> 3] & (1 << (i & 7)))) continue;
        c.fillStyle = mapColor(v.world, x0 + lx, y0 + ly);
        c.fillRect(lx, ly, 1, 1);
      }
    }
    const entry: ChunkImage = { canvas, terrain, fog: fog.version, used: this.tick };
    this.cache.set(key, entry);
    return { ...entry, built: true };
  }

  private drawMarker(m: MinimapMarker, px: number, py: number, half: number, cell: number, size: number): void {
    let dx = (m.x - px) * cell;
    let dy = (m.y - py) * cell;
    const edge = half - size * 0.09;
    const dist = Math.hypot(dx, dy);
    if (dist > edge) {
      if (!m.pinned) return;
      dx = (dx / dist) * edge;
      dy = (dy / dist) * edge;
    }
    const ctx = this.ctx;
    const x = half + dx;
    const y = half + dy;
    const r = Math.max(2.5, size * 0.035);
    ctx.lineWidth = Math.max(1, size * 0.012);
    ctx.strokeStyle = '#2a1a48';
    ctx.fillStyle = MARKER_COLOR[m.kind];
    ctx.beginPath();
    if (m.kind === 'town') {
      // Estrela de 4 pontas: a cidade.
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4 - Math.PI / 2;
        const rr = k % 2 === 0 ? r * 1.6 : r * 0.6;
        ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      ctx.closePath();
    } else if (m.kind === 'tent') {
      ctx.moveTo(x, y - r * 1.3);
      ctx.lineTo(x + r * 1.2, y + r);
      ctx.lineTo(x - r * 1.2, y + r);
      ctx.closePath();
    } else if (m.kind === 'dungeon') {
      ctx.rect(x - r, y - r, r * 2, r * 2);
    } else {
      ctx.arc(x, y, r, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.stroke();
  }

  /** Seta no centro, apontando para onde o jogador olha; anel da moldura e o "N". */
  private drawPlayer(half: number, size: number, facing: Facing): void {
    const ctx = this.ctx;
    const r = size * 0.07;
    ctx.save();
    ctx.translate(half, half);
    ctx.rotate(ANGLE[facing]);
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.3);
    ctx.lineTo(r, r);
    ctx.lineTo(0, r * 0.45);
    ctx.lineTo(-r, r);
    ctx.closePath();
    ctx.fillStyle = '#fff7ea';
    ctx.strokeStyle = '#2a1a48';
    ctx.lineWidth = Math.max(1.2, size * 0.015);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ctx.lineWidth = Math.max(2, size * 0.03);
    ctx.strokeStyle = 'rgba(255, 220, 160, 0.75)';
    ctx.beginPath();
    ctx.arc(half, half, half - ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffd46b';
    ctx.font = `800 ${Math.round(size * 0.11)}px Nunito, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('N', half, size * 0.035);
  }

  private evict(): void {
    if (this.cache.size <= MAX_CACHE) return;
    const old = [...this.cache.entries()].sort((a, b) => a[1].used - b[1].used);
    for (const [k] of old.slice(0, this.cache.size - MAX_CACHE)) this.cache.delete(k);
  }
}
