import { STEP_HEIGHT } from '../config';
import type { ToolId } from '../world/items';
import { HUNGER, playerStats, REGEN, type Stats } from '../world/progression';
import type { World } from '../world/world';
import { type AttackTiming, DEFAULT_ATTACK_TIMING } from './attackTiming';
import { type Blocker, Walker } from './walker';

export type { Facing } from './walker';

/** Duração do golpe de espada (4 quadros da folha de ataque). */
export const ATTACK_SECONDS = DEFAULT_ATTACK_TIMING.seconds;
/** Momento do golpe (fração da animação) em que o acerto é resolvido. */
export const ATTACK_HIT_AT = DEFAULT_ATTACK_TIMING.hitAt;
/**
 * Cancelar e encadear (v0.93.63): depois do acerto, a partir desta fração da animação já dá para começar outro golpe (sem
 * esperar o fim); um golpe pedido um pouco antes disso fica na fila por `ATTACK_BUFFER_S` e sai assim que possível.
 */
export const ATTACK_CHAIN_AT = 0.7;
export const ATTACK_BUFFER_S = 0.18;
/** Quadros da animação de ataque. */
export const ATTACK_FRAMES = 4;
/** Invencibilidade depois de levar dano (s) e depois de renascer. */
export const HURT_INVULN_S = 0.9;
export const RESPAWN_INVULN_S = 2;
/** Duração de sentar e de levantar (s): os 4 quadros da 1ª fileira da folha de sentar, para frente e para trás. */
export const SIT_SECONDS = 0.5;
/** Quadro da folha em que ele fica sentado, parado (o último do sentar: sem balanço). */
export const SEATED_FRAME = 3;
/**
 * Onde ficam os pés de quem senta, em relação ao assento (células): na beira de cima da célula da frente. Na vista 3/4
 * o corpo sentado sobe a partir dos pés, então assim o corpo fica sobre o assento (com os pés na célula do assento, ele
 * parecia sentado um bloco acima — dono do produto, 07/11).
 */
export const SEAT_FEET = 1.05;
/** Velocidade (células/s) do passo até o assento e de volta. */
const SEAT_WALK = 3;

/**
 * Sentado: onde (assento) e de onde veio. Fases: `go` (anda até o assento), `down` (senta no lugar: o corpo desce),
 * `seated` (parado), `up` (levanta no lugar), `back` (anda de volta para onde estava).
 */
interface Seat {
  x: number;
  y: number;
  fromX: number;
  fromY: number;
  phase: 'go' | 'down' | 'seated' | 'up' | 'back';
  t: number;
}

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
  /** Golpes começados (a sala repassa aos outros, que tocam a animação ao ver o número mudar). */
  swings = 0;
  /** Tempo do golpe em andamento (do personagem e da ferramenta, `attackTimingFor`); o `Game` liga `timingFor`. */
  timingFor: ((tool: ToolId | null) => AttackTiming) | null = null;
  private timing: AttackTiming = DEFAULT_ATTACK_TIMING;
  private hitDone = true;
  /** Golpe pedido durante o anterior (fila curta): ferramenta e tempo restante da fila. */
  private queuedTool: ToolId | null | undefined = undefined;
  private queueLeft = 0;
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
  /** Sentado num assento (cadeira, banco); null = de pé. */
  seat: Seat | null = null;

  constructor(x: number, y: number) {
    // maxHalfW: na grade fina (ADR 0032) o corpo (0,54 de largura) passa por vãos de 1 célula
    super(x, y, { speed: 4.2, halfW: 0.27, halfD: 0.15, stepHeight: STEP_HEIGHT, maxHalfW: 0.45 });
  }

  get attacking(): boolean {
    return this.attackTime > 0;
  }

  /** Quadro atual do golpe (0..ATTACK_FRAMES-1). */
  get attackFrame(): number {
    return Math.min(ATTACK_FRAMES - 1, Math.floor(this.attackPhase * ATTACK_FRAMES));
  }

  /** Quanto do golpe já passou (0..1): as folhas com mais de 4 quadros escolhem o quadro por aqui. */
  get attackPhase(): number {
    return this.attacking ? 1 - this.attackTime / this.timing.seconds : 0;
  }

  /** Já passou do acerto e do ponto de cancelar: dá para começar outro golpe por cima do que termina. */
  private get canChain(): boolean {
    return this.attacking && this.hitDone && this.attackPhase >= ATTACK_CHAIN_AT;
  }

  /**
   * Começa um golpe. Com outro em andamento: se já dá para encadear, começa o novo; senão, se faltam até `ATTACK_BUFFER_S`
   * para poder encadear, o pedido entra na fila (sai sozinho quando der) e devolve false; pedido mais cedo que isso é
   * ignorado (apertar sem parar não empilha golpes).
   */
  startAttack(tool: ToolId | null = this.equipped): boolean {
    if (this.attacking && !this.canChain) {
      const toChain = this.timing.seconds * ATTACK_CHAIN_AT - (this.timing.seconds - this.attackTime);
      if (toChain <= ATTACK_BUFFER_S) {
        this.queuedTool = tool;
        this.queueLeft = ATTACK_BUFFER_S;
      }
      return false;
    }
    this.queuedTool = undefined;
    this.attackTool = tool;
    this.timing = this.timingFor?.(tool) ?? DEFAULT_ATTACK_TIMING;
    this.attackTime = this.timing.seconds;
    this.swings++;
    this.hitDone = false;
    return true;
  }

  /** true uma única vez por golpe, quando a lâmina chega ao ponto de acerto. */
  consumeHit(): boolean {
    if (this.hitDone || !this.attacking) return false;
    if (this.attackPhase < this.timing.hitAt) return false;
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
    if (this.seat) {
      // Levou dano sentado: levanta na hora (volta para onde estava) e recua dali.
      this.x = this.seat.fromX;
      this.y = this.seat.fromY;
      this.seat = null;
    }
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
    this.seat = null;
    this.x = x;
    this.y = y;
    this.z = this.visualZ = 0;
    this.hp = this.maxHp;
    this.hunger = HUNGER.max;
    this.invuln = RESPAWN_INVULN_S;
    this.sinceHurt = Infinity;
    this.attackTime = 0;
    this.hitDone = true;
    this.queuedTool = undefined;
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

  /**
   * Senta no assento da célula (x, y): vai para o meio dele, de frente, e toca a animação de sentar. Ao levantar
   * (andar ou tocar de novo — `standUp`), volta para onde estava.
   */
  sitOn(x: number, y: number): boolean {
    if (this.seat || this.dead || this.attacking) return false;
    this.seat = { x: x + 0.5, y: y + SEAT_FEET, fromX: this.x, fromY: this.y, phase: 'go', t: 0 };
    return true;
  }

  /** Começa a levantar (se estiver sentado ou sentando). */
  standUp(): void {
    const s = this.seat;
    if (s && (s.phase === 'seated' || s.phase === 'down')) { s.phase = 'up'; s.t = 0; }
  }

  /** Na pose de sentar (sentando, sentado ou levantando) — andando até o assento ou de volta não conta. */
  get sitting(): boolean {
    const p = this.seat?.phase;
    return p === 'down' || p === 'seated' || p === 'up';
  }

  /** Quadro da folha de sentar: 0–3 sentando, `SEATED_FRAME` parado, 3→0 levantando. */
  get sitFrame(): number {
    const s = this.seat;
    if (!s) return 0;
    if (s.phase === 'seated') return SEATED_FRAME;
    const k = Math.min(3, Math.floor((s.t / SIT_SECONDS) * 4));
    return s.phase === 'up' ? 3 - k : k;
  }

  /** Anda (desenho de caminhada) em linha reta até (tx, ty), atravessando o assento; true = chegou. */
  private walkTo(dt: number, tx: number, ty: number): boolean {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    const step = SEAT_WALK * dt;
    if (Math.abs(dx) > Math.abs(dy)) this.facing = dx < 0 ? 'left' : 'right';
    else if (d > 0.01) this.facing = dy < 0 ? 'up' : 'down';
    if (d <= step) {
      this.x = tx;
      this.y = ty;
      this.moving = false;
      this.walkTime = 0;
      return true;
    }
    this.x += (dx / d) * step;
    this.y += (dy / d) * step;
    this.moving = true;
    this.walkTime += dt;
    return false;
  }

  /**
   * Sentado: anda até o assento, vira de frente e senta no lugar (o corpo desce); fica parado; mexer o controle (ou
   * tocar) levanta no lugar e ele anda de volta para onde estava.
   */
  private updateSeat(dt: number, ix: number, iy: number): void {
    const s = this.seat!;
    s.t += dt;
    if (s.phase === 'go') {
      if (this.walkTo(dt, s.x, s.y)) { s.phase = 'down'; s.t = 0; this.facing = 'down'; }
      return;
    }
    if (s.phase === 'back') {
      if (this.walkTo(dt, s.fromX, s.fromY)) this.seat = null;
      return;
    }
    this.moving = false;
    this.walkTime = 0;
    this.facing = 'down';
    if (s.phase === 'down' && s.t >= SIT_SECONDS) { s.phase = 'seated'; s.t = 0; }
    if (s.phase === 'seated' && Math.hypot(ix, iy) > 0.3) this.standUp();
    if (s.phase === 'up' && s.t >= SIT_SECONDS) { s.phase = 'back'; s.t = 0; }
  }

  update(dt: number, ix: number, iy: number, world: World, blocked?: Blocker): void {
    this.tickHealth(dt);
    if (this.seat) {
      this.updateSeat(dt, ix, iy);
      return;
    }
    // Durante o golpe ela continua podendo andar, mas a direção do golpe não muda.
    const facing = this.facing;
    this.move(dt, ix, iy, world, blocked);
    if (this.attacking) {
      this.facing = facing;
      this.attackTime = Math.max(0, this.attackTime - dt);
    }
    // Golpe na fila: sai assim que o anterior termina ou permite encadear; some se esperou demais.
    if (this.queuedTool !== undefined) {
      this.queueLeft -= dt;
      if (this.queueLeft <= 0) this.queuedTool = undefined;
      else if (!this.attacking || this.canChain) this.startAttack(this.queuedTool);
    }
  }
}
