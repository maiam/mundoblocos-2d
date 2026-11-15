import { SUBDIV } from '../config';
import type { World } from '../world/world';
import { knownLine, type Tier } from './npcBrain/memory';
import { closedLine, type DaySchedule, type NpcPhase, phaseAt, scheduleOf } from './npcBrain/schedule';
import { npcDef, type NpcId, type NpcRole } from './npcs';
import type { ResidentDef } from './residents';
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
  /** Agenda do dia (ADR 0034, nível 1): só o Bento tem hoje; sem agenda, passeia como sempre. */
  private readonly schedule: DaySchedule | null;
  /** Fase do dia pela agenda (sem agenda, sempre `open`). */
  phase: NpcPhase = 'open';
  /** 0 = à vista … 1 = sumiu pela porta dos fundos (o desenho desbota). */
  fade = 0;
  private mode: 'post' | 'goHome' | 'leaving' | 'asleep' | 'arriving' = 'post';
  private home: [number, number] | null = null;
  private seeded = false;
  private stuckFor = 0;

  constructor(
    x: number,
    y: number,
    readonly npc: NpcId,
    private readonly onStreet: (cx: number, cy: number) => boolean,
    rand: () => number = Math.random,
    /** Morador sorteado (ADR 0034): `npc` é só a folha e o retrato emprestados; nome e falas vêm daqui e as cores são trocadas no shader. */
    readonly resident: ResidentDef | null = null,
  ) {
    super(x, y, { speed: 1.4, halfW: 0.26, halfD: 0.14, stepHeight: 0 }, x, y, rand, { idle: [2, 7], walk: [1, 3], leash: (npcDef(npc).role ? 3 : 6) * SUBDIV });
    this.role = npcDef(npc).role ?? null;
    this.schedule = scheduleOf(npc);
  }

  /** A porta dos fundos (centro da célula): por onde ele vai dormir e aparece de manhã. */
  setHome(x: number, y: number): void {
    this.home = [x, y];
  }

  /** Dormindo (fora do mapa: não aparece, não bloqueia nem atende)? */
  get hidden(): boolean {
    return this.mode === 'asleep';
  }

  /** A loja deste atendente está aberta? */
  get shopIsOpen(): boolean {
    return !this.schedule || this.phase === 'open';
  }

  /** Conversa de loja fechada (ele ainda está à vista, arrumando): fica parado até `release()`. */
  closedConversation(): Conversation {
    this.hold = true;
    return { npc: this.npc, name: this.name, text: closedLine(this.phase) };
  }

  /** Chave da memória: o id do sorteado (`rt3`…) ou o do NPC nomeado. */
  get memoryKey(): string {
    return this.resident?.id ?? this.npc;
  }

  get name(): string {
    return this.resident?.name ?? npcDef(this.npc).name;
  }

  /** Troca de cores do desenho (só os sorteados; os 16 NPCs nomeados usam a arte como ela é). */
  get look(): ResidentDef['look'] | null {
    return this.resident?.look ?? null;
  }

  /** A próxima fala (em roda) como conversa; o NPC fica parado até `release()`. */
  conversation(tier: Tier = 'stranger'): Conversation {
    const lines = this.resident?.lines ?? npcDef(this.npc).lines;
    // Memória (ADR 0034): na primeira fala da sessão, quem já conhece a jogadora a recebe com uma frase de reencontro.
    const hello = this.said === 0 ? knownLine(tier, this.said) : '';
    const text = `${hello ? hello + ' ' : ''}${lines[this.said++ % lines.length]}`;
    this.hold = true;
    return { npc: this.npc, name: this.name, text };
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

  update(dt: number, world: World, blocked?: Blocker, time = -1): void {
    if (this.schedule && time >= 0 && this.home) { this.routine(dt, world, blocked, time); return; }
    this.post(dt, world, blocked);
  }

  /** No posto: passeia pela área dele (ou fica parado, se está conversando). */
  private post(dt: number, world: World, blocked?: Blocker): void {
    if (this.hold) {
      this.move(dt, 0, 0, world, blocked); // parado (mantém a colisão e o quadro de parada)
      return;
    }
    this.wander(dt, world, (self, x, y) => !this.allowedAt(x, y) || !!blocked?.(self, x, y));
  }

  /**
   * Rotina do dia (nível 1): no posto durante o dia; ao anoitecer anda até a porta dos fundos, desbota e dorme (fora do mapa); de manhã aparece
   * nela e volta ao posto. A primeira chamada já nasce no estado certo para a hora (mundo aberto à noite: ele já está dormindo).
   */
  private routine(dt: number, world: World, blocked: Blocker | undefined, time: number): void {
    const phase = phaseAt(this.schedule!, time);
    this.phase = phase;
    const wantAsleep = phase === 'asleep';
    const [hx, hy] = this.home!;
    if (!this.seeded) {
      this.seeded = true;
      if (wantAsleep) { this.mode = 'asleep'; this.fade = 1; this.x = hx; this.y = hy; return; }
    }
    switch (this.mode) {
      case 'asleep':
        if (wantAsleep) return;
        this.mode = 'arriving';
        this.x = hx; this.y = hy; this.facing = 'down';
        return;
      case 'arriving':
        this.fade = Math.max(0, this.fade - dt / 1.2);
        this.move(dt, 0, 0, world, blocked);
        if (this.fade <= 0) this.mode = 'post';
        return;
      case 'goHome':
        if (!wantAsleep) { this.mode = 'post'; break; }
        if (this.steer(dt, world, blocked, hx, hy)) this.mode = 'leaving';
        return;
      case 'leaving':
        this.fade = Math.min(1, this.fade + dt / 1.2);
        this.move(dt, 0, 0, world, blocked);
        if (this.fade >= 1) this.mode = 'asleep';
        return;
      default:
        break;
    }
    if (this.mode === 'post' && wantAsleep && !this.hold) { this.mode = 'goHome'; this.stuckFor = 0; return; }
    this.post(dt, world, blocked);
  }

  /** Anda em linha reta até (tx, ty) respeitando a área do morador; travado por 2 s, chega de uma vez. Devolve se chegou. */
  private steer(dt: number, world: World, blocked: Blocker | undefined, tx: number, ty: number): boolean {
    const dx = tx - this.x, dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.3) return true;
    const moved = this.move(dt, dx / d, dy / d, world, (self, x, y) => !this.allowedAt(x, y) || !!blocked?.(self, x, y));
    this.stuckFor = moved < 0.002 ? this.stuckFor + dt : 0;
    if (this.stuckFor > 2) { this.x = tx; this.y = ty; return true; }
    return false;
  }
}
