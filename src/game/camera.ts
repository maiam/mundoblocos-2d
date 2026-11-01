import { CHUNK_SIZE, TILE } from '../config';
import type { ChunkRect } from '../world/world';

export const MIN_ZOOM = 0.35;
export const MAX_ZOOM = 2.5;

/** Câmera 2D: (x, y) é o centro da tela em pixels de mundo. */
export class Camera {
  x = 0;
  y = 0;
  zoom = 1;
  width = 1;
  height = 1;

  resize(w: number, h: number): void {
    this.width = w;
    this.height = h;
  }

  worldToScreenX(wx: number): number {
    return (wx - this.x) * this.zoom + this.width / 2;
  }

  worldToScreenY(wy: number): number {
    return (wy - this.y) * this.zoom + this.height / 2;
  }

  screenToWorld(sx: number, sy: number): [number, number] {
    return [(sx - this.width / 2) / this.zoom + this.x, (sy - this.height / 2) / this.zoom + this.y];
  }

  /** Bloco sob um ponto da tela. */
  screenToBlock(sx: number, sy: number): [number, number] {
    const [wx, wy] = this.screenToWorld(sx, sy);
    return [Math.floor(wx / TILE), Math.floor(wy / TILE)];
  }

  /** Zoom mantendo fixo o ponto da tela sob o cursor. */
  zoomAt(factor: number, sx: number, sy: number): void {
    const [wx, wy] = this.screenToWorld(sx, sy);
    this.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, this.zoom * factor));
    const [nx, ny] = this.screenToWorld(sx, sy);
    this.x += wx - nx;
    this.y += wy - ny;
  }

  /** Retângulo de chunks visíveis, com margem opcional. */
  visibleChunks(margin = 0): ChunkRect {
    const [wx0, wy0] = this.screenToWorld(0, 0);
    const [wx1, wy1] = this.screenToWorld(this.width, this.height);
    const size = CHUNK_SIZE * TILE;
    return {
      cx0: Math.floor(wx0 / size) - margin,
      cy0: Math.floor(wy0 / size) - margin,
      cx1: Math.floor(wx1 / size) + margin,
      cy1: Math.floor(wy1 / size) + margin,
    };
  }
}
