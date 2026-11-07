import { DAY_LENGTH_S } from '../config';
import { applyAction } from '../world/actions';
import { Block } from '../world/blocks';
import { breakDrops, type Drop, pickDrops, type StackId } from '../world/items';
import { CHEST_SLOTS, World } from '../world/world';
import { fromB64, toB64 } from './b64';
import {
  type Applied, type ClientMessage, DEFAULT_APPEARANCE, type Grown, MAX_PLAYERS, type PlayerInfo, PROTOCOL_VERSION, type RoomBag, type RoomChunk,
  type ChestSlotsMsg, type RoomDrop, sanitizeName, type ServerMessage,
} from './protocol';

/** Mensagem a entregar: a um jogador, a todos, ou a todos menos um. */
export type Outgoing = { to: number | 'all' | { except: number }; msg: ServerMessage };

/** Hora do dia em que uma sala nova abre (manhã, como o jogo sozinho). */
export const ROOM_START_TIME = 0.31;
/** De quanto em quanto tempo a sala manda a hora a todos (s): corrige a diferença dos relógios dos aparelhos. */
export const TIME_SYNC_SECONDS = 30;
/** Versão do arquivo da sala no servidor (`RoomSnapshot`): 2 = baús. */
export const ROOM_SNAPSHOT_VERSION = 2;
/** Quanto tempo um item fica no chão da sala (s), como no jogo sozinho. */
export const DROP_LIFETIME = 300;
/** Distância máxima (células) entre o jogador e o item para pegar. */
const TAKE_REACH = 3;

/** O que o servidor grava em disco de uma sala: mundo (chunks editados), hora e bolsas por nome. */
export interface RoomSnapshot {
  v: number;
  room: number;
  seed: number;
  time: number;
  savedAt: number;
  chunks: RoomChunk[];
  bags: Record<string, RoomBag>;
  /** Conteúdo dos baús ("x,y" → espaços). */
  chests: Record<string, ChestSlotsMsg>;
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
  /** Itens no chão da sala (com a hora em que caíram, em segundos de sala). */
  private readonly drops = new Map<number, RoomDrop & { born: number }>();
  private nextDropId = 1;
  private clock = 0;
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
    const player: PlayerInfo = { id, name, state: null, appearance: hello.appearance ?? DEFAULT_APPEARANCE };
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
            drops: [...this.drops.values()].map(({ id, item, x, y }) => ({ id, item, x, y })), chests: this.chestList(),
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
      const a = m.a;
      // O que vai cair no chão é decidido aqui (a sala manda nos itens): lido antes de a ação mudar o mapa.
      const breaking = a.kind === 'break' ? this.world.breakTargetId(a.x, a.y) : null;
      const chestLoot: Drop[] = a.kind === 'break'
        ? (this.world.chestAt(a.x, a.y) ?? []).filter((c) => c !== null).map((c) => ({ item: c!.item as StackId, count: c!.count }))
        : [];
      const wasChest = a.kind === 'break' && this.world.getObject(a.x, a.y) === Block.CHEST;
      if (!applyAction(this.world, a)) return [{ to: id, msg: { t: 'rejected', seq: m.seq } }];
      this.dirty = true;
      const applied: Applied = { by: id, action: a };
      const out: Outgoing[] = [{ to: 'all', msg: { t: 'applied', ...applied } }];
      let loot: Drop[] = [];
      if (a.kind === 'break' && breaking !== null) {
        loot = [...(wasChest ? chestLoot : []), ...breakDrops(a.tool, breaking, this.world.profile.collectBlocks, this.rand)];
      }
      if (a.kind === 'pick') loot = pickDrops(this.rand);
      const list = this.spawnDrops(a.x + 0.5, a.y + 0.7, loot);
      if (list.length) out.push({ to: 'all', msg: { t: 'drops', list } });
      return out;
    }
    if (m.t === 'take') {
      const d = this.drops.get(m.id);
      const s = p.state;
      // Quem pede primeiro leva (o segundo pedido não acha mais o item); só perto do item.
      if (!d || !s || Math.hypot(s.x - d.x, s.y - d.y) > TAKE_REACH) return [];
      this.drops.delete(m.id);
      return [{ to: 'all', msg: { t: 'taken', id: m.id, by: id } }];
    }
    if (m.t === 'chest') {
      // Baú existe nesta célula: o conteúdo novo vale para todos (o último a mexer vence).
      if (this.world.getObject(m.x, m.y) !== Block.CHEST || m.slots.length !== CHEST_SLOTS) return [];
      this.world.chests.set(`${m.x},${m.y}`, m.slots.map((s) => (s ? { ...s } : null)));
      this.dirty = true;
      return [{ to: { except: id }, msg: { t: 'chest', x: m.x, y: m.y, slots: m.slots } }];
    }
    return [];
  }

  /**
   * Passa o tempo da sala (o servidor chama ~1×/s, com gente ou sem): avança a hora e faz plantas e árvores crescerem
   * (a sala decide; os aparelhos só aplicam). Com jogadores, manda o crescimento e, de tempos em tempos, a hora.
   */
  tick(dt: number): Outgoing[] {
    this.time = (this.time + dt / DAY_LENGTH_S) % 1;
    this.clock += dt;
    for (const [k, d] of this.drops) if (this.clock - d.born > DROP_LIFETIME) this.drops.delete(k); // os aparelhos somem sozinhos também
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

  /** Itens no chão: um por unidade, espalhados um pouco em volta de (x, y) (como `Drops.spawn` no jogo). */
  private spawnDrops(x: number, y: number, loot: Drop[]): RoomDrop[] {
    const list: RoomDrop[] = [];
    for (const d of loot) {
      for (let i = 0; i < d.count; i++) {
        const drop = { id: this.nextDropId++, item: d.item, x: x + (this.rand() - 0.5) * 0.6, y: y + (this.rand() - 0.5) * 0.4 };
        this.drops.set(drop.id, { ...drop, born: this.clock });
        list.push(drop);
      }
    }
    return list;
  }

  /** Baús da sala com conteúdo (os vazios nascem vazios em qualquer aparelho). */
  private chestList(): Array<{ x: number; y: number; slots: ChestSlotsMsg }> {
    return [...this.world.chests.entries()].map(([k, slots]) => {
      const [x, y] = k.split(',').map(Number);
      return { x, y, slots };
    });
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
      chests: Object.fromEntries(this.world.chests),
    };
  }

  /** Recarrega o que o servidor gravou (só se for desta sala e desta seed; senão, a sala começa do zero). */
  restore(s: RoomSnapshot): boolean {
    // v1 (sem baús) ainda vale: o mundo e as bolsas voltam; os baús ficam vazios.
    if (!s || (s.v !== ROOM_SNAPSHOT_VERSION && s.v !== 1) || s.room !== this.id || s.seed !== this.seed) return false;
    for (const c of s.chunks) this.world.restoreChunk(c.cx, c.cy, fromB64(c.ground), c.levels.map(fromB64));
    this.world.settleWater();
    if (Number.isFinite(s.time)) this.time = ((s.time % 1) + 1) % 1;
    for (const [k, bag] of Object.entries(s.bags ?? {})) this.bags.set(k, bag);
    for (const [k, slots] of Object.entries(s.chests ?? {})) {
      const [x, y] = k.split(',').map(Number);
      if (this.world.getObject(x, y) === Block.CHEST && Array.isArray(slots) && slots.length === CHEST_SLOTS) this.world.chests.set(k, slots);
    }
    this.dirty = false;
    return true;
  }
}
