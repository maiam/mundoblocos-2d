import { type AnimalKind, ITEMS, type ItemId } from '../world/items';
import type { World } from '../world/world';
import { type Blocker, type WalkerSpec } from './walker';
import { Wanderer, type WanderPace } from './wanderer';

/** Tempo apaixonado após comer (s). */
export const LOVE_SECONDS = 25;
/** Espera após ter um filhote antes de poder namorar de novo (s). */
export const BREED_COOLDOWN = 45;
/** Duração do namoro (s): os 16 quadros dos coraçõezinhos (~6 por segundo). */
export const COURTSHIP_SECONDS = 2.6;

/** Corpo de adulto e de filhote e quanto tempo o filhote leva para crescer (s). */
export interface BreedSpec {
  adult: WalkerSpec;
  baby: WalkerSpec;
  growUpSeconds: number;
}

/**
 * Animal que se reproduz (ovelha, vaca, galinha, cavalo): passeia (`Wanderer`) e tem o ciclo de vida comum —
 * comer o alimento da espécie (`ITEMS[item].feeds`) → apaixonado (corações) → com um par da mesma espécie
 * apaixonado por perto, os dois se aproximam e namoram → nasce um filhote, que cresce com o tempo.
 * A coordenação do par fica em `Entities`; aqui ficam o estado e o movimento.
 */
export class Breeder extends Wanderer {
  baby: boolean;
  age = 0;
  love = 0;
  cooldown = 0;
  partner: Breeder | null = null;
  /** Tempo restante do namoro (> 0 = namorando, parado). */
  courtship = 0;
  private chaseStuck = 0;
  /** Desvio lateral temporário ao contornar obstáculo a caminho do par (−1, 0, 1). */
  private sidestep = 0;
  private sidestepTimer = 0;

  constructor(
    readonly species: AnimalKind,
    private readonly breed: BreedSpec,
    x: number,
    y: number,
    homeX: number,
    homeY: number,
    rand: () => number,
    baby: boolean,
    pace?: WanderPace,
  ) {
    super(x, y, { ...(baby ? breed.baby : breed.adult) }, homeX, homeY, rand, pace);
    this.baby = baby;
  }

  get inLove(): boolean {
    return this.love > 0;
  }

  /** Pode comer agora? (adulto, sem estar apaixonado nem em espera). */
  get canEat(): boolean {
    return !this.baby && this.love <= 0 && this.cooldown <= 0 && this.courtship <= 0;
  }

  /** Este item é o alimento da espécie? */
  eats(item: ItemId): boolean {
    return ITEMS[item].feeds?.includes(this.species) ?? false;
  }

  /** Come: fica apaixonado. Retorna false se não puder comer. */
  feed(): boolean {
    if (!this.canEat) return false;
    this.love = LOVE_SECONDS;
    return true;
  }

  update(dt: number, world: World, blocked?: Blocker): void {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.baby) {
      this.age += dt;
      if (this.age >= this.breed.growUpSeconds) {
        this.baby = false;
        Object.assign(this.spec, this.breed.adult);
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
   * obstáculos simples); se continuar travado por muito tempo, desiste do par.
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
}
