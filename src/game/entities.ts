import { CUBE_FRONT, TILE } from '../config';
import { Block } from '../world/blocks';
import { hash2 } from '../world/random';
import type { World } from '../world/world';
import type { Player } from './player';
import { COURTSHIP_SECONDS, BREED_COOLDOWN, Sheep } from './sheep';
import { type Facing, type Walker } from './walker';

import { TOOLS, type ToolId } from '../world/items';
import type { CharacterId } from '../world/profiles';

/** Ferramentas com folha de ação (golpe/arar). */
/** Ferramentas com folha de ação (`TOOLS[t].swings`). */
export type SwingTool = 'sword' | 'axe' | 'hoe' | 'shovel' | 'pickaxe';

export type ActorKind = 'heroine' | `heroine-${ToolId}` | `heroine-${SwingTool}-attack` | 'goddess' | 'sheep' | 'lamb' | 'sheep-love';

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
}

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

  private all(): Walker[] {
    return [this.player, ...this.npcs];
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

  /** Entidades (exceto a personagem) dentro do arco do golpe (espada ou machado): à frente, até SWORD_REACH. */
  strikeTargets(facing: Facing): Sheep[] {
    const [fx, fy] = FACING_VEC[facing];
    const p = this.player;
    return this.npcs.filter((s) => {
      const dx = s.x - p.x;
      const dy = s.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d > SWORD_REACH) return false;
      return d < 0.35 || (dx * fx + dy * fy) / d >= SWORD_ARC_COS;
    });
  }

  /**
   * Golpe (espada ou machado): aplica o acerto a cada alvo no arco e retorna quantos foram
   * atingidos. Animais ainda não têm animação de morte: somem do mundo.
   * (Monstros, quando existirem, recebem dano aqui pelo mesmo caminho.)
   */
  strike(facing: Facing): number {
    const hit = this.strikeTargets(facing);
    for (const s of hit) this.removeAnimal(s);
    return hit.length;
  }

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
    return out;
  }
}
