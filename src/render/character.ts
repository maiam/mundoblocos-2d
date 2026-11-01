import heroineUrl from '../assets/heroine.png?inline';
import { TILE } from '../config';
import type { Facing } from '../game/player';

/**
 * Sprite da heroína (folha 4×4 gerada por scripts/process-sprite.py).
 * Linhas: 0 = frente, 1 = esquerda, 2 = direita, 3 = costas. 4 quadros por linha.
 * Todos os quadros compartilham a mesma ancoragem (pés na base do quadro).
 */
const ROW: Record<Facing, number> = { down: 0, left: 1, right: 2, up: 3 };
const COLS = 4;
const ROWS = 4;
/** Altura desenhada em pixels de mundo (~2,2 células: personagem grande na tela). */
export const CHARACTER_H = TILE * 2.2;
const WALK_FPS = 7;

export class CharacterSprite {
  private readonly img = new Image();
  private ready = false;

  constructor() {
    this.img.onload = () => (this.ready = true);
    this.img.src = heroineUrl;
  }

  /** Desenha com os pés em (fx, fy) — coordenadas de tela. */
  draw(ctx: CanvasRenderingContext2D, fx: number, fy: number, zoom: number, facing: Facing, moving: boolean, walkTime: number): void {
    const h = CHARACTER_H * zoom;
    // Sombra fixa no chão (não acompanha o balanço do sprite).
    ctx.fillStyle = 'rgba(30, 20, 70, 0.3)';
    ctx.beginPath();
    ctx.ellipse(fx, fy, 0.32 * TILE * zoom, 0.12 * TILE * zoom, 0, 0, Math.PI * 2);
    ctx.fill();
    if (!this.ready) return;
    const fw = this.img.width / COLS;
    const fh = this.img.height / ROWS;
    const w = h * (fw / fh);
    const col = moving ? Math.floor(walkTime * WALK_FPS) % COLS : 0;
    const row = ROW[facing];
    ctx.drawImage(this.img, col * fw, row * fh, fw, fh, Math.round(fx - w / 2), Math.round(fy - h + 2 * zoom), Math.round(w), Math.round(h));
  }
}
