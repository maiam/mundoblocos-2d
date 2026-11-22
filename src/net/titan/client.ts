import { Inventory } from '../../titan/inventory';
import { newBody } from '../../titan/physics';
import { generatorFor, resume, type TitanSession } from '../../titan/session';
import { vitalsFromData } from '../../titan/vitals';
import type { TitanTransport } from './loopback';
import { TITAN_PROTOCOL_VERSION, type TitanAction, type TitanPlayerInfo, type TitanServerMessage, type WireHit } from './protocol';

/**
 * Lado do aparelho numa sala do Titã (ADR 0104, fatia B). Sem DOM: recebe um `TitanTransport` (loopback nos testes, WebSocket no navegador).
 * A sessão local nasce do `welcome` (o mundo da sala como está) e depois só **espelha** a sala: edições (`edits`), itens soltos (`drops`), hora (`time`), bolsa (`bag`/`applied`) e jogadores.
 * Ação de mundo não roda aqui: vai em `act` e só vale quando a sala devolve `applied` (o aparelho não prevê o resultado).
 */
export interface ApplyResult { ok: boolean; msg?: string; open?: boolean }
export interface TitanClientEvents {
  /** O mundo mudou (células editadas ou itens soltos): o desenho refaz o que depende disso. */
  onWorld?: () => void;
  /** A bolsa foi trocada pela da sala. */
  onBag?: () => void;
  /** Lista de jogadores remotos mudou. */
  onPlayers?: () => void;
  /** Conexão fechada ou erro da sala. */
  onClose?: (reason: string) => void;
}

export class TitanClient {
  session!: TitanSession;
  id = 0;
  /** Jogadores remotos (sem o próprio), por id. */
  readonly remotes = new Map<number, TitanPlayerInfo>();
  events: TitanClientEvents = {};
  private seq = 0;
  private readonly waiting = new Map<number, (r: ApplyResult) => void>();
  private welcome: ((s: TitanSession) => void) | null = null;
  private failed: ((reason: string) => void) | null = null;
  /** Revisão da bolsa da sala já recebida: só se manda `bag` quando a interface mexeu depois disso. */
  private syncedRev = 0;

  constructor(private readonly transport: TitanTransport) {
    transport.onMessage = (m) => this.receive(m);
    transport.onClose = () => { this.events.onClose?.('Conexão encerrada'); this.failed?.('Conexão encerrada'); };
  }

  /** Entra na sala e resolve com a sessão local (mundo da sala). Rejeita com a mensagem de erro da sala. */
  connect(name: string, room: number): Promise<TitanSession> {
    return new Promise((resolve, reject) => {
      this.welcome = resolve; this.failed = reject;
      this.transport.send(JSON.stringify({ t: 'hello', v: TITAN_PROTOCOL_VERSION, name, room }));
    });
  }

  close(): void { this.transport.close(); }

  sendState(): void {
    const s = this.session, b = s.body;
    this.transport.send(JSON.stringify({ t: 'state', s: { x: b.x, y: b.y, z: b.z, yaw: s.yaw, pitch: s.pitch, sel: s.selected } }));
  }

  /** Manda a ação e espera a resposta da sala. */
  act(a: TitanAction): Promise<ApplyResult> {
    return new Promise((resolve) => { const seq = ++this.seq; this.waiting.set(seq, resolve); this.transport.send(JSON.stringify({ t: 'act', seq, a })); });
  }
  place(hit: WireHit, slot: number): Promise<ApplyResult> { return this.act({ k: 'place', hit, slot }); }
  breakAt(hit: WireHit): Promise<ApplyResult> { return this.act({ k: 'break', hit }); }
  use(x: number, y: number, z: number): Promise<ApplyResult> { return this.act({ k: 'use', x, y, z }); }

  /** Chamada a cada quadro/segundo: se a interface mexeu na bolsa desde a última da sala, manda a cópia. */
  syncBag(): boolean {
    const inv = this.session.inventory;
    if (inv.rev === this.syncedRev) return false;
    this.syncedRev = inv.rev;
    this.transport.send(JSON.stringify({ t: 'bag', bag: inv.toData() }));
    return true;
  }

  private setBag(data: unknown): void {
    const inv = this.session.inventory, next = Inventory.fromData(data), rev = inv.rev + 1;
    Object.assign(inv, next);
    inv.rev = rev; this.syncedRev = rev; // veio da sala: não é uma mexida da interface para devolver
    this.events.onBag?.();
  }

  private receive(m: TitanServerMessage): void {
    switch (m.t) {
      case 'welcome': {
        const gen = generatorFor(m.header.seed, m.header.generatorVersion);
        if (!gen) { this.failed?.('Esta versão do jogo não tem o gerador da sala.'); return; }
        const s = resume(gen, { header: m.header, chunks: m.chunks });
        s.body = newBody(m.you.x, m.you.y, m.you.z); s.yaw = m.you.yaw; s.pitch = m.you.pitch; s.selected = m.you.sel;
        s.vitals = vitalsFromData(m.you.vitals); s.spawn = m.you.spawn;
        Object.assign(s.inventory, Inventory.fromData(m.you.bag));
        s.creatures = []; s.respawn.clear(); // os bichos da sala chegam na fatia C; o aparelho não os simula
        this.session = s; this.id = m.id; this.syncedRev = s.inventory.rev;
        for (const p of m.players) this.remotes.set(p.id, p);
        this.welcome?.(s); this.welcome = null; this.failed = null;
        return;
      }
      case 'error': this.failed?.(m.message); this.events.onClose?.(m.message); return;
      case 'joined': this.remotes.set(m.p.id, m.p); this.events.onPlayers?.(); return;
      case 'left': this.remotes.delete(m.id); this.events.onPlayers?.(); return;
      case 'players': for (const p of m.list) if (p.id !== this.id) this.remotes.set(p.id, p); this.events.onPlayers?.(); return;
      case 'edits': {
        const v = this.session?.volume;
        if (!v) return;
        for (const [x, y, z, id] of m.cells) v.set(x, y, z, id);
        this.events.onWorld?.();
        return;
      }
      case 'drops': {
        const s = this.session;
        if (!s) return;
        s.drops.clear();
        for (const d of m.drops) { s.drops.set(d.id, d); if (!s.dropFx.has(d.id)) s.dropFx.set(d.id, { delay: 0, age: 0 }); }
        for (const id of [...s.dropFx.keys()]) if (!s.drops.has(id)) s.dropFx.delete(id);
        s.dropsRev++;
        this.events.onWorld?.();
        return;
      }
      case 'time': if (this.session) { this.session.time = m.time; this.session.days = m.days; } return;
      case 'bag': if (this.session) this.setBag(m.bag); return;
      case 'applied': {
        if (this.session) this.setBag(m.bag);
        const done = this.waiting.get(m.seq);
        this.waiting.delete(m.seq);
        done?.({ ok: m.ok, ...(m.msg ? { msg: m.msg } : {}), ...(m.open !== undefined ? { open: m.open } : {}) });
        return;
      }
    }
  }
}
