import type { World } from '../world/world';

export type Facing = 'down' | 'left' | 'right' | 'up';

/** Velocidade de caminhada em células por segundo. */
const SPEED = 4.2;
/** Caixa de colisão dos pés (meia-largura / meia-profundidade, em células). */
const HALF_W = 0.27;
const HALF_D = 0.15;

/**
 * Personagem jogável. Posição em células, no centro dos pés. A colisão consulta
 * `World.isWalkable` (fonte de verdade); aqui só há movimento e animação.
 */
export class Player {
  facing: Facing = 'down';
  moving = false;
  /** Tempo acumulado de caminhada (dirige o quadro da animação). */
  walkTime = 0;

  constructor(public x: number, public y: number) {}

  /** `ix, iy` em coordenadas de tela (direita = +x, baixo = +y), magnitude 0..1. */
  update(dt: number, ix: number, iy: number, world: World): void {
    let len = Math.hypot(ix, iy);
    if (len > 1) { ix /= len; iy /= len; len = 1; }
    this.moving = len > 0.08;
    if (!this.moving) {
      this.walkTime = 0;
      return;
    }
    // Direção do sprite pelo eixo dominante (leve histerese evita tremulação na diagonal).
    const horizontal = this.facing === 'left' || this.facing === 'right';
    const bias = horizontal ? 0.8 : 1.25;
    if (Math.abs(ix) > Math.abs(iy) * bias) this.facing = ix < 0 ? 'left' : 'right';
    else this.facing = iy < 0 ? 'up' : 'down';

    const step = SPEED * dt;
    const nx = this.x + ix * step;
    if (!this.collides(nx, this.y, world)) this.x = nx;
    const ny = this.y + iy * step;
    if (!this.collides(this.x, ny, world)) this.y = ny;
    this.walkTime += dt * (0.55 + 0.45 * len);
  }

  private collides(x: number, y: number, world: World): boolean {
    const x0 = Math.floor(x - HALF_W);
    const x1 = Math.floor(x + HALF_W);
    const y0 = Math.floor(y - HALF_D);
    const y1 = Math.floor(y + HALF_D);
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) if (!world.isWalkable(cx, cy)) return true;
    }
    return false;
  }

  /** A caixa dos pés ocupa a célula? (impede colocar bloco sobre o personagem). */
  occupies(cx: number, cy: number): boolean {
    return (
      this.x + HALF_W > cx && this.x - HALF_W < cx + 1 &&
      this.y + HALF_D > cy && this.y - HALF_D < cy + 1
    );
  }

  get cellX(): number {
    return Math.floor(this.x);
  }

  get cellY(): number {
    return Math.floor(this.y);
  }
}
