import { STEP_HEIGHT } from '../config';
import type { ToolId } from '../world/items';
import type { World } from '../world/world';
import { type Blocker, Walker } from './walker';

export type { Facing } from './walker';

/** Duração do golpe de espada (4 quadros da folha de ataque). */
export const ATTACK_SECONDS = 0.36;
/** Momento do golpe (fração da animação) em que o acerto é resolvido. */
export const ATTACK_HIT_AT = 0.45;
/** Quadros da animação de ataque. */
export const ATTACK_FRAMES = 4;

/**
 * Personagem jogável: anda pela entrada do jogador (teclado/joystick, em
 * direções de tela) e sobe até STEP_HEIGHT nível por passo; descer é livre.
 * Com a espada, pode golpear: a animação dura ATTACK_SECONDS e o acerto acontece
 * uma única vez no meio do golpe (`consumeHit`), na direção em que ela olhava ao atacar.
 */
export class Player extends Walker {
  /** Ferramenta em mãos (muda o sprite); null = mãos livres. */
  equipped: ToolId | null = null;
  /** Tempo restante do golpe em andamento (0 = sem golpe). */
  attackTime = 0;
  private hitDone = true;

  constructor(x: number, y: number) {
    super(x, y, { speed: 4.2, halfW: 0.27, halfD: 0.15, stepHeight: STEP_HEIGHT });
  }

  get attacking(): boolean {
    return this.attackTime > 0;
  }

  /** Quadro atual do golpe (0..ATTACK_FRAMES-1). */
  get attackFrame(): number {
    const p = 1 - this.attackTime / ATTACK_SECONDS;
    return Math.min(ATTACK_FRAMES - 1, Math.floor(p * ATTACK_FRAMES));
  }

  /** Começa um golpe (se não houver outro em andamento). */
  startAttack(): boolean {
    if (this.attacking) return false;
    this.attackTime = ATTACK_SECONDS;
    this.hitDone = false;
    return true;
  }

  /** true uma única vez por golpe, quando a lâmina chega ao ponto de acerto. */
  consumeHit(): boolean {
    if (this.hitDone || !this.attacking) return false;
    if (1 - this.attackTime / ATTACK_SECONDS < ATTACK_HIT_AT) return false;
    this.hitDone = true;
    return true;
  }

  update(dt: number, ix: number, iy: number, world: World, blocked?: Blocker): void {
    // Durante o golpe ela continua podendo andar, mas a direção do golpe não muda.
    const facing = this.facing;
    this.move(dt, ix, iy, world, blocked);
    if (this.attacking) {
      this.facing = facing;
      this.attackTime = Math.max(0, this.attackTime - dt);
    }
  }
}
