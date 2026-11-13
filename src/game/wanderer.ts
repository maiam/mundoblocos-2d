import { SUBDIV } from '../config';
import type { World } from '../world/world';
import { type Blocker, type Facing, Walker, type WalkerSpec } from './walker';

type State = { kind: 'idle'; timer: number } | { kind: 'walk'; timer: number; dx: number; dy: number; stuck: number };

/** Ritmo do passeio: duração das paradas e das caminhadas (s) e distância de casa antes de voltar (células). */
export interface WanderPace {
  idle: [number, number];
  walk: [number, number];
  leash: number;
}

export const DEFAULT_PACE: WanderPace = { idle: [1.5, 5], walk: [1, 3.5], leash: 7 * SUBDIV };

/**
 * Passeio sem rumo perto de "casa" (ovelhas, cavalo, moradores): alterna parar e andar numa direção sorteada,
 * desacelera no fim e volta para casa quando se afasta demais. Se travar, para. Colisão sempre via `Walker`.
 */
export class Wanderer extends Walker {
  private state: State;

  constructor(
    x: number,
    y: number,
    spec: WalkerSpec,
    public homeX: number,
    public homeY: number,
    protected readonly rand: () => number,
    protected readonly pace: WanderPace = DEFAULT_PACE,
  ) {
    super(x, y, spec);
    this.state = { kind: 'idle', timer: 0.5 + rand() * 3 };
    this.facing = (['down', 'left', 'right', 'up'] as Facing[])[Math.floor(rand() * 4)];
  }

  protected wander(dt: number, world: World, blocked?: Blocker): void {
    const s = this.state;
    s.timer -= dt;
    if (s.kind === 'idle') {
      this.move(dt, 0, 0, world, blocked);
      if (s.timer <= 0) this.startWalk();
      return;
    }
    // Desacelera no fim do passeio para não parar de golpe.
    const ease = Math.min(1, 0.25 + s.timer * 2);
    const moved = this.move(dt, s.dx * ease, s.dy * ease, world, blocked);
    s.stuck = moved < 0.002 ? s.stuck + dt : 0;
    if (s.timer <= 0 || s.stuck > 0.3) {
      const [a, b] = this.pace.idle;
      this.state = { kind: 'idle', timer: a + this.rand() * (b - a) };
    }
  }

  private startWalk(): void {
    let angle = this.rand() * Math.PI * 2;
    const hx = this.homeX - this.x;
    const hy = this.homeY - this.y;
    if (Math.hypot(hx, hy) > this.pace.leash) angle = Math.atan2(hy, hx) + (this.rand() - 0.5) * 0.8;
    const pace = 0.6 + this.rand() * 0.4;
    const [a, b] = this.pace.walk;
    this.state = {
      kind: 'walk',
      timer: a + this.rand() * (b - a),
      dx: Math.cos(angle) * pace,
      dy: Math.sin(angle) * pace,
      stuck: 0,
    };
  }
}
