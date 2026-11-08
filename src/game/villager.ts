import type { World } from '../world/world';
import { npcDef, type NpcId, type NpcRole } from './npcs';
import type { Facing, Blocker } from './walker';
import { Wanderer } from './wanderer';

/** Uma conversa pronta para a caixa de conversa (`game/dialogue.ts`): quem fala, o retrato e o texto. */
export interface Conversation {
  npc: NpcId;
  name: string;
  /** Texto corrido; a caixa divide em páginas pelo que cabe. */
  text: string;
}

/**
 * Morador da Cidade do Despertar: passeia pelas ruas e praças perto de casa e **nunca sai delas** (a caixa dos pés
 * só entra em células que `onStreet` aceita — a cidade decide; ver `Entities.spawnVillagers`). Cada um é um NPC com
 * nome e falas próprias (`game/npcs.ts`). Durante a conversa fica parado, virado para quem fala.
 */
export class Villager extends Wanderer {
  /** Ofício (fala e lugar próprios); sem ofício = morador comum. */
  readonly role: NpcRole | null;
  /** Falando com alguém agora: parado, virado para a personagem (a caixa de conversa o segura). */
  private hold = false;
  private said = 0;

  constructor(
    x: number,
    y: number,
    readonly npc: NpcId,
    private readonly onStreet: (cx: number, cy: number) => boolean,
    rand: () => number = Math.random,
  ) {
    super(x, y, { speed: 1.4, halfW: 0.26, halfD: 0.14, stepHeight: 0 }, x, y, rand, { idle: [2, 7], walk: [1, 3], leash: npcDef(npc).role ? 3 : 6 });
    this.role = npcDef(npc).role ?? null;
  }

  get name(): string {
    return npcDef(this.npc).name;
  }

  /** A próxima fala (em roda) como conversa; o NPC fica parado até `release()`. */
  conversation(): Conversation {
    const def = npcDef(this.npc);
    const text = def.lines[this.said++ % def.lines.length];
    this.hold = true;
    return { npc: this.npc, name: def.name, text };
  }

  /** Terminou a conversa: volta a passear. */
  release(): void {
    this.hold = false;
  }

  get talking(): boolean {
    return this.hold;
  }

  /** Vira-se para (x, y). */
  faceTo(x: number, y: number): void {
    const dx = x - this.x;
    const dy = y - this.y;
    const f: Facing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
    this.facing = f;
  }

  /** A caixa dos pés inteira fica em rua/praça? */
  allowedAt(x: number, y: number): boolean {
    const { halfW, halfD } = this.spec;
    for (let cy = Math.floor(y - halfD); cy <= Math.floor(y + halfD); cy++) {
      for (let cx = Math.floor(x - halfW); cx <= Math.floor(x + halfW); cx++) if (!this.onStreet(cx, cy)) return false;
    }
    return true;
  }

  update(dt: number, world: World, blocked?: Blocker): void {
    if (this.hold) {
      this.move(dt, 0, 0, world, blocked); // parado (mantém a colisão e o quadro de parada)
      return;
    }
    this.wander(dt, world, (self, x, y) => !this.allowedAt(x, y) || !!blocked?.(self, x, y));
  }
}
