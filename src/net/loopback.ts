import { parseClientMessage, ROOMS, roomById, type ServerMessage } from './protocol';
import { type Outgoing, Room } from './room';

/** Lado do jogo de uma conexão: manda texto, recebe mensagens do servidor. Hoje: `LoopbackServer`; depois: WebSocket. */
export interface Transport {
  send(text: string): void;
  onMessage: ((m: ServerMessage) => void) | null;
  /** Conexão fechada (pelo servidor, pela rede ou por `close`). */
  onClose: (() => void) | null;
  close(): void;
}

/**
 * Servidor de mentira, dentro do próprio jogo (Etapa 1, ADR 0016): mesmas salas (`Room`) e o mesmo protocolo do
 * servidor real, sem rede — para testar dois jogadores na mesma tela e nos testes automáticos. As mensagens passam por
 * JSON como na rede de verdade (nada de objeto compartilhado por engano).
 */
export class LoopbackServer {
  /** Salas fixas (`ROOMS`), abertas desde o início como no servidor real. */
  readonly rooms = new Map<number, Room>();

  constructor(rand: () => number = Math.random) {
    for (const r of ROOMS) this.rooms.set(r.id, new Room(r.id, r.name, r.seed, rand));
  }

  connect(): Transport {
    let roomId: number | null = null;
    let id: number | null = null;
    const deliver = (m: ServerMessage) => queueMicrotask(() => t.onMessage?.(JSON.parse(JSON.stringify(m)) as ServerMessage));
    const t: Transport & { deliverTo: (m: ServerMessage) => void } = {
      onMessage: null,
      onClose: null,
      deliverTo: deliver,
      send: (text) => {
        const m = parseClientMessage(text);
        if (!m) return deliver({ t: 'error', code: 'bad', message: 'Mensagem inválida.' });
        if (id === null) {
          if (m.t !== 'hello') return;
          const def = roomById(m.room);
          if (!def) return deliver({ t: 'error', code: 'room', message: 'Sala não encontrada.' });
          const room = this.rooms.get(def.id)!;
          const r = room.join(m);
          if (r.id !== null) { id = r.id; roomId = room.id; this.links.set(this.key(room.id, id), t); }
          this.route(room, r.id ?? -1, r.out, deliver);
          return;
        }
        const room = this.rooms.get(roomId!)!;
        this.route(room, id, room.handle(id, m), deliver);
      },
      close: () => {
        if (id === null || roomId === null) return;
        const room = this.rooms.get(roomId)!;
        this.links.delete(this.key(roomId, id));
        this.route(room, id, room.leave(id), deliver); // a sala fica (mundo e bolsas guardados), mesmo vazia
        id = null;
        queueMicrotask(() => t.onClose?.());
      },
    };
    return t;
  }

  /** Passa o tempo de todas as salas (testes: o servidor real faz isso ~1×/s). */
  tick(dt: number): void {
    for (const room of this.rooms.values()) this.route(room, -1, room.tick(dt), () => {});
  }

  private readonly links = new Map<string, { deliverTo: (m: ServerMessage) => void }>();
  private key(room: number, id: number): string {
    return `${room}:${id}`;
  }

  private route(room: Room, self: number, out: Outgoing[], reply: (m: ServerMessage) => void): void {
    for (const o of out) {
      if (o.to === 0) { reply(o.msg); continue; } // erro antes de entrar: só para quem pediu
      for (const [k, link] of this.links) {
        const [code, idText] = k.split(':');
        if (Number(code) !== room.id) continue;
        const pid = Number(idText);
        const ok = o.to === 'all' || (typeof o.to === 'number' ? o.to === pid : o.to.except !== pid);
        if (ok) link.deliverTo(o.msg);
      }
    }
    void self;
  }
}
