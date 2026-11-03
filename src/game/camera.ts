import { CHUNK_SIZE, TILE } from '../config';
import type { ChunkRect } from '../world/world';

/** Multiplicador de zoom ajustável pelo jogador (roda/Q/E). */
export const MIN_ZOOM_MUL = 0.6;
export const MAX_ZOOM_MUL = 1.6;
/** Rigidez do acompanhamento (maior = mais colado ao alvo). */
const FOLLOW = 9;

/**
 * Câmera 2D sem rotação: as direções da tela são as direções do mapa.
 * (x, y) é o centro da tela em pixels de mundo.
 */
export class Camera {
  x = 0;
  y = 0;
  zoom = 2;
  zoomMul = 1;
  width = 1;
  height = 1;

  resize(w: number, h: number): void {
    this.width = w;
    this.height = h;
    this.updateZoom();
  }

  /** Zoom base: ~10 células na vertical (personagem grande), limitado pela largura. */
  private updateZoom(): void {
    const base = Math.min(this.height / (10 * TILE), this.width / (7 * TILE));
    this.zoom = Math.min(3.4, Math.max(1.1, base)) * this.zoomMul;
  }

  zoomBy(factor: number): void {
    this.zoomMul = Math.min(MAX_ZOOM_MUL, Math.max(MIN_ZOOM_MUL, this.zoomMul * factor));
    this.updateZoom();
  }

  /**
   * Segue o alvo com suavização exponencial. O alvo é a posição lógica do
   * personagem (não o sprite), então o balanço da caminhada não chega à câmera.
   */
  follow(tx: number, ty: number, dt: number, snap = false): void {
    if (snap) {
      this.x = tx;
      this.y = ty;
      return;
    }
    const k = 1 - Math.exp(-FOLLOW * dt);
    this.x += (tx - this.x) * k;
    this.y += (ty - this.y) * k;
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
