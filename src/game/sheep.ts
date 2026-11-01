import type { World } from '../world/world';
import { type Blocker, Walker } from './walker';

/** Distância máxima (células) que a ovelha se afasta de casa antes de voltar. */
const LEASH = 7;

type State = { kind: 'idle'; timer: number } | { kind: 'walk'; timer: number; dx: number; dy: number; stuck: number };

/**
 * Ovelha — primeiro NPC. Pasta perto de "casa": alterna entre ficar parada e
 * dar passeios curtos em direções aleatórias; volta quando se afasta demais.
 * Não sobe em cubos (stepHeight 0), então blocos funcionam como cerca.
 * Ainda não reage ao personagem.
 */
export class Sheep extends Walker {
  private state: State;

  constructor(x: number, y: number, readonly homeX = x, readonly homeY = y, private readonly rand: () => number = Math.random) {
    super(x, y, { speed: 1.3, halfW: 0.3, halfD: 0.17, stepHeight: 0 });
    this.state = { kind: 'idle', timer: 0.5 + rand() * 3 };
    this.facing = (['down', 'left', 'right', 'up'] as const)[Math.floor(rand() * 4)];
  }

  update(dt: number, world: World, blocked?: Blocker): void {
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
      this.state = { kind: 'idle', timer: 1.5 + this.rand() * 3.5 };
    }
  }

  private startWalk(): void {
    let angle = this.rand() * Math.PI * 2;
    const hx = this.homeX - this.x;
    const hy = this.homeY - this.y;
    if (Math.hypot(hx, hy) > LEASH) angle = Math.atan2(hy, hx) + (this.rand() - 0.5) * 0.8;
    const pace = 0.6 + this.rand() * 0.4;
    this.state = {
      kind: 'walk',
      timer: 1 + this.rand() * 2.5,
      dx: Math.cos(angle) * pace,
      dy: Math.sin(angle) * pace,
      stuck: 0,
    };
  }
}
