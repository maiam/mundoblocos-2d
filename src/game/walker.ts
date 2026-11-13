import { SUBDIV } from '../config';
import type { World } from '../world/world';

export type Facing = 'down' | 'left' | 'right' | 'up';

export interface WalkerSpec {
  /** Velocidade máxima em células por segundo. */
  speed: number;
  /** Caixa de colisão dos pés (meia-largura / meia-profundidade, em células). */
  halfW: number;
  halfD: number;
  /** Teto da meia-largura na grade fina (ADR 0032): o personagem precisa passar por um vão de 1 célula (porta, portão). */
  maxHalfW?: number;
  /** Quantos níveis consegue subir de uma vez (0 = não sobe em cubos). */
  stepHeight: number;
}

/** Especificação em células da grade atual: velocidade e caixa dos pés × `SUBDIV` (ADR 0032; no padrão, a mesma). */
export function scaleSpec(spec: WalkerSpec): WalkerSpec {
  return scaleSpecBy(spec, SUBDIV);
}

/** `scaleSpec` para uma subdivisão qualquer (pura, testável). `s = 1` devolve a mesma especificação. */
export function scaleSpecBy(spec: WalkerSpec, s: number): WalkerSpec {
  if (s === 1) return spec;
  return { ...spec, speed: spec.speed * s, halfW: Math.min(spec.halfW * s, spec.maxHalfW ?? Infinity), halfD: spec.halfD * s };
}

/** Retorna true se a caixa candidata colide com outra entidade. */
export type Blocker = (self: Walker, x: number, y: number) => boolean;

/** Velocidade da transição visual de altura (exponencial, por segundo). */
const Z_SMOOTH = 14;

/**
 * Base de toda entidade que anda (personagem, animais). Posição em células no
 * centro dos pés; `z` = nível de apoio. A colisão com o mapa consulta
 * `World.standHeight` (fonte de verdade); a regra de degrau vem de `stepHeight`.
 */
export class Walker {
  facing: Facing = 'down';
  moving = false;
  /** Tempo acumulado de caminhada (dirige o quadro da animação). */
  walkTime = 0;
  /** Nível lógico (inteiro) e exibido (suavizado). */
  z = 0;
  visualZ = 0;

  /** Especificação física (mutável: o filhote cresce), já em células da grade atual. */
  readonly spec: WalkerSpec;

  constructor(public x: number, public y: number, spec: WalkerSpec) {
    this.spec = scaleSpec(spec);
  }

  /**
   * Anda na direção (ix, iy) em coordenadas de tela, magnitude 0..1.
   * Retorna a distância efetivamente percorrida.
   */
  move(dt: number, ix: number, iy: number, world: World, blocked?: Blocker): number {
    this.visualZ += (this.z - this.visualZ) * (1 - Math.exp(-Z_SMOOTH * dt));
    let len = Math.hypot(ix, iy);
    if (len > 1) { ix /= len; iy /= len; len = 1; }
    this.moving = len > 0.08;
    if (!this.moving) {
      this.walkTime = 0;
      return 0;
    }
    // Direção do sprite pelo eixo dominante (histerese evita tremulação na diagonal).
    const horizontal = this.facing === 'left' || this.facing === 'right';
    const bias = horizontal ? 0.8 : 1.25;
    if (Math.abs(ix) > Math.abs(iy) * bias) this.facing = ix < 0 ? 'left' : 'right';
    else this.facing = iy < 0 ? 'up' : 'down';

    const x0 = this.x;
    const y0 = this.y;
    const step = this.spec.speed * dt;
    this.tryMove(this.x + ix * step, this.y, world, blocked);
    this.tryMove(this.x, this.y + iy * step, world, blocked);
    const moved = Math.hypot(this.x - x0, this.y - y0);
    this.walkTime += dt * (0.55 + 0.45 * len);
    return moved;
  }

  /** Move se todas as células sob os pés forem alcançáveis; ajusta `z` à mais alta. */
  private tryMove(x: number, y: number, world: World, blocked?: Blocker): void {
    const h = this.supportHeight(x, y, world);
    if (h === null || blocked?.(this, x, y)) return;
    this.x = x;
    this.y = y;
    this.z = h;
  }

  /** Altura de apoio na posição, ou null se bloqueado (degrau alto, água, buraco, árvore). */
  private supportHeight(x: number, y: number, world: World): number | null {
    const { halfW, halfD, stepHeight } = this.spec;
    const x0 = Math.floor(x - halfW);
    const x1 = Math.floor(x + halfW);
    const y0 = Math.floor(y - halfD);
    const y1 = Math.floor(y + halfD);
    let top = 0;
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const h = world.standHeight(cx, cy);
        if (h === null || h > this.z + stepHeight) return null;
        if (h > top) top = h;
      }
    }
    return top;
  }

  /** A posição atual está bloqueada pelo mapa (ex.: um objeto foi parar sob os pés)? */
  isStuck(world: World): boolean {
    return this.supportHeight(this.x, this.y, world) === null;
  }

  /** Recalcula o apoio no lugar (ex.: o bloco sob os pés foi quebrado). */
  settle(world: World): void {
    const h = this.supportHeight(this.x, this.y, world);
    if (h !== null) this.z = h;
  }

  /** A caixa dos pés ocupa a célula? */
  occupies(cx: number, cy: number): boolean {
    const { halfW, halfD } = this.spec;
    return this.x + halfW > cx && this.x - halfW < cx + 1 && this.y + halfD > cy && this.y - halfD < cy + 1;
  }

  /** A caixa dos pés, posicionada em (x, y), sobrepõe a de `other`? */
  overlapsAt(x: number, y: number, other: Walker): boolean {
    const a = this.spec;
    const b = other.spec;
    return Math.abs(x - other.x) < a.halfW + b.halfW && Math.abs(y - other.y) < a.halfD + b.halfD;
  }

  get cellX(): number {
    return Math.floor(this.x);
  }

  get cellY(): number {
    return Math.floor(this.y);
  }
}
