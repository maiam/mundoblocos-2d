import { DAY_LENGTH_S } from '../config';
import { applyAction } from '../world/actions';
import { World } from '../world/world';
import { type Applied, type ClientMessage, type Grown, MAX_PLAYERS, type PlayerInfo, PROTOCOL_VERSION, sanitizeName, type ServerMessage } from './protocol';

/** Hora do dia em que a sala abre (manhã, como o jogo sozinho). */
export const ROOM_START_TIME = 0.31;
/** De quanto em quanto tempo a sala manda a hora a todos (s): corrige a diferença dos relógios dos aparelhos. */
export const TIME_SYNC_SECONDS = 30;

/** Mensagem a entregar: a um jogador, a todos, ou a todos menos um. */
export type Outgoing = { to: number | 'all' | { except: number }; msg: ServerMessage };

/**
 * Sala co-op (ADR 0016): um mundo autoritativo (`World` com a seed da sala) e até `MAX_PLAYERS` convidados.
 * Puro — sem rede nem relógio: recebe mensagens já lidas (`protocol.parseClientMessage`) e devolve o que enviar. O
 * servidor do Orvalis só embrulha isto num WebSocket; o jogo usa o mesmo código no teste local (`LoopbackServer`).
 */
export class Room {
  readonly world: World;
  private readonly players = new Map<number, PlayerInfo>();
  /** Ações aplicadas desde que a sala abriu (quem entra depois recebe e reaplica; persistência por chunk vem depois). */
  readonly edits: Applied[] = [];
  private nextId = 1;
  /** Hora do dia da sala (0..1): a mesma para todos os jogadores. */
  time = ROOM_START_TIME;
  /** Células cujo último estado veio do crescimento ("x,y" → bloco); uma ação na célula apaga a entrada. */
  private readonly grown = new Map<string, Grown>();
  private syncTimer = TIME_SYNC_SECONDS;

  constructor(readonly code: string, readonly seed: number, private readonly rand: () => number = Math.random) {
    this.world = new World(seed);
  }

  /**
   * Passa o tempo da sala (o servidor chama ~1×/s com o tempo real): avança a hora, faz plantas e árvores crescerem
   * (a sala decide; os aparelhos só aplicam) e, de tempos em tempos, manda a hora a todos.
   */
  tick(dt: number): Outgoing[] {
    this.time = (this.time + dt / DAY_LENGTH_S) % 1;
    const cells: Grown[] = [];
    this.world.tick(dt, this.rand, true, (x, y, id) => {
      const g: Grown = [x, y, id];
      this.grown.set(`${x},${y}`, g);
      cells.push(g);
    });
    const out: Outgoing[] = [];
    if (cells.length) out.push({ to: 'all', msg: { t: 'grow', cells } });
    this.syncTimer -= dt;
    if (this.syncTimer <= 0) {
      this.syncTimer = TIME_SYNC_SECONDS;
      out.push({ to: 'all', msg: { t: 'time', time: this.time } });
    }
    return this.players.size ? out : [];
  }

  get size(): number {
    return this.players.size;
  }

  /** Pedido de entrada já com a sala escolhida. Retorna o id do novo jogador e o que enviar (ou só um erro). */
  join(hello: Extract<ClientMessage, { t: 'hello' }>): { id: number | null; out: Outgoing[] } {
    const fail = (code: Extract<ServerMessage, { t: 'error' }>['code'], message: string) => ({ id: null, out: [{ to: 0, msg: { t: 'error' as const, code, message } }] });
    if (hello.v !== PROTOCOL_VERSION) return fail('version', 'Versão do jogo diferente da do servidor: recarregue a página.');
    const name = sanitizeName(hello.name);
    if (!name) return fail('name', 'Nome inválido: use de 2 a 16 letras ou números.');
    if (this.players.size >= MAX_PLAYERS) return fail('full', `Sala cheia (máximo ${MAX_PLAYERS} jogadores).`);
    const id = this.nextId++;
    const player: PlayerInfo = { id, name, state: null };
    const others = [...this.players.values()];
    this.players.set(id, player);
    return {
      id,
      out: [
        { to: id, msg: { t: 'welcome', you: id, room: this.code, seed: this.seed, players: others, edits: this.edits, time: this.time, grown: [...this.grown.values()] } },
        { to: { except: id }, msg: { t: 'joined', player } },
      ],
    };
  }

  leave(id: number): Outgoing[] {
    if (!this.players.delete(id)) return [];
    return [{ to: 'all', msg: { t: 'left', id } }];
  }

  /** Mensagem de um jogador já na sala. Ações passam pelas regras do `World`; recusadas voltam só para quem mandou. */
  handle(id: number, m: ClientMessage): Outgoing[] {
    const p = this.players.get(id);
    if (!p) return [];
    if (m.t === 'state') {
      p.state = m.s;
      return [{ to: { except: id }, msg: { t: 'state', id, s: m.s } }];
    }
    if (m.t === 'action') {
      if (!applyAction(this.world, m.a)) return [{ to: id, msg: { t: 'rejected', seq: m.seq } }];
      const applied: Applied = { by: id, action: m.a };
      this.edits.push(applied);
      this.grown.delete(`${m.a.x},${m.a.y}`); // a ação passa a valer para a célula (reaplicada depois do crescimento)
      return [{ to: 'all', msg: { t: 'applied', ...applied } }];
    }
    return [];
  }
}
