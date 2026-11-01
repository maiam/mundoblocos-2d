import { Block } from '../world/blocks';
import { hash2 } from '../world/random';
import type { World } from '../world/world';
import type { Player } from './player';
import { Sheep } from './sheep';
import type { Walker } from './walker';

export type ActorKind = 'heroine' | 'sheep';

export interface Actor {
  walker: Walker;
  kind: ActorKind;
}

const FLOCK_SIZE = 4;

/**
 * Entidades vivas da sessão (personagem + NPCs): atualização, colisão entre
 * elas e consulta de ocupação de células. Estado de execução, não persistido.
 */
export class Entities {
  readonly npcs: Sheep[] = [];

  constructor(private readonly player: Player) {}

  get actors(): Actor[] {
    return [{ walker: this.player, kind: 'heroine' }, ...this.npcs.map((s) => ({ walker: s, kind: 'sheep' as const }))];
  }

  /**
   * Rebanho inicial perto do ponto (x, y): posições determinísticas pela seed,
   * em grama andável a 2–8 células de distância.
   */
  spawnFlock(world: World, x: number, y: number): void {
    const grass = new Set<number>([Block.GRASS, Block.ENCHANTED_GRASS]);
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

  /**
   * Bloqueio entre entidades: impede entrar na caixa de outra. Se já estavam
   * sobrepostas (ex.: nasceram juntas), deixa se afastar.
   */
  readonly blocker = (self: Walker, x: number, y: number): boolean => {
    for (const other of this.all()) {
      if (other === self) continue;
      if (self.overlapsAt(x, y, other) && !self.overlapsAt(self.x, self.y, other)) return true;
    }
    return false;
  };

  update(dt: number, world: World): void {
    for (const s of this.npcs) s.update(dt, world, this.blocker);
  }

  /** Alguma entidade ocupa a célula? (não se coloca bloco nem se cava sob elas). */
  occupies(cx: number, cy: number): boolean {
    return this.all().some((w) => w.occupies(cx, cy));
  }

  settleAll(world: World): void {
    for (const w of this.all()) w.settle(world);
  }
}
