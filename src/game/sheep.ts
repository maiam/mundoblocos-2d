import type { World } from '../world/world';
import { type Blocker, Walker, type WalkerSpec } from './walker';

/** Distância máxima (células) que a ovelha se afasta de casa antes de voltar. */
const LEASH = 7;
/** Tempo apaixonada após comer trigo (s). */
export const LOVE_SECONDS = 25;
/** Espera após ter um filhote antes de poder namorar de novo (s). */
export const BREED_COOLDOWN = 45;
/** Tempo até o filhote virar adulto (s). */
export const GROW_UP_SECONDS = 120;
/** Duração da animação de namoro (s). */
export const COURTSHIP_SECONDS = 3.6;

const ADULT: WalkerSpec = { speed: 1.3, halfW: 0.3, halfD: 0.17, stepHeight: 0 };
const LAMB: WalkerSpec = { speed: 1.6, halfW: 0.22, halfD: 0.13, stepHeight: 0 };

type State = { kind: 'idle'; timer: number } | { kind: 'walk'; timer: number; dx: number; dy: number; stuck: number };

/**
 * Ovelha. Pasta perto de "casa": alterna entre parar e passear; volta quando se
 * afasta demais. Não sobe em cubos (blocos servem de cerca).
 * Ciclo de vida: comer trigo → apaixonada (corações) → com um par apaixonado por
 * perto, os dois se aproximam e namoram → nasce um filhote, que cresce com o tempo.
 * A coordenação do par fica em `Entities`; aqui ficam o estado e o movimento.
 */
export class Sheep extends Walker {
  private state: State;
  baby: boolean;
  age = 0;
  love = 0;
  cooldown = 0;
  partner: Sheep | null = null;
  /** Tempo restante da animação de namoro (> 0 = namorando, parada). */
  courtship = 0;
  private chaseStuck = 0;
  /** Desvio lateral temporário ao contornar obstáculo a caminho do par (−1, 0, 1). */
  private sidestep = 0;
  private sidestepTimer = 0;

  constructor(
    x: number,
    y: number,
    public homeX = x,
    public homeY = y,
    private readonly rand: () => number = Math.random,
    baby = false,
  ) {
    super(x, y, { ...(baby ? LAMB : ADULT) });
    this.baby = baby;
    this.state = { kind: 'idle', timer: 0.5 + rand() * 3 };
    this.facing = (['down', 'left', 'right', 'up'] as const)[Math.floor(rand() * 4)];
  }

  get inLove(): boolean {
    return this.love > 0;
  }

  /** Pode comer trigo agora? (adulta, sem estar apaixonada nem em espera). */
  get canEat(): boolean {
    return !this.baby && this.love <= 0 && this.cooldown <= 0 && this.courtship <= 0;
  }

  /** Come trigo: fica apaixonada. Retorna false se não puder comer. */
  feed(): boolean {
    if (!this.canEat) return false;
    this.love = LOVE_SECONDS;
    return true;
  }

  update(dt: number, world: World, blocked?: Blocker): void {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.baby) {
      this.age += dt;
      if (this.age >= GROW_UP_SECONDS) {
        this.baby = false;
        Object.assign(this.spec, ADULT);
      }
    }
    if (this.courtship > 0) {
      this.courtship = Math.max(0, this.courtship - dt);
      this.move(dt, 0, 0, world, blocked);
      return;
    }
    if (this.love > 0) {
      this.love = Math.max(0, this.love - dt);
      if (this.love === 0) this.partner = null;
    }
    if (this.partner) {
      this.approachPartner(dt, world, blocked);
      return;
    }
    this.wander(dt, world, blocked);
  }

  /**
   * Anda até o par. Se travar, desvia para um lado por um instante (contorna
   * obstáculos simples); se continuar travada por muito tempo, desiste do par.
   */
  private approachPartner(dt: number, world: World, blocked?: Blocker): void {
    const p = this.partner!;
    let dx = p.x - this.x;
    let dy = p.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.9) {
      this.move(dt, 0, 0, world, blocked);
      return;
    }
    dx /= dist;
    dy /= dist;
    this.sidestepTimer -= dt;
    if (this.sidestepTimer <= 0) this.sidestep = 0;
    if (this.sidestep !== 0) {
      // Gira a direção ~70° para o lado escolhido.
      const a = this.sidestep * 1.2;
      [dx, dy] = [dx * Math.cos(a) - dy * Math.sin(a), dx * Math.sin(a) + dy * Math.cos(a)];
    }
    const moved = this.move(dt, dx * 0.9, dy * 0.9, world, blocked);
    this.chaseStuck = moved < 0.002 ? this.chaseStuck + dt : Math.max(0, this.chaseStuck - dt * 0.5);
    if (moved < 0.002 && this.sidestep === 0 && this.chaseStuck > 0.35) {
      this.sidestep = this.rand() < 0.5 ? -1 : 1;
      this.sidestepTimer = 0.8;
    }
    if (this.chaseStuck > 4) {
      this.chaseStuck = 0;
      if (p.partner === this) p.partner = null;
      this.partner = null;
    }
  }

  private wander(dt: number, world: World, blocked?: Blocker): void {
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
