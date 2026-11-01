import { STEP_HEIGHT } from '../config';
import type { World } from '../world/world';

export type Facing = 'down' | 'left' | 'right' | 'up';

/** Velocidade de caminhada em células por segundo. */
const SPEED = 4.2;
/** Caixa de colisão dos pés (meia-largura / meia-profundidade, em células). */
const HALF_W = 0.27;
const HALF_D = 0.15;

/** Velocidade da transição visual de altura (níveis por segundo, exponencial). */
const Z_SMOOTH = 14;

/**
 * Personagem jogável. Posição em células, no centro dos pés; `z` = nível em que
 * está de pé (0 = chão, 1–2 = sobre cubos). A colisão consulta
 * `World.standHeight` (fonte de verdade); aqui só há movimento e animação.
 * Regra: sobe no máximo STEP_HEIGHT nível por passo; descer é livre.
 */
export class Player {
  facing: Facing = 'down';
  moving = false;
  /** Tempo acumulado de caminhada (dirige o quadro da animação). */
  walkTime = 0;
  /** Nível lógico (inteiro) e nível exibido (suavizado, para subir/descer sem salto). */
  z = 0;
  visualZ = 0;

  constructor(public x: number, public y: number) {}

  /** `ix, iy` em coordenadas de tela (direita = +x, baixo = +y), magnitude 0..1. */
  update(dt: number, ix: number, iy: number, world: World): void {
    this.visualZ += (this.z - this.visualZ) * (1 - Math.exp(-Z_SMOOTH * dt));
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
    this.tryMove(this.x + ix * step, this.y, world);
    this.tryMove(this.x, this.y + iy * step, world);
    this.walkTime += dt * (0.55 + 0.45 * len);
  }

  /** Move se todas as células sob os pés forem alcançáveis; ajusta `z` à mais alta. */
  private tryMove(x: number, y: number, world: World): void {
    const h = this.supportHeight(x, y, world);
    if (h === null) return;
    this.x = x;
    this.y = y;
    this.z = h;
  }

  /** Altura de apoio na posição, ou null se bloqueado (degrau alto demais, água, árvore). */
  private supportHeight(x: number, y: number, world: World): number | null {
    const x0 = Math.floor(x - HALF_W);
    const x1 = Math.floor(x + HALF_W);
    const y0 = Math.floor(y - HALF_D);
    const y1 = Math.floor(y + HALF_D);
    let top = 0;
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const h = world.standHeight(cx, cy);
        if (h === null || h > this.z + STEP_HEIGHT) return null;
        if (h > top) top = h;
      }
    }
    return top;
  }

  /** Recalcula o apoio no lugar (ex.: o bloco sob os pés foi quebrado). */
  settle(world: World): void {
    const h = this.supportHeight(this.x, this.y, world);
    if (h !== null) this.z = h;
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
