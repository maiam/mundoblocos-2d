import { inRect, type MonsterKind, type Rect } from '../world/dungeon';
import { MONSTER_STATS } from '../world/progression';
import type { World } from '../world/world';
import { type Blocker, Walker, type WalkerSpec } from './walker';

interface MonsterDef {
  spec: WalkerSpec;
  /** Distância (células) em que percebe a personagem e vai atrás dela. */
  sight: number;
  /** Quanto se afasta de casa passeando (células). */
  leash: number;
  /** Intervalo mínimo entre mordidas (s). Vida, ataque e defesa: `MONSTER_STATS` (world/progression.ts). */
  biteEvery: number;
  /** Tempo até renascer depois de derrotado (s). */
  respawn: number;
  /** Duração da animação de morte (s; acompanha os quadros da folha de morte). */
  deathSeconds: number;
  /** Monstro do mapa aberto (lobo): persegue em linha reta só a até `sight` células, sem mapa de corredores da dungeon. */
  open?: boolean;
}

/** Distância (células) até a qual o lobo ataca a personagem; mais longe, ele a ignora. */
export const WOLF_SIGHT = 3;
export const GOBLIN_SIGHT = WOLF_SIGHT;
export const GOBLIN_ATTACK_SECONDS = 0.55;
export const GOBLIN_ALERT_SECONDS = 0.48;
export type GoblinVisual = 'idle' | 'walk' | 'run' | 'alert' | 'attack' | 'hurt';
export const GOBLIN_VISUALS: readonly GoblinVisual[] = ['idle','walk','run','alert','attack','hurt'];

/** Comportamento por tipo de monstro (movimento, visão, ritmo); a ficha de combate fica em `MONSTER_STATS`. */
export const MONSTERS: Record<MonsterKind, MonsterDef> = {
  'spider-small': { spec: { speed: 2.1, halfW: 0.3, halfD: 0.18, stepHeight: 0 }, sight: 6, leash: 5, biteEvery: 1.0, respawn: 40, deathSeconds: 0.7 },
  'spider-big': { spec: { speed: 1.6, halfW: 0.42, halfD: 0.24, stepHeight: 0 }, sight: 7, leash: 5, biteEvery: 1.2, respawn: 60, deathSeconds: 0.9 },
  'spider-boss': { spec: { speed: 1.15, halfW: 0.9, halfD: 0.45, stepHeight: 0 }, sight: 9, leash: 4, biteEvery: 1.6, respawn: 300, deathSeconds: 1.6 },
  // Lobos (v0.91.0): só atacam a personagem a até 3 células (regra do dono do produto: `sight` = 3, em linha reta);
  // mais lentos que ela (4,2) para dar para fugir; o bando passeia junto, perto da toca.
  'wolf-brown': { spec: { speed: 3.0, halfW: 0.36, halfD: 0.2, stepHeight: 1 }, sight: WOLF_SIGHT, leash: 5, biteEvery: 1.1, respawn: 120, deathSeconds: 0.8, open: true },
  'wolf-gray': { spec: { speed: 3.0, halfW: 0.36, halfD: 0.2, stepHeight: 1 }, sight: WOLF_SIGHT, leash: 5, biteEvery: 1.1, respawn: 120, deathSeconds: 0.8, open: true },
  'wolf-white': { spec: { speed: 3.0, halfW: 0.36, halfD: 0.2, stepHeight: 1 }, sight: WOLF_SIGHT, leash: 5, biteEvery: 1.1, respawn: 120, deathSeconds: 0.8, open: true },
  // Goblins guard a campfire in groups of seven; aggression only within 3 cells.
  goblin: { spec: { speed: 2.75, halfW: 0.34, halfD: 0.21, stepHeight: 1 },
    sight: GOBLIN_SIGHT, leash: 4, biteEvery: 1.2, respawn: 150,
    deathSeconds: 0.95, open: true },
};

/** Tempo piscando depois de levar um golpe (s). */
export const HURT_SECONDS = 0.35;

type State = { kind: 'idle'; timer: number } | { kind: 'walk'; timer: number; dx: number; dy: number };

/** Distância em passos pelo chão da dungeon até a personagem (-1 = inalcançável/fora do mapa). */
export type FlowField = (x: number, y: number) => number;

/**
 * Monstro da dungeon. Passeia perto de onde nasceu e vai atrás da personagem quando ela entra no seu raio
 * de visão. **Nunca sai do interior da dungeon**: a caixa dos pés é bloqueada fora de `bounds` (a entrada
 * fica fora do interior, então ele não a atravessa). Vida e mordida pela ficha de `MONSTER_STATS`.
 */
export class Monster extends Walker {
  hp: number;
  readonly maxHp: number;
  hurt = 0;
  /** Espera até poder morder de novo (s). */
  private biteCd = 0;
  private state: State;
  private attackAnim=0;
  private alertAnim=0;
  private chasing=false;
  /** Network mirror visual override (not part of monster combat simulation). */
  presentationState: GoblinVisual | null = null;
  presentationFrame: number | null = null;

  get visualState(): GoblinVisual {
    if (this.presentationState) return this.presentationState;
    if (this.hurt > 0) return 'hurt';
    if (this.attackAnim > 0) return 'attack';
    if (this.alertAnim > 0) return 'alert';
    if (this.chasing && this.moving) return 'run';
    return this.moving ? 'walk' : 'idle';
  }

  get visualFrame(): number {
    if(this.presentationFrame!==null)return this.presentationFrame;
    if(this.visualState==='attack')return Math.min(3,Math.floor((1-this.attackAnim/GOBLIN_ATTACK_SECONDS)*4));
    if(this.visualState==='alert')return Math.min(3,Math.floor((1-this.alertAnim/GOBLIN_ALERT_SECONDS)*4));
    if(this.visualState==='hurt')return Math.min(3,Math.floor((1-this.hurt/HURT_SECONDS)*4));
    return 0;
  }

  constructor(
    readonly kind: MonsterKind,
    x: number,
    y: number,
    /** Interior da dungeon: limite do movimento. */
    readonly bounds: Rect,
    private readonly rand: () => number = Math.random,
    readonly homeX = x,
    readonly homeY = y,
  ) {
    super(x, y, { ...MONSTERS[kind].spec });
    this.hp = this.maxHp = MONSTER_STATS[kind].hp;
    this.state = { kind: 'idle', timer: 0.5 + rand() * 2 };
  }

  get dead(): boolean {
    return this.hp <= 0;
  }

  /** A caixa dos pés em (x, y) fica toda dentro do interior? */
  insideAt(x: number, y: number): boolean {
    const { halfW, halfD } = this.spec;
    const b = this.bounds;
    return x - halfW >= b.x0 && x + halfW <= b.x1 + 1 && y - halfD >= b.y0 && y + halfD <= b.y1 + 1;
  }

  /** Leva um golpe de `damage` pontos: perde vida, pisca e é empurrado para longe de (fromX, fromY). */
  takeHit(damage: number, fromX: number, fromY: number, world: World, blocked?: Blocker): void {
    this.hp -= damage;
    this.hurt = HURT_SECONDS;
    const d = Math.hypot(this.x - fromX, this.y - fromY) || 1;
    const facing = this.facing;
    this.move(0.25, (this.x - fromX) / d, (this.y - fromY) / d, world, this.confine(blocked));
    this.facing = facing;
  }

  /** Bloqueio entre entidades + limite do interior. */
  private confine(blocked?: Blocker): Blocker {
    return (self, x, y) => !this.insideAt(x, y) || !!blocked?.(self, x, y);
  }

  /** Distância de mordida (centro a centro). */
  get reach(): number {
    return 0.7 + this.spec.halfW;
  }

  /** Encostado na personagem e pronto para morder? Se sim, consome a espera e devolve true. */
  tryBite(target: { x: number; y: number }): boolean {
    if (this.dead || this.biteCd > 0 || this.hurt > 0) return false;
    if (Math.hypot(target.x - this.x, target.y - this.y) > this.reach + 0.15) return false;
    this.biteCd = MONSTERS[this.kind].biteEvery;
    if (this.kind === 'goblin') this.attackAnim = GOBLIN_ATTACK_SECONDS;
    return true;
  }

  /**
   * Passeia; com a personagem dentro do seu limite e perto (pelo caminho, se houver `flow`), persegue.
   * Com `flow` (mapa de distâncias da dungeon) segue os corredores: anda para a célula vizinha mais próxima
   * da personagem; encostado, vai direto e pára a `reach`.
   */
  update(dt: number, world: World, target: { x: number; y: number }, blocked?: Blocker, flow?: FlowField): void {
    this.hurt = Math.max(0, this.hurt - dt);
    this.biteCd = Math.max(0, this.biteCd - dt);
    this.attackAnim = Math.max(0, this.attackAnim - dt);
    this.alertAnim = Math.max(0, this.alertAnim - dt);
    const def = MONSTERS[this.kind];
    const fence = this.confine(blocked);
    const tx = target.x - this.x;
    const ty = target.y - this.y;
    const dist = Math.hypot(tx, ty);
    const targetInside = inRect(this.bounds, Math.floor(target.x), Math.floor(target.y));
    const cx = Math.floor(this.x);
    const cy = Math.floor(this.y);
    const steps = flow ? flow(cx, cy) : -1;
    const chasing = targetInside && (def.open ? dist <= def.sight : flow ? steps >= 0 && steps <= def.sight * 1.6 : dist < def.sight);
    if (chasing) {
      if (this.kind === 'goblin' && !this.chasing) this.alertAnim = GOBLIN_ALERT_SECONDS;
      this.chasing = true;
      const reach = this.reach;
      if (dist <= reach) {
        this.move(dt, 0, 0, world, fence);
        this.facing = Math.abs(tx) > Math.abs(ty) ? (tx < 0 ? 'left' : 'right') : ty < 0 ? 'up' : 'down';
        return;
      }
      let dx = tx / dist;
      let dy = ty / dist;
      if (flow && !def.open && steps > 1) {
        // Próximo passo pelo corredor: vizinho com menor distância até a personagem.
        let best = steps;
        let nx = cx;
        let ny = cy;
        for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const d = flow(cx + ox, cy + oy);
          if (d >= 0 && d < best) { best = d; nx = cx + ox; ny = cy + oy; }
        }
        const gx = nx + 0.5 - this.x;
        const gy = ny + 0.5 - this.y;
        const gl = Math.hypot(gx, gy) || 1;
        dx = gx / gl;
        dy = gy / gl;
      }
      this.move(dt, dx, dy, world, fence);
      return;
    }
    this.chasing = false;
    const s = this.state;
    s.timer -= dt;
    if (s.kind === 'idle') {
      this.move(dt, 0, 0, world, fence);
      if (s.timer <= 0) {
        const hx = this.homeX - this.x;
        const hy = this.homeY - this.y;
        const far = Math.hypot(hx, hy) > def.leash;
        const a = far ? Math.atan2(hy, hx) : this.rand() * Math.PI * 2;
        this.state = { kind: 'walk', timer: 0.8 + this.rand() * 1.8, dx: Math.cos(a), dy: Math.sin(a) };
      }
      return;
    }
    const moved = this.move(dt, s.dx * 0.6, s.dy * 0.6, world, fence);
    if (s.timer <= 0 || moved < 1e-4) this.state = { kind: 'idle', timer: 0.6 + this.rand() * 2.2 };
  }
}
