import heroineUrl from '../assets/heroine.png?inline';
import lambUrl from '../assets/lamb.png?inline';
import sheepLoveUrl from '../assets/sheep-love.png?inline';
import sheepUrl from '../assets/sheep.png?inline';
import { TILE } from '../config';
import type { Actor, ActorKind } from '../game/entities';
import type { Facing } from '../game/walker';

/**
 * Sprites de atores (folhas geradas por scripts/process-sprite.py).
 * Folhas 4×4: linhas frente, esquerda, direita, costas; 4 quadros por linha.
 * Folha de namoro: 4×1 (quadro = etapa da animação, corações crescendo).
 * Todos os quadros de uma folha compartilham a ancoragem (base na base do quadro).
 */
const ROW: Record<Facing, number> = { down: 0, left: 1, right: 2, up: 3 };

/** Altura desenhada da heroína em pixels de mundo (~2,2 células). */
export const CHARACTER_H = TILE * 2.2;

interface SheetSpec {
  url: string;
  cols: number;
  rows: number;
  /** Altura desenhada (px de mundo). */
  height: number;
  /** Raios da sombra no chão (em células). */
  shadow: [number, number];
  walkFps: number;
}

const SPECS: Record<ActorKind, SheetSpec> = {
  heroine: { url: heroineUrl, cols: 4, rows: 4, height: CHARACTER_H, shadow: [0.32, 0.12], walkFps: 7 },
  sheep: { url: sheepUrl, cols: 4, rows: 4, height: TILE * 1.25, shadow: [0.42, 0.14], walkFps: 6 },
  lamb: { url: lambUrl, cols: 4, rows: 4, height: TILE * 0.9, shadow: [0.3, 0.1], walkFps: 8 },
  // Dois animais lado a lado: ~2 células de largura, mesma escala da ovelha adulta.
  'sheep-love': { url: sheepLoveUrl, cols: 4, rows: 1, height: TILE * 1.75, shadow: [0.9, 0.16], walkFps: 0 },
};

class SpriteSheet {
  private readonly img = new Image();
  private ready = false;

  constructor(private readonly spec: SheetSpec) {
    this.img.onload = () => (this.ready = true);
    this.img.src = spec.url;
  }

  /** Desenha com a base em (fx, fy) — coordenadas de tela. */
  draw(ctx: CanvasRenderingContext2D, fx: number, fy: number, zoom: number, a: Actor): void {
    const { height, shadow, walkFps, cols, rows } = this.spec;
    // Sombra fixa no chão (não acompanha o balanço do sprite).
    ctx.fillStyle = 'rgba(30, 20, 70, 0.3)';
    ctx.beginPath();
    ctx.ellipse(fx, fy, shadow[0] * TILE * zoom, shadow[1] * TILE * zoom, 0, 0, Math.PI * 2);
    ctx.fill();
    if (!this.ready) return;
    const h = height * zoom;
    const fw = this.img.width / cols;
    const fh = this.img.height / rows;
    const w = h * (fw / fh);
    const col = rows === 1 ? (a.frame ?? 0) : a.moving ? Math.floor(a.walkTime * walkFps) % cols : 0;
    const row = rows === 1 ? 0 : ROW[a.facing];
    ctx.drawImage(this.img, col * fw, row * fh, fw, fh, Math.round(fx - w / 2), Math.round(fy - h + 2 * zoom), Math.round(w), Math.round(h));
  }

  get drawHeight(): number {
    return this.spec.height;
  }
}

export class ActorSprites {
  private readonly sheets = Object.fromEntries(
    (Object.keys(SPECS) as ActorKind[]).map((k) => [k, new SpriteSheet(SPECS[k])]),
  ) as Record<ActorKind, SpriteSheet>;

  get(kind: ActorKind): SpriteSheet {
    return this.sheets[kind];
  }
}

/** Coração cel-shaded (contorno vinho, brilho) — mesmo estilo da folha de namoro. */
export function drawHeart(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, alpha = 1): void {
  const s = size / 2;
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(cx, cy + s * 0.9);
    ctx.bezierCurveTo(cx - s * 1.6, cy - s * 0.1, cx - s * 0.9, cy - s * 1.3, cx, cy - s * 0.45);
    ctx.bezierCurveTo(cx + s * 0.9, cy - s * 1.3, cx + s * 1.6, cy - s * 0.1, cx, cy + s * 0.9);
    ctx.closePath();
  };
  ctx.save();
  ctx.globalAlpha = alpha;
  path();
  ctx.fillStyle = '#ff6f8e';
  ctx.fill();
  ctx.lineWidth = Math.max(1, size * 0.08);
  ctx.strokeStyle = '#a8324f';
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.beginPath();
  ctx.ellipse(cx - s * 0.45, cy - s * 0.35, s * 0.22, s * 0.14, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
