import { makeRoomCode, normalizeRoomCode, parseClientMessage, type ServerMessage } from './protocol';
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
  readonly rooms = new Map<string, Room>();

  constructor(private readonly rand: () => number = Math.random) {}

  connect(): Transport {
    let roomCode: string | null = null;
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
          let room: Room | undefined;
          if (m.room !== undefined) {
            const code = normalizeRoomCode(m.room);
            room = code ? this.rooms.get(code) : undefined;
            if (!room) return deliver({ t: 'error', code: 'room', message: 'Sala não encontrada: confira o código de convite.' });
          } else {
            let code = makeRoomCode(this.rand);
            while (this.rooms.has(code)) code = makeRoomCode(this.rand);
            room = new Room(code, Math.floor(this.rand() * 2 ** 31));
          }
          const r = room.join(m);
          if (r.id !== null && !this.rooms.has(room.code)) this.rooms.set(room.code, room);
          if (r.id !== null) { id = r.id; roomCode = room.code; this.links.set(this.key(room.code, id), t); }
          this.route(room, r.id ?? -1, r.out, deliver);
          return;
        }
        const room = this.rooms.get(roomCode!)!;
        this.route(room, id, room.handle(id, m), deliver);
      },
      close: () => {
        if (id === null || roomCode === null) return;
        const room = this.rooms.get(roomCode)!;
        this.links.delete(this.key(roomCode, id));
        this.route(room, id, room.leave(id), deliver);
        if (room.size === 0) this.rooms.delete(roomCode);
        id = null;
        queueMicrotask(() => t.onClose?.());
      },
    };
    return t;
  }

  private readonly links = new Map<string, { deliverTo: (m: ServerMessage) => void }>();
  private key(code: string, id: number): string {
    return `${code}:${id}`;
  }

  private route(room: Room, self: number, out: Outgoing[], reply: (m: ServerMessage) => void): void {
    for (const o of out) {
      if (o.to === 0) { reply(o.msg); continue; } // erro antes de entrar: só para quem pediu
      for (const [k, link] of this.links) {
        const [code, idText] = k.split(':');
        if (code !== room.code) continue;
        const pid = Number(idText);
        const ok = o.to === 'all' || (typeof o.to === 'number' ? o.to === pid : o.to.except !== pid);
        if (ok) link.deliverTo(o.msg);
      }
    }
    void self;
  }
}
