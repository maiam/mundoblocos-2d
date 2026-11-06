import { DAY_LENGTH_S } from '../config';
import { applyAction } from '../world/actions';
import { World } from '../world/world';
import { fromB64, toB64 } from './b64';
import {
  type Applied, type ClientMessage, type Grown, MAX_PLAYERS, type PlayerInfo, PROTOCOL_VERSION, type RoomBag, type RoomChunk,
  sanitizeName, type ServerMessage,
} from './protocol';

/** Mensagem a entregar: a um jogador, a todos, ou a todos menos um. */
export type Outgoing = { to: number | 'all' | { except: number }; msg: ServerMessage };

/** Hora do dia em que uma sala nova abre (manhã, como o jogo sozinho). */
export const ROOM_START_TIME = 0.31;
/** De quanto em quanto tempo a sala manda a hora a todos (s): corrige a diferença dos relógios dos aparelhos. */
export const TIME_SYNC_SECONDS = 30;
/** Versão do arquivo da sala no servidor (`RoomSnapshot`). */
export const ROOM_SNAPSHOT_VERSION = 1;

/** O que o servidor grava em disco de uma sala: mundo (chunks editados), hora e bolsas por nome. */
export interface RoomSnapshot {
  v: number;
  room: number;
  seed: number;
  time: number;
  savedAt: number;
  chunks: RoomChunk[];
  bags: Record<string, RoomBag>;
}

/** Chave da bolsa: o nome sem diferença de maiúsculas (Ana = ana). */
const bagKey = (name: string) => name.toLocaleLowerCase('pt-BR');

/**
 * Sala fixa (ADR 0016 + ADR 0020): um mundo autoritativo e compartilhado (`World` com a seed da sala), aberto a até
 * `MAX_PLAYERS` jogadores ao mesmo tempo, que entram e saem quando quiserem. Tudo o que muda no mundo fica na sala (e
 * vai para o disco pelo servidor, `snapshot`/`restore`); a bolsa de cada um fica guardada pelo nome.
 * Puro — sem rede nem relógio: recebe mensagens já lidas e devolve o que enviar; o servidor chama `tick(dt)`.
 */
export class Room {
  readonly world: World;
  private readonly players = new Map<number, PlayerInfo>();
  private nextId = 1;
  /** Hora do dia da sala (0..1): a mesma para todos os jogadores. */
  time = ROOM_START_TIME;
  /** Bolsas guardadas por nome (minúsculas). */
  private readonly bags = new Map<string, RoomBag>();
  private syncTimer = TIME_SYNC_SECONDS;
  /** Algo mudou desde o último `snapshot` (o servidor só grava quando há o que gravar). */
  dirty = false;

  constructor(readonly id: number, readonly name: string, readonly seed: number, private readonly rand: () => number = Math.random) {
    this.world = new World(seed);
  }

  get size(): number {
    return this.players.size;
  }

  /** Pedido de entrada. Retorna o id do novo jogador e o que enviar (ou só um erro, para quem pediu). */
  join(hello: Extract<ClientMessage, { t: 'hello' }>): { id: number | null; out: Outgoing[] } {
    const fail = (code: Extract<ServerMessage, { t: 'error' }>['code'], message: string) => ({ id: null, out: [{ to: 0, msg: { t: 'error' as const, code, message } }] });
    if (hello.v !== PROTOCOL_VERSION) return fail('version', 'Versão do jogo diferente da do servidor: recarregue a página.');
    const name = sanitizeName(hello.name);
    if (!name) return fail('name', 'Nome inválido: use de 2 a 16 letras ou números.');
    if (this.players.size >= MAX_PLAYERS) return fail('full', `${this.name} cheia (máximo ${MAX_PLAYERS} jogadores). Tente daqui a pouco.`);
    // A bolsa é guardada pelo nome: dois ao mesmo tempo com o mesmo nome dividiriam a bolsa.
    if ([...this.players.values()].some((p) => bagKey(p.name) === bagKey(name))) return fail('name', `Já tem alguém com o nome ${name} na sala: escolha outro.`);
    const id = this.nextId++;
    const player: PlayerInfo = { id, name, state: null };
    const others = [...this.players.values()];
    this.players.set(id, player);
    return {
      id,
      out: [
        {
          to: id,
          msg: {
            t: 'welcome', you: id, room: this.id, roomName: this.name, seed: this.seed, players: others,
            chunks: this.chunks(), time: this.time, bag: this.bags.get(bagKey(name)) ?? null,
          },
        },
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
    if (m.t === 'bag') {
      this.bags.set(bagKey(p.name), m.bag);
      this.dirty = true;
      return [];
    }
    if (m.t === 'action') {
      if (!applyAction(this.world, m.a)) return [{ to: id, msg: { t: 'rejected', seq: m.seq } }];
      this.dirty = true;
      const applied: Applied = { by: id, action: m.a };
      return [{ to: 'all', msg: { t: 'applied', ...applied } }];
    }
    return [];
  }

  /**
   * Passa o tempo da sala (o servidor chama ~1×/s, com gente ou sem): avança a hora e faz plantas e árvores crescerem
   * (a sala decide; os aparelhos só aplicam). Com jogadores, manda o crescimento e, de tempos em tempos, a hora.
   */
  tick(dt: number): Outgoing[] {
    this.time = (this.time + dt / DAY_LENGTH_S) % 1;
    const cells: Grown[] = [];
    this.world.tick(dt, this.rand, true, (x, y, id) => cells.push([x, y, id]));
    if (cells.length) this.dirty = true;
    const out: Outgoing[] = [];
    if (cells.length) out.push({ to: 'all', msg: { t: 'grow', cells } });
    this.syncTimer -= dt;
    if (this.syncTimer <= 0) {
      this.syncTimer = TIME_SYNC_SECONDS;
      out.push({ to: 'all', msg: { t: 'time', time: this.time } });
    }
    return this.players.size ? out : [];
  }

  /** Mundo da sala como está: os chunks editados (o resto vem da seed). */
  private chunks(): RoomChunk[] {
    return this.world.modifiedChunks().map((c) => ({ cx: c.cx, cy: c.cy, ground: toB64(c.ground), levels: c.levels.map(toB64) }));
  }

  /** Fotografia para o disco (o servidor grava quando `dirty`). */
  snapshot(): RoomSnapshot {
    this.dirty = false;
    return {
      v: ROOM_SNAPSHOT_VERSION, room: this.id, seed: this.seed, time: this.time, savedAt: Date.now(),
      chunks: this.chunks(), bags: Object.fromEntries(this.bags),
    };
  }

  /** Recarrega o que o servidor gravou (só se for desta sala e desta seed; senão, a sala começa do zero). */
  restore(s: RoomSnapshot): boolean {
    if (!s || s.v !== ROOM_SNAPSHOT_VERSION || s.room !== this.id || s.seed !== this.seed) return false;
    for (const c of s.chunks) this.world.restoreChunk(c.cx, c.cy, fromB64(c.ground), c.levels.map(fromB64));
    this.world.settleWater();
    if (Number.isFinite(s.time)) this.time = ((s.time % 1) + 1) % 1;
    for (const [k, bag] of Object.entries(s.bags ?? {})) this.bags.set(k, bag);
    this.dirty = false;
    return true;
  }
}
