import { CUBE_FRONT, TILE } from '../config';
import { Block } from '../world/blocks';
import { hash2 } from '../world/random';
import type { World } from '../world/world';
import type { Player } from './player';
import { COURTSHIP_SECONDS, BREED_COOLDOWN, Sheep } from './sheep';
import { type FlowField, Monster, MONSTERS } from './monster';
import { inRect, type MonsterKind, type Rect } from '../world/dungeon';
import { type Facing, type Walker } from './walker';

import { TOOLS, type ToolId } from '../world/items';
import type { CharacterId } from '../world/profiles';

/** Ferramentas com folha de ação (golpe/arar). */
/** Ferramentas com folha de ação (`TOOLS[t].swings`). */
export type SwingTool = 'sword' | 'axe' | 'hoe' | 'shovel' | 'pickaxe';

export type ActorKind = 'heroine' | `heroine-${ToolId}` | `heroine-${SwingTool}-attack` | 'goddess' | 'sheep' | 'lamb' | 'sheep-love' | MonsterKind;

/** O que o render precisa para desenhar um ator (desacoplado da lógica). */
export interface Actor {
  kind: ActorKind;
  x: number;
  y: number;
  visualZ: number;
  facing: Facing;
  moving: boolean;
  walkTime: number;
  /** Ovelha apaixonada: desenha coração flutuando. */
  inLove?: boolean;
  /** Quadro da animação de namoro (0..3). */
  frame?: number;
  /** Monstro: piscando após levar golpe. */
  hurt?: boolean;
  /** Monstro ferido: fração de vida restante (barra acima dele). */
  hp?: number;
  /** Monstro derrotado: progresso 0..1 da animação de morte (encolhe e desbota). */
  dying?: number;
}

/** Duração da animação de morte de um monstro (s). */
export const DEATH_SECONDS = 0.5;
/** Recalcula o mapa de distâncias da dungeon a cada … (s). */
const FLOW_EVERY = 0.25;
/** Monstro só renasce com a personagem a mais de … células do ponto de nascimento. */
const RESPAWN_CLEARANCE = 10;

const FLOCK_SIZE = 4;
/** Alcance do golpe de espada (células, do centro dos pés) e abertura do arco (cosseno mínimo). */
export const SWORD_REACH = 1.45;
const SWORD_ARC_COS = 0.3;
const FACING_VEC: Record<Facing, [number, number]> = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };
/** Distância (células) em que duas ovelhas apaixonadas se encontram. */
const PAIR_RANGE = 6;
/** Distância (células) para começar a namorar. */
const COURT_DISTANCE = 1.5;
/** Limite de ovelhas para a população não explodir. */
export const MAX_SHEEP = 16;

/**
 * Entidades vivas da sessão (personagem + ovelhas): atualização, colisão entre
 * elas, reprodução e ocupação de células. Estado de execução, não persistido.
 */
export class Entities {
  readonly npcs: Sheep[] = [];
  /** Monstros da dungeon (presos no interior dela). */
  readonly monsters: Monster[] = [];
  /** Monstros derrotados tocando a animação de morte. */
  readonly dying: Array<{ kind: MonsterKind; x: number; y: number; facing: Facing; t: number }> = [];
  /** Renascimentos agendados (todos os tipos, inclusive a Rainha, cada um no seu tempo). */
  readonly respawns: Array<{ kind: MonsterKind; x: number; y: number; bounds: Rect; timer: number }> = [];
  /** Chamado quando um monstro é derrotado (o Game solta os espólios). */
  onMonsterKilled: ((m: Monster) => void) | null = null;
  /** Mapa de distâncias (passos) até a personagem dentro da dungeon; null fora dela. */
  private flow: Int32Array | null = null;
  private flowArea: Rect | null = null;
  private flowTimer = 0;

  constructor(
    private readonly player: Player,
    private readonly rand: () => number = Math.random,
    /** Personagem jogável do mundo (perfil). */
    private readonly character: CharacterId = 'heroine',
  ) {}

  /** Rebanho inicial perto de (x, y): posições pela seed, em grama andável a 2–8 células. */
  spawnFlock(world: World, x: number, y: number): void {
    const grass = new Set<number>([Block.GRASS]);
    for (let i = 0; i < 400 && this.npcs.length < FLOCK_SIZE; i++) {
      const a = hash2(world.seed, i, 71) * Math.PI * 2;
      const r = 2 + hash2(world.seed, i, 72) * 6;
      const cx = Math.floor(x + Math.cos(a) * r);
      const cy = Math.floor(y + Math.sin(a) * r);
      if (!world.isWalkable(cx, cy) || !grass.has(world.getGround(cx, cy))) continue;
      const sheep = new Sheep(cx + 0.5, cy + 0.5);
      if (this.all().some((w) => sheep.overlapsAt(sheep.x, sheep.y, w))) continue;
      this.npcs.push(sheep);
    }
  }

  /** Monstros nos pontos da dungeon (posições pela seed; o sorteio do passeio usa `rand`). */
  spawnMonsters(world: World): void {
    const d = world.dungeon;
    if (!d) return;
    // O chefe fica na câmara da Rainha; os demais andam pelo labirinto inteiro.
    for (const s of d.spawns) this.monsters.push(new Monster(s.kind, s.x, s.y, s.kind === 'spider-boss' ? d.bossRoom : d.interior, this.rand));
  }

  private all(): Walker[] {
    return [this.player, ...this.npcs, ...this.monsters];
  }

  /** Bloqueio entre entidades; se já estavam sobrepostas, deixa se afastar. */
  readonly blocker = (self: Walker, x: number, y: number): boolean => {
    for (const other of this.all()) {
      if (other === self) continue;
      // Par apaixonado pode encostar um no outro para namorar.
      if (self instanceof Sheep && other instanceof Sheep && self.partner === other) continue;
      if (self.overlapsAt(x, y, other) && !self.overlapsAt(self.x, self.y, other)) return true;
    }
    return false;
  };

  update(dt: number, world: World): void {
    for (const s of this.npcs) s.update(dt, world, this.blocker);
    this.updateFlow(dt, world);
    const flow = this.flow ? this.flowAt : undefined;
    for (const m of this.monsters) m.update(dt, world, this.player, this.blocker, flow);
    // Mordidas: monstro encostado e pronto morde (a personagem fica invencível por um instante).
    if (!this.player.dead) {
      for (const m of this.monsters) {
        if (m.tryBite(this.player)) this.player.hurt(MONSTERS[m.kind].damage, m.x, m.y, world, this.blocker);
      }
    }
    for (let i = this.dying.length - 1; i >= 0; i--) {
      this.dying[i].t += dt / DEATH_SECONDS;
      if (this.dying[i].t >= 1) this.dying.splice(i, 1);
    }
    this.updateRespawns(dt);
    // Ordem importa: concluir antes de (re)começar, senão o par namoraria de novo.
    this.finishCourtships(world);
    this.formPairs();
    this.startCourtships();
  }

  /** Ovelhas apaixonadas e livres procuram a mais próxima na mesma situação. */
  private formPairs(): void {
    if (this.npcs.length >= MAX_SHEEP) return;
    for (const a of this.npcs) {
      if (!a.inLove || a.partner || a.baby || a.courtship > 0) continue;
      let best: Sheep | null = null;
      let bestD = PAIR_RANGE;
      for (const b of this.npcs) {
        if (b === a || !b.inLove || b.partner || b.baby || b.courtship > 0) continue;
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < bestD) { best = b; bestD = d; }
      }
      if (best) { a.partner = best; best.partner = a; }
    }
  }

  /** Par próximo o bastante: param, se viram um para o outro e namoram. */
  private startCourtships(): void {
    for (const a of this.npcs) {
      const b = a.partner;
      if (!b || a.courtship > 0 || b.partner !== a || this.courting.has(a) || this.courting.has(b)) continue;
      if (Math.hypot(a.x - b.x, a.y - b.y) > COURT_DISTANCE) continue;
      a.courtship = b.courtship = COURTSHIP_SECONDS;
      this.courting.add(a);
      const aLeft = a.x <= b.x;
      a.facing = aLeft ? 'right' : 'left';
      b.facing = aLeft ? 'left' : 'right';
    }
  }

  /** Pares que começaram a namorar (o filhote nasce quando a animação termina). */
  private readonly courting = new Set<Sheep>();

  /** Fim do namoro: nasce um filhote entre os dois; ambos entram em espera. */
  private finishCourtships(world: World): void {
    for (const a of [...this.courting]) {
      const b = a.partner;
      if (!b || b.partner !== a) {
        this.courting.delete(a);
        continue;
      }
      if (a.courtship > 0 || b.courtship > 0) continue;
      this.courting.delete(a);
      this.spawnLamb(world, (a.x + b.x) / 2, (a.y + b.y) / 2, a);
      for (const s of [a, b]) {
        s.love = 0;
        s.cooldown = BREED_COOLDOWN;
        s.partner = null;
      }
    }
  }

  private spawnLamb(world: World, x: number, y: number, parent: Sheep): void {
    const cx = Math.floor(x);
    const cy = Math.floor(y);
    for (let r = 0; r <= 2; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (!world.isWalkable(cx + dx, cy + dy)) continue;
          this.npcs.push(new Sheep(cx + dx + 0.5, cy + dy + 0.5, parent.homeX, parent.homeY, this.rand, true));
          return;
        }
      }
    }
  }

  /**
   * Entidades (exceto a personagem) dentro do arco do golpe (espada ou machado): à frente, até SWORD_REACH
   * da borda do corpo (monstro grande é atingido de mais longe).
   */
  strikeTargets(facing: Facing): Array<Sheep | Monster> {
    const [fx, fy] = FACING_VEC[facing];
    const p = this.player;
    return [...this.npcs, ...this.monsters].filter((s) => {
      const dx = s.x - p.x;
      const dy = s.y - p.y;
      const d = Math.hypot(dx, dy);
      const body = s instanceof Monster ? s.spec.halfW : 0;
      if (d - body > SWORD_REACH) return false;
      return d < 0.35 + body || (dx * fx + dy * fy) / d >= SWORD_ARC_COS;
    });
  }

  /**
   * Golpe (espada ou machado): aplica o acerto a cada alvo no arco e retorna quantos foram atingidos.
   * Animais somem (sem animação de morte ainda). Monstros perdem 1 de vida, piscam e recuam; sem vida, somem.
   */
  strike(facing: Facing, world?: World): number {
    const hit = this.strikeTargets(facing);
    for (const s of hit) {
      if (!(s instanceof Monster)) {
        this.removeAnimal(s);
        continue;
      }
      if (world) s.takeHit(this.player.x, this.player.y, world, this.blocker);
      else s.hp -= 1;
      if (s.dead) this.killMonster(s);
    }
    return hit.length;
  }

  /** Monstro derrotado: sai do jogo, toca a animação de morte, solta espólios e agenda o renascimento. */
  private killMonster(m: Monster): void {
    const i = this.monsters.indexOf(m);
    if (i < 0) return;
    this.monsters.splice(i, 1);
    this.dying.push({ kind: m.kind, x: m.x, y: m.y, facing: m.facing, t: 0 });
    this.respawns.push({ kind: m.kind, x: m.homeX, y: m.homeY, bounds: m.bounds, timer: MONSTERS[m.kind].respawn });
    this.onMonsterKilled?.(m);
  }

  /** Renasce quando o tempo passou e a personagem está longe do ponto (senão tenta de novo em 5 s). */
  private updateRespawns(dt: number): void {
    for (let i = this.respawns.length - 1; i >= 0; i--) {
      const r = this.respawns[i];
      r.timer -= dt;
      if (r.timer > 0) continue;
      const p = this.player;
      const m = new Monster(r.kind, r.x, r.y, r.bounds, this.rand);
      if (Math.hypot(p.x - r.x, p.y - r.y) < RESPAWN_CLEARANCE || this.all().some((w) => m.overlapsAt(m.x, m.y, w))) {
        r.timer = 5;
        continue;
      }
      this.respawns.splice(i, 1);
      this.monsters.push(m);
    }
  }

  /** Mapa de distâncias pelo chão da dungeon até a personagem (BFS), só com ela lá dentro. */
  private updateFlow(dt: number, world: World): void {
    const d = world.dungeon;
    const p = this.player;
    if (!d || !inRect(d.area, Math.floor(p.x), Math.floor(p.y))) {
      this.flow = null;
      return;
    }
    this.flowTimer -= dt;
    if (this.flow && this.flowTimer > 0) return;
    this.flowTimer = FLOW_EVERY;
    const a = d.area;
    const w = a.x1 - a.x0 + 1;
    const h = a.y1 - a.y0 + 1;
    const dist = this.flow && this.flow.length === w * h ? this.flow.fill(-1) : new Int32Array(w * h).fill(-1);
    const start = (Math.floor(p.y) - a.y0) * w + (Math.floor(p.x) - a.x0);
    dist[start] = 0;
    const q = new Int32Array(w * h);
    let head = 0;
    let tail = 0;
    q[tail++] = start;
    while (head < tail) {
      const i = q[head++];
      const x = i % w;
      const y = (i - x) / w;
      for (let k = 0; k < 4; k++) {
        const nx = x + (k === 0 ? 1 : k === 1 ? -1 : 0);
        const ny = y + (k === 2 ? 1 : k === 3 ? -1 : 0);
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx;
        if (dist[j] >= 0 || world.standHeight(a.x0 + nx, a.y0 + ny) !== 0) continue;
        dist[j] = dist[i] + 1;
        q[tail++] = j;
      }
    }
    this.flow = dist;
    this.flowArea = a;
  }

  private readonly flowAt: FlowField = (x, y) => {
    const a = this.flowArea;
    if (!this.flow || !a || x < a.x0 || y < a.y0 || x > a.x1 || y > a.y1) return -1;
    return this.flow[(y - a.y0) * (a.x1 - a.x0 + 1) + (x - a.x0)];
  };

  /** Remove um animal e desfaz vínculos (par, namoro) de quem dependia dele. */
  private removeAnimal(s: Sheep): void {
    const i = this.npcs.indexOf(s);
    if (i < 0) return;
    this.npcs.splice(i, 1);
    this.courting.delete(s);
    for (const o of this.npcs) {
      if (o.partner === s) {
        o.partner = null;
        o.courtship = 0;
        this.courting.delete(o);
      }
    }
  }

  /** Ovelha sob o ponto (em células), considerando a altura do sprite; a mais à frente vence. */
  sheepAt(wx: number, wy: number): Sheep | null {
    let hit: Sheep | null = null;
    for (const s of this.npcs) {
      const h = s.baby ? 0.85 : 1.15;
      const half = s.baby ? 0.35 : 0.45;
      const lift = (s.visualZ * CUBE_FRONT) / TILE;
      if (Math.abs(wx - s.x) < half && wy > s.y - lift - h && wy < s.y - lift + 0.2) {
        if (!hit || s.y > hit.y) hit = s;
      }
    }
    return hit;
  }

  /** Alguma entidade ocupa a célula? (não se coloca bloco nem se cava sob elas). */
  occupies(cx: number, cy: number): boolean {
    return this.all().some((w) => w.occupies(cx, cy));
  }

  settleAll(world: World): void {
    for (const w of this.all()) w.settle(world);
  }

  get actors(): Actor[] {
    const p = this.player;
    const kind: ActorKind = this.character === 'goddess' ? 'goddess'
      : p.attacking && p.attackTool && TOOLS[p.attackTool].swings ? `heroine-${p.attackTool as SwingTool}-attack`
      : p.equipped ? `heroine-${p.equipped}` : 'heroine';
    const out: Actor[] = [{
      kind, x: p.x, y: p.y, visualZ: p.visualZ, facing: p.facing, moving: p.moving, walkTime: p.walkTime,
      frame: p.attacking ? p.attackFrame : undefined,
      hurt: p.invuln > 0,
    }];
    const drawnCouples = new Set<Sheep>();
    for (const s of this.npcs) {
      if (s.courtship > 0 && s.partner) {
        if (drawnCouples.has(s)) continue;
        drawnCouples.add(s).add(s.partner);
        const progress = 1 - s.courtship / COURTSHIP_SECONDS;
        out.push({
          kind: 'sheep-love',
          x: (s.x + s.partner.x) / 2,
          y: Math.max(s.y, s.partner.y),
          visualZ: 0,
          facing: 'down',
          moving: false,
          walkTime: 0,
          frame: Math.min(3, Math.floor(progress * 4)),
        });
        continue;
      }
      out.push({
        kind: s.baby ? 'lamb' : 'sheep',
        x: s.x, y: s.y, visualZ: s.visualZ, facing: s.facing, moving: s.moving, walkTime: s.walkTime,
        inLove: s.inLove,
      });
    }
    for (const m of this.monsters) {
      out.push({
        kind: m.kind, x: m.x, y: m.y, visualZ: m.visualZ, facing: m.facing, moving: m.moving, walkTime: m.walkTime,
        hurt: m.hurt > 0, hp: m.hp < m.maxHp ? m.hp / m.maxHp : undefined,
      });
    }
    for (const d of this.dying) {
      out.push({ kind: d.kind, x: d.x, y: d.y, visualZ: 0, facing: d.facing, moving: false, walkTime: 0, dying: d.t });
    }
    return out;
  }
}
