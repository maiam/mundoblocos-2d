import { type PlayerAction, applyAction } from '../world/actions';
import type { World } from '../world/world';
import type { Transport } from './loopback';
import { fromB64 } from './b64';
import { type ClientMessage, type Grown, type PlayerInfo, type PlayerState, PROTOCOL_VERSION, type RoomBag, type RoomChunk, type ServerMessage } from './protocol';

/**
 * Sessão multiplayer do lado do jogo (ADR 0016). O servidor manda no mapa da sala: as ações dos outros chegam como
 * `applied` e são aplicadas no `World` local pelas mesmas regras. As minhas o jogo já aplicou na hora (mesmas regras,
 * sem esperar a rede) e só as **informa** (`sent`); o `applied` delas volta e é ignorado aqui. Recusa (rara: corrida
 * com outro jogador na mesma célula) chega em `onRejected`. Guarda os outros jogadores para o render.
 */
export class NetSession {
  /** Meu id e a sala (número e nome), depois do `welcome`. */
  you: number | null = null;
  room: number | null = null;
  roomName: string | null = null;
  /** Bolsa guardada na sala para este nome (null = primeira vez nesta sala). */
  bag: RoomBag | null = null;
  seed: number | null = null;
  readonly others = new Map<number, PlayerInfo>();
  /** Último erro do servidor (nome inválido, sala cheia…), para mostrar ao jogador. */
  error: string | null = null;
  private world: World | null = null;
  private seq = 0;
  /** Chamado quando a sala responde (o jogo cria o `World` com `seed` e chama `attach`). */
  onWelcome: ((seed: number) => void) | null = null;
  /** Ação minha que o servidor recusou (o jogo avisa; o mapa local pode ter ficado diferente do da sala). */
  onRejected: ((a: PlayerAction) => void) | null = null;
  /** Erro do servidor (entrada recusada, mensagem inválida…). */
  onError: ((message: string) => void) | null = null;
  /** Conexão caiu ou foi fechada. */
  onClose: (() => void) | null = null;
  /** Ação de outro jogador aplicada no mundo local (o jogo reacomoda quem estava na célula). */
  onApplied: (() => void) | null = null;
  /** Hora do dia da sala (0..1), atualizada no `welcome` e a cada `time`; o jogo segue dela. */
  time: number | null = null;
  /** A sala mandou a hora (o jogo acerta o relógio). */
  onTime: ((time: number) => void) | null = null;
  private readonly pending = new Map<number, PlayerAction>();
  private backlog: PlayerAction[] = [];
  private grownBacklog: Grown[] = [];
  private chunkBacklog: RoomChunk[] = [];

  constructor(private readonly transport: Transport) {
    transport.onMessage = (m) => this.receive(m);
    transport.onClose = () => this.onClose?.();
  }

  /** Entra numa sala fixa pelo número (`ROOMS`). */
  join(name: string, room: number): void {
    this.send({ t: 'hello', v: PROTOCOL_VERSION, name, room });
  }

  /** Manda a bolsa e a posição para a sala guardar (volta na próxima entrada com o mesmo nome). */
  sendBag(bag: RoomBag): void {
    this.send({ t: 'bag', bag });
  }

  /** Mundo local da sala (com a seed do `welcome`): recebe as edições já feitas e as que vierem. */
  attach(world: World): void {
    this.world = world;
    // Mundo da sala como está (chunks editados) e, por cima, o que chegou depois.
    for (const c of this.chunkBacklog) world.restoreChunk(c.cx, c.cy, fromB64(c.ground), c.levels.map(fromB64));
    if (this.chunkBacklog.length) world.settleWater();
    this.chunkBacklog = [];
    for (const a of this.backlog) applyAction(world, a);
    this.backlog = [];
    for (const [x, y, id] of this.grownBacklog) world.applyGrowth(x, y, id);
    this.grownBacklog = [];
  }

  /** Informa uma ação que o jogo já aplicou no `World` local (o servidor confere e repassa aos outros). */
  sent(a: PlayerAction): void {
    const seq = ++this.seq;
    this.pending.set(seq, a);
    this.send({ t: 'action', seq, a });
  }

  sendState(s: PlayerState): void {
    this.send({ t: 'state', s });
  }

  leave(): void {
    this.transport.close();
  }

  private send(m: ClientMessage): void {
    this.transport.send(JSON.stringify(m));
  }

  /** Crescimento decidido pela sala (antes do `attach`, guardado). */
  private grow(cells: Grown[]): void {
    if (!this.world) { this.grownBacklog.push(...cells); return; }
    for (const [x, y, id] of cells) this.world.applyGrowth(x, y, id);
  }

  private apply(a: PlayerAction): void {
    if (this.world) applyAction(this.world, a);
    else this.backlog.push(a);
  }

  private receive(m: ServerMessage): void {
    switch (m.t) {
      case 'welcome':
        this.you = m.you;
        this.room = m.room;
        this.roomName = m.roomName;
        this.seed = m.seed;
        this.bag = m.bag;
        for (const p of m.players) this.others.set(p.id, p);
        this.time = m.time;
        this.chunkBacklog = m.chunks; // aplicados no `attach` (o jogo cria o World com a seed no onWelcome)
        this.onWelcome?.(m.seed);
        break;
      case 'time':
        this.time = m.time;
        this.onTime?.(m.time);
        break;
      case 'grow':
        this.grow(m.cells);
        break;
      case 'joined':
        this.others.set(m.player.id, m.player);
        break;
      case 'left':
        this.others.delete(m.id);
        break;
      case 'state': {
        const p = this.others.get(m.id);
        if (p) p.state = m.s;
        break;
      }
      case 'applied':
        if (m.by === this.you) {
          // Já aplicada aqui na hora: só confirma.
          for (const [k, a] of this.pending) if (sameAction(a, m.action)) { this.pending.delete(k); break; }
          break;
        }
        this.apply(m.action);
        this.onApplied?.();
        break;
      case 'rejected': {
        const a = this.pending.get(m.seq);
        this.pending.delete(m.seq);
        if (a) this.onRejected?.(a);
        break;
      }
      case 'error':
        this.error = m.message;
        this.onError?.(m.message);
        break;
    }
  }
}

function sameAction(a: PlayerAction, b: PlayerAction): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
