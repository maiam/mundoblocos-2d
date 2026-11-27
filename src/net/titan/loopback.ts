import { parseTitanClientMessage, TITAN_ROOMS, titanRoomById, type TitanServerMessage } from './protocol';
import { TitanRoom, type TitanOutgoing } from './room';

/** Lado do jogo de uma conexão (mesma forma do `Transport` do mundo principal). */
export interface TitanTransport {
  send(text: string): void;
  onMessage: ((m: TitanServerMessage) => void) | null;
  onClose: (() => void) | null;
  close(): void;
}

/** Servidor de mentira das salas do Titã (ADR 0104): as mesmas `TitanRoom` e o mesmo protocolo do servidor real, sem rede; as mensagens passam por JSON. Testes e dois jogadores na mesma tela. */
export class TitanLoopbackServer {
  readonly rooms = new Map<number, TitanRoom>();
  private readonly links = new Map<string, (m: TitanServerMessage) => void>();

  constructor(rand: () => number = Math.random) {
    for (const r of TITAN_ROOMS) this.rooms.set(r.id, new TitanRoom(r.id, r.name, r.seed, rand, r.world));
  }

  connect(): TitanTransport {
    let roomId: number | null = null, id: number | null = null;
    const deliver = (m: TitanServerMessage): void => queueMicrotask(() => t.onMessage?.(JSON.parse(JSON.stringify(m)) as TitanServerMessage));
    const t: TitanTransport = {
      onMessage: null, onClose: null,
      send: (text) => {
        const m = parseTitanClientMessage(text);
        if (!m) return deliver({ t: 'error', code: 'bad', message: 'Mensagem inválida.' });
        if (id === null) {
          if (m.t !== 'hello') return;
          const def = titanRoomById(m.room);
          if (!def) return deliver({ t: 'error', code: 'room', message: 'Sala não encontrada.' });
          const room = this.rooms.get(def.id)!, r = room.join(m);
          if (r.id !== null) { id = r.id; roomId = room.id; this.links.set(`${room.id}:${id}`, deliver); }
          this.route(room, r.out, deliver);
          return;
        }
        const room = this.rooms.get(roomId!)!;
        this.route(room, room.handle(id, m), deliver);
      },
      close: () => {
        if (id === null || roomId === null) return;
        const room = this.rooms.get(roomId)!;
        this.links.delete(`${roomId}:${id}`);
        this.route(room, room.leave(id), deliver);
        id = null;
        queueMicrotask(() => t.onClose?.());
      },
    };
    return t;
  }

  /** Passa o tempo de todas as salas (o servidor real faz isso ~10×/s). */
  tick(dt: number): void {
    for (const room of this.rooms.values()) this.route(room, room.tick(dt), () => {});
  }

  private route(room: TitanRoom, out: TitanOutgoing[], reply: (m: TitanServerMessage) => void): void {
    for (const o of out) {
      if (o.to === 0) { reply(o.msg); continue; }
      for (const [k, send] of this.links) {
        const [code, idText] = k.split(':');
        if (Number(code) !== room.id) continue;
        const pid = Number(idText);
        if (o.to === 'all' || (typeof o.to === 'number' ? o.to === pid : o.to.except !== pid)) send(o.msg);
      }
    }
  }
}
