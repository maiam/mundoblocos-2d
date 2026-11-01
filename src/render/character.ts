import heroineUrl from '../assets/heroine.png?inline';
import sheepUrl from '../assets/sheep.png?inline';
import { TILE } from '../config';
import type { ActorKind } from '../game/entities';
import type { Facing } from '../game/walker';

/**
 * Sprites de atores (folhas 4×4 geradas por scripts/process-sprite.py).
 * Linhas: 0 = frente, 1 = esquerda, 2 = direita, 3 = costas. 4 quadros por linha.
 * Todos os quadros de uma folha compartilham a ancoragem (pés na base do quadro).
 */
const ROW: Record<Facing, number> = { down: 0, left: 1, right: 2, up: 3 };
const COLS = 4;
const ROWS = 4;

/** Altura desenhada da heroína em pixels de mundo (~2,2 células). */
export const CHARACTER_H = TILE * 2.2;

interface SheetSpec {
  url: string;
  /** Altura desenhada (px de mundo). */
  height: number;
  /** Raios da sombra no chão (em células). */
  shadow: [number, number];
  walkFps: number;
}

const SPECS: Record<ActorKind, SheetSpec> = {
  heroine: { url: heroineUrl, height: CHARACTER_H, shadow: [0.32, 0.12], walkFps: 7 },
  sheep: { url: sheepUrl, height: TILE * 1.25, shadow: [0.42, 0.14], walkFps: 6 },
};

class SpriteSheet {
  private readonly img = new Image();
  private ready = false;

  constructor(private readonly spec: SheetSpec) {
    this.img.onload = () => (this.ready = true);
    this.img.src = spec.url;
  }

  /** Desenha com os pés em (fx, fy) — coordenadas de tela. */
  draw(ctx: CanvasRenderingContext2D, fx: number, fy: number, zoom: number, facing: Facing, moving: boolean, walkTime: number): void {
    const { height, shadow, walkFps } = this.spec;
    // Sombra fixa no chão (não acompanha o balanço do sprite).
    ctx.fillStyle = 'rgba(30, 20, 70, 0.3)';
    ctx.beginPath();
    ctx.ellipse(fx, fy, shadow[0] * TILE * zoom, shadow[1] * TILE * zoom, 0, 0, Math.PI * 2);
    ctx.fill();
    if (!this.ready) return;
    const h = height * zoom;
    const fw = this.img.width / COLS;
    const fh = this.img.height / ROWS;
    const w = h * (fw / fh);
    const col = moving ? Math.floor(walkTime * walkFps) % COLS : 0;
    ctx.drawImage(this.img, col * fw, ROW[facing] * fh, fw, fh, Math.round(fx - w / 2), Math.round(fy - h + 2 * zoom), Math.round(w), Math.round(h));
  }
}

export class ActorSprites {
  private readonly sheets: Record<ActorKind, SpriteSheet> = {
    heroine: new SpriteSheet(SPECS.heroine),
    sheep: new SpriteSheet(SPECS.sheep),
  };

  get(kind: ActorKind): SpriteSheet {
    return this.sheets[kind];
  }
}
