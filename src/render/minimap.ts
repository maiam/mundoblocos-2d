import { CHUNK_SIZE, SUBDIV } from '../config';
import type { Exploration } from '../game/exploration';
import type { Facing } from '../game/walker';
import type { World } from '../world/world';
import { MapChunkCache } from './mapChunks';
import { drawMarkerShape, type MinimapMarker } from './mapMarkers';

export type { MinimapMarker, MinimapMarkerKind } from './mapMarkers';

/**
 * Minimapa redondo do canto superior direito: o mundo em volta do jogador (norte sempre para cima), coberto pela
 * névoa onde ele ainda não andou. Só lê: o mapa vem do `World` (`mapColors`) e o que já foi visto da `Exploration`.
 * Cada chunk vira uma imagem de 16 × 16 px, refeita só quando o mapa ou a névoa dele mudam. Nunca lê pixels de volta.
 */

/** Raio mostrado (células da grade atual: 36 na grade 1, o mesmo trecho do mundo em qualquer grade). */
export const MINIMAP_RADIUS = 36 * SUBDIV;
/** Imagens de chunk refeitas por atualização (o resto fica para a próxima, sem travar o quadro). */
const BUILD_BUDGET = 6;
/** Intervalo entre redesenhos (ms): o mapa anda devagar, não precisa de 60 quadros. */
const REDRAW_MS = 100;


export interface MinimapView {
  world: World;
  exploration: Exploration;
  player: { x: number; y: number; facing: Facing };
  markers: MinimapMarker[];
  /** Dentro de um cômodo: mostra só o nome (o cômodo é um espaço à parte). */
  place: string | null;
}

const ANGLE: Record<Facing, number> = { up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 };
export class Minimap {
  readonly root: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly label: HTMLElement;
  private readonly chunks = new MapChunkCache();
  private last = -Infinity;

  /** `onTap`: toque/clique no minimapa (abre o mapa grande). */
  constructor(parent: HTMLElement, onTap?: () => void) {
    this.root = document.createElement('div');
    this.root.className = 'minimap';
    if (onTap) {
      this.root.classList.add('tappable');
      this.root.setAttribute('role', 'button');
      this.root.title = 'Abrir o mapa (M)';
      this.root.addEventListener('click', (e) => { e.stopPropagation(); onTap(); });
    }
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
    this.chunks.clear();
  }

  /** Redesenha (no máximo a cada `REDRAW_MS`, a não ser com `force`). */
  update(v: MinimapView, now: number, force = false): void {
    if (!force && now - this.last < REDRAW_MS) return;
    this.last = now;
    this.chunks.beginFrame();
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
        const got = this.chunks.get(v.world, cx, cy, fog, budget > 0);
        if (!got) continue;
        if (got.built) budget--;
        const img = got.image;
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
    this.chunks.evict();
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
    drawMarkerShape(this.ctx, m.kind, half + dx, half + dy, Math.max(2.5, size * 0.035), Math.max(1, size * 0.012));
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
}
