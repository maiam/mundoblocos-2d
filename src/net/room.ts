import { applyAction } from '../world/actions';
import { World } from '../world/world';
import { type Applied, type ClientMessage, MAX_PLAYERS, type PlayerInfo, PROTOCOL_VERSION, sanitizeName, type ServerMessage } from './protocol';

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

  constructor(readonly code: string, readonly seed: number) {
    this.world = new World(seed);
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
        { to: id, msg: { t: 'welcome', you: id, room: this.code, seed: this.seed, players: others, edits: this.edits } },
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
      return [{ to: 'all', msg: { t: 'applied', ...applied } }];
    }
    return [];
  }
}
