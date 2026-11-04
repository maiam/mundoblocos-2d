import { type PlayerAction, applyAction } from '../world/actions';
import type { World } from '../world/world';
import type { Transport } from './loopback';
import { type ClientMessage, type PlayerInfo, type PlayerState, PROTOCOL_VERSION, type ServerMessage } from './protocol';

/**
 * Sessão multiplayer do lado do jogo (ADR 0016). O servidor manda no mapa da sala: as ações dos outros chegam como
 * `applied` e são aplicadas no `World` local pelas mesmas regras. As minhas o jogo já aplicou na hora (mesmas regras,
 * sem esperar a rede) e só as **informa** (`sent`); o `applied` delas volta e é ignorado aqui. Recusa (rara: corrida
 * com outro jogador na mesma célula) chega em `onRejected`. Guarda os outros jogadores para o render.
 */
export class NetSession {
  /** Meu id e a sala, depois do `welcome`. */
  you: number | null = null;
  room: string | null = null;
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
  private readonly pending = new Map<number, PlayerAction>();
  private backlog: PlayerAction[] = [];

  constructor(private readonly transport: Transport) {
    transport.onMessage = (m) => this.receive(m);
    transport.onClose = () => this.onClose?.();
  }

  /** Entra: sem `room` cria sala nova (o código vem no `welcome`), com `room` entra pelo convite. */
  join(name: string, room?: string): void {
    this.send({ t: 'hello', v: PROTOCOL_VERSION, name, room });
  }

  /** Mundo local da sala (com a seed do `welcome`): recebe as edições já feitas e as que vierem. */
  attach(world: World): void {
    this.world = world;
    for (const a of this.backlog) applyAction(world, a);
    this.backlog = [];
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

  private apply(a: PlayerAction): void {
    if (this.world) applyAction(this.world, a);
    else this.backlog.push(a);
  }

  private receive(m: ServerMessage): void {
    switch (m.t) {
      case 'welcome':
        this.you = m.you;
        this.room = m.room;
        this.seed = m.seed;
        for (const p of m.players) this.others.set(p.id, p);
        for (const e of m.edits) this.apply(e.action);
        this.onWelcome?.(m.seed);
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
