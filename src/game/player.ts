import { STEP_HEIGHT } from '../config';
import type { ToolId } from '../world/items';
import { HUNGER, playerStats, REGEN, type Stats } from '../world/progression';
import type { World } from '../world/world';
import { type Blocker, Walker } from './walker';

export type { Facing } from './walker';

/** Duração do golpe de espada (4 quadros da folha de ataque). */
export const ATTACK_SECONDS = 0.36;
/** Momento do golpe (fração da animação) em que o acerto é resolvido. */
export const ATTACK_HIT_AT = 0.45;
/** Quadros da animação de ataque. */
export const ATTACK_FRAMES = 4;
/** Invencibilidade depois de levar dano (s) e depois de renascer. */
export const HURT_INVULN_S = 0.9;
export const RESPAWN_INVULN_S = 2;

/**
 * Personagem jogável: anda pela entrada do jogador (teclado/joystick, em
 * direções de tela) e sobe até STEP_HEIGHT nível por passo; descer é livre.
 * Com ferramenta de golpe (espada, machado), pode golpear: a animação dura ATTACK_SECONDS e o acerto acontece
 * uma única vez no meio do golpe (`consumeHit`), na direção em que ela olhava ao atacar.
 */
export class Player extends Walker {
  /** Ferramenta em mãos (muda o sprite); null = mãos livres. */
  equipped: ToolId | null = null;
  /** Tempo restante do golpe em andamento (0 = sem golpe). */
  attackTime = 0;
  /** Ferramenta do golpe em andamento (define a folha de animação). */
  attackTool: ToolId | null = null;
  private hitDone = true;
  /** Atributos atuais (vida máxima, ataque, defesa — `world/progression.ts`). */
  stats: Stats = playerStats(1);
  /** Vida em pontos (0 = derrotada; o Game a faz renascer). */
  hp = this.stats.maxHp;
  /** Invencibilidade restante (pisca na tela). */
  invuln = 0;
  /** Tempo desde o último dano (regeneração). */
  private sinceHurt = Infinity;
  private regen = 0;
  /** Fome ligada neste mundo (perfil com cultivo); desligada, a barra fica cheia e nada muda. */
  hungerOn = false;
  /** Barra de fome (cheia = satisfeita), `HUNGER` em world/progression. */
  hunger: number = HUNGER.max;
  private starve = 0;

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
  startAttack(tool: ToolId | null = this.equipped): boolean {
    if (this.attacking) return false;
    this.attackTool = tool;
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

  get dead(): boolean {
    return this.hp <= 0;
  }

  get maxHp(): number {
    return this.stats.maxHp;
  }

  /**
   * Leva dano de (fromX, fromY): perde `damage` pontos de vida, fica invencível por um instante e recua.
   * Ignorado se invencível ou já derrotada. Retorna true se o dano entrou.
   */
  hurt(damage: number, fromX: number, fromY: number, world: World, blocked?: Blocker): boolean {
    if (this.invuln > 0 || this.dead) return false;
    this.hp = Math.max(0, this.hp - damage);
    this.invuln = HURT_INVULN_S;
    this.sinceHurt = 0;
    this.regen = 0;
    const d = Math.hypot(this.x - fromX, this.y - fromY) || 1;
    const facing = this.facing;
    this.move(0.12, (this.x - fromX) / d, (this.y - fromY) / d, world, blocked);
    this.facing = facing;
    return true;
  }

  /** Renasce em (x, y) com vida cheia (itens ficam com ela). */
  respawn(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.z = this.visualZ = 0;
    this.hp = this.maxHp;
    this.hunger = HUNGER.max;
    this.invuln = RESPAWN_INVULN_S;
    this.sinceHurt = Infinity;
    this.attackTime = 0;
    this.hitDone = true;
  }

  /** Come: a fome sobe `points` (até cheia). false = sem fome (barra cheia) ou fome desligada. */
  eat(points: number): boolean {
    if (!this.hungerOn || points <= 0 || this.hunger >= HUNGER.max - 0.5) return false;
    this.hunger = Math.min(HUNGER.max, this.hunger + points);
    this.starve = 0;
    return true;
  }

  /** Fome esvaziando; vazia, tira vida aos poucos (para em 1 — a fome sozinha não derruba). */
  private tickHunger(dt: number): void {
    if (!this.hungerOn || this.hp <= 0) return;
    this.hunger = Math.max(0, this.hunger - dt * HUNGER.perSecond);
    if (this.hunger > 0) { this.starve = 0; return; }
    this.starve += dt;
    if (this.starve < HUNGER.starveEvery) return;
    this.starve = 0;
    if (this.hp > 1) this.hp = Math.max(1, this.hp - HUNGER.starveDamage);
  }

  /** Invencibilidade e regeneração fora de combate (com fome abaixo de `HUNGER.regenMin`, não regenera). */
  private tickHealth(dt: number): void {
    this.invuln = Math.max(0, this.invuln - dt);
    this.sinceHurt += dt;
    this.tickHunger(dt);
    if (this.hungerOn && this.hunger < HUNGER.regenMin) return;
    if (this.hp <= 0 || this.hp >= this.maxHp || this.sinceHurt < REGEN.delay) return;
    this.regen += dt;
    if (this.regen >= REGEN.every) {
      this.regen = 0;
      this.hp = Math.min(this.maxHp, this.hp + Math.max(1, Math.round(this.maxHp * REGEN.fraction)));
    }
  }

  update(dt: number, ix: number, iy: number, world: World, blocked?: Blocker): void {
    this.tickHealth(dt);
    // Durante o golpe ela continua podendo andar, mas a direção do golpe não muda.
    const facing = this.facing;
    this.move(dt, ix, iy, world, blocked);
    if (this.attacking) {
      this.facing = facing;
      this.attackTime = Math.max(0, this.attackTime - dt);
    }
  }
}
