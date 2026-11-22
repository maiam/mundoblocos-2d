import { breakOrCollect, collectNearby, placeFromSlot, useBed, useDoor, type ActionResult } from '../../titan/actions';
import { stepDrops } from '../../titan/drops';
import { TitanGenerator } from '../../titan/generator';
import { Inventory } from '../../titan/inventory';
import { EYE_HEIGHT, newBody } from '../../titan/physics';
import type { ChunkRecord, TitanHeader } from '../../titan/save';
import { fresh, generatorFor, headerOf, resume, tickCrops, tickFurnaces, tickRegrow, type TitanSession } from '../../titan/session';
import { advanceDay } from '../../titan/sky';
import { newVitals, vitalsFromData, vitalsToData, type PlayerVitals, type VitalsData } from '../../titan/vitals';
import { isBed, isDoor } from '../../titan/voxel';
import { sanitizeTitanName, TITAN_MAX_PLAYERS, TITAN_PROTOCOL_VERSION, type Edit, type TitanClientMessage, type TitanPlayerInfo, type TitanServerMessage } from './protocol';

/**
 * Sala do Titã (ADR 0104): mundo cooperativo de sobrevivência, **autoritativo**. Pura (sem DOM): roda o mesmo `TitanVolume` e as mesmas regras de `titan/actions.ts` que o jogo solo.
 * Cada jogador ganha uma **visão** da sessão (`playerView`): o mundo (volume, baús, braseiros, plantas, itens soltos, relógio) é compartilhado; corpo, bolsa, vida e ponto de retorno são dele.
 * Mesma forma de uso da `Room` do mundo principal: `join/leave/handle/tick/snapshot/restore`, devolvendo mensagens com destinatário.
 */
export type TitanOutgoing = { to: number | 'all' | { except: number }; msg: TitanServerMessage };
/** Alcance de uma ação de mundo, do olho do jogador ao centro da célula (m); mais folgado que o do jogo para absorver o atraso de rede. */
export const TITAN_ROOM_REACH = 8;
/** Intervalo da posição dos jogadores (s) e da hora (s). */
export const TITAN_PLAYERS_EVERY = 0.1, TITAN_TIME_EVERY = 30;
export const TITAN_SNAPSHOT_VERSION = 1;

interface Player { id: number; name: string; view: TitanSession; moved: boolean }
interface SavedPlayer { x: number; y: number; z: number; yaw: number; pitch: number; sel: number; bag: unknown; vitals: VitalsData; spawn: { x: number; y: number; z: number } | null; known: string[] }
export interface TitanRoomSnapshot { v: number; header: TitanHeader; chunks: ChunkRecord[]; players: Record<string, SavedPlayer> }

/**
 * Visão de um jogador: herda o mundo da sessão da sala e tem corpo, bolsa, vida, seleção, ponto de retorno e receitas próprios. Os contadores que as ações incrementam (`time`, `days`,
 * `dropsRev`, `metaRev`, `collectedRev`) escrevem direto no mundo (uma ação de uma visão nunca cria cópia divergente do relógio ou das revisões).
 */
export function playerView(world: TitanSession, own: Partial<TitanSession>): TitanSession {
  const v = Object.create(world) as TitanSession;
  Object.assign(v, own);
  for (const k of ['time', 'days', 'dropsRev', 'metaRev', 'collectedRev'] as const) {
    Object.defineProperty(v, k, { get: () => world[k], set: (x: number) => { world[k] = x; }, enumerable: true, configurable: true });
  }
  return v;
}

export class TitanRoom {
  world: TitanSession;
  private readonly players = new Map<number, Player>();
  private readonly saved = new Map<string, SavedPlayer>();
  private nextId = 1;
  private pending: Edit[] = [];
  private lastDropsRev = 0;
  private sincePlayers = 0;
  private sinceTime = 0;

  constructor(readonly id: number, readonly name: string, readonly seed: number, private readonly rand: () => number = Math.random) {
    this.world = fresh(new TitanGenerator(seed));
    this.hook();
  }

  private hook(): void {
    this.world.volume.onSet = (x, y, z, id) => { this.pending.push([x, y, z, id]); };
    this.lastDropsRev = this.world.dropsRev;
  }

  get playerCount(): number { return this.players.size; }
  playerNames(): string[] { return [...this.players.values()].map((p) => p.name); }
  viewOf(id: number): TitanSession | undefined { return this.players.get(id)?.view; }

  private info(p: Player): TitanPlayerInfo { const b = p.view.body; return { id: p.id, name: p.name, x: b.x, y: b.y, z: b.z, yaw: p.view.yaw, pitch: p.view.pitch, sel: p.view.selected }; }

  join(hello: Extract<TitanClientMessage, { t: 'hello' }>): { id: number | null; out: TitanOutgoing[] } {
    const err = (code: 'version' | 'full' | 'name', message: string): { id: null; out: TitanOutgoing[] } => ({ id: null, out: [{ to: 0 as never, msg: { t: 'error', code, message } }] });
    if (hello.v !== TITAN_PROTOCOL_VERSION) return err('version', 'Versão do jogo diferente da do servidor.');
    const name = sanitizeTitanName(hello.name);
    if (!name) return err('name', 'Nome inválido.');
    if (this.players.size >= TITAN_MAX_PLAYERS) return err('full', 'Sala cheia.');
    if ([...this.players.values()].some((p) => p.name.toLowerCase() === name.toLowerCase())) return err('name', 'Já há alguém com esse nome na sala.');
    const sv = this.saved.get(name.toLowerCase()), a = this.world.volume.gen.arrival;
    const inventory = sv ? Inventory.fromData(sv.bag) : Inventory.starting();
    const view = playerView(this.world, {
      body: newBody(sv?.x ?? a.x, sv?.y ?? a.y, sv?.z ?? a.z), yaw: sv?.yaw ?? a.yaw, pitch: sv?.pitch ?? -0.12, selected: sv?.sel ?? 0, inventory,
      vitals: sv ? vitalsFromData(sv.vitals) : newVitals(), spawn: sv?.spawn ?? null, known: new Set(sv?.known ?? []),
    });
    const p: Player = { id: this.nextId++, name, view, moved: false };
    this.players.set(p.id, p);
    const header = headerOf(this.world);
    const chunks: ChunkRecord[] = this.world.volume.dirtyChunks().map(({ cx, cz, edits }) => ({ cx, cz, edits }));
    const me = this.info(p);
    return { id: p.id, out: [
      { to: p.id, msg: { t: 'welcome', id: p.id, header, chunks, players: [...this.players.values()].filter((o) => o !== p).map((o) => this.info(o)), you: { x: me.x, y: me.y, z: me.z, yaw: me.yaw, pitch: me.pitch, sel: me.sel, bag: inventory.toData(), vitals: vitalsToData(view.vitals as PlayerVitals), spawn: view.spawn } } },
      { to: { except: p.id }, msg: { t: 'joined', p: me } },
    ] };
  }

  leave(id: number): TitanOutgoing[] {
    const p = this.players.get(id);
    if (!p) return [];
    this.keep(p);
    this.players.delete(id);
    return [{ to: 'all', msg: { t: 'left', id } }];
  }

  private keep(p: Player): void {
    const b = p.view.body;
    this.saved.set(p.name.toLowerCase(), { x: b.x, y: b.y, z: b.z, yaw: p.view.yaw, pitch: p.view.pitch, sel: p.view.selected, bag: p.view.inventory.toData(), vitals: vitalsToData(p.view.vitals), spawn: p.view.spawn, known: [...p.view.known] });
  }

  handle(id: number, m: TitanClientMessage): TitanOutgoing[] {
    const p = this.players.get(id);
    if (!p) return [];
    switch (m.t) {
      case 'state': {
        const b = p.view.body, s = m.s;
        if (!this.world.volume.gen.inRegion(Math.floor(s.x), Math.floor(s.z))) return [];
        b.x = s.x; b.y = s.y; b.z = s.z; p.view.yaw = s.yaw; p.view.pitch = s.pitch; p.view.selected = s.sel; p.moved = true;
        return [];
      }
      case 'bag': {
        p.view.inventory = Inventory.fromData(m.bag);
        return [];
      }
      case 'act': return this.act(p, m.seq, m.a);
      default: return [];
    }
  }

  private act(p: Player, seq: number, a: Extract<TitanClientMessage, { t: 'act' }>['a']): TitanOutgoing[] {
    const v = p.view, b = v.body;
    const cell = a.k === 'use' ? a : a.hit;
    const reach = Math.hypot(cell.x + 0.5 - b.x, cell.y + 0.5 - (b.y + EYE_HEIGHT), cell.z + 0.5 - b.z);
    let r: ActionResult = { ok: false, msg: 'Longe demais' };
    if (reach <= TITAN_ROOM_REACH) {
      if (a.k === 'place') r = placeFromSlot(v, a.hit, a.slot);
      else if (a.k === 'break') r = breakOrCollect(v, a.hit);
      else {
        const id = this.world.volume.get(a.x, a.y, a.z);
        r = isDoor(id) ? useDoor(v, a.x, a.y, a.z) : isBed(id) ? useBed(v, a.x, a.y, a.z) : { ok: false };
      }
    }
    return [{ to: p.id, msg: { t: 'applied', seq, ok: r.ok, ...(r.msg ? { msg: r.msg } : {}), ...(r.open !== undefined ? { open: r.open } : {}), bag: v.inventory.toData() } }, ...this.flush()];
  }

  /** Repassa o que mudou no mundo (células editadas e itens soltos) a todos os jogadores. */
  private flush(): TitanOutgoing[] {
    const out: TitanOutgoing[] = [];
    if (this.pending.length) { out.push({ to: 'all', msg: { t: 'edits', cells: this.pending } }); this.pending = []; }
    if (this.world.dropsRev !== this.lastDropsRev) { this.lastDropsRev = this.world.dropsRev; out.push({ to: 'all', msg: { t: 'drops', drops: [...this.world.drops.values()] } }); }
    return out;
  }

  tick(dt: number): TitanOutgoing[] {
    const w = this.world, out: TitanOutgoing[] = [];
    const before = w.time;
    w.time = advanceDay(w.time, dt);
    if (w.time < before) w.days++;
    tickFurnaces(w, dt);
    tickRegrow(w, dt);
    stepDrops(w, dt);
    const n = Math.max(1, this.players.size);
    for (const p of this.players.values()) {
      const b = p.view.body;
      tickCrops(w, dt / n, this.rand, { x: b.x, z: b.z });
      const c = collectNearby(p.view, b.x, b.y, b.z, dt);
      if (c.collected) out.push({ to: p.id, msg: { t: 'bag', bag: p.view.inventory.toData() } });
    }
    this.sincePlayers += dt; this.sinceTime += dt;
    if (this.sincePlayers >= TITAN_PLAYERS_EVERY && this.players.size) {
      this.sincePlayers = 0;
      const moved = [...this.players.values()].filter((p) => p.moved);
      for (const p of moved) p.moved = false;
      if (moved.length) out.push({ to: 'all', msg: { t: 'players', list: moved.map((p) => this.info(p)) } });
    }
    if (this.sinceTime >= TITAN_TIME_EVERY) { this.sinceTime = 0; out.push({ to: 'all', msg: { t: 'time', time: w.time, days: w.days } }); }
    return [...out, ...this.flush()];
  }

  /** Estado para gravar: cabeçalho do mundo (mesmo formato do save local), chunks editados e os jogadores por nome (quem está na sala entra com o estado atual). */
  snapshot(): TitanRoomSnapshot {
    for (const p of this.players.values()) this.keep(p);
    return { v: TITAN_SNAPSHOT_VERSION, header: headerOf(this.world), chunks: this.world.volume.dirtyChunks().map(({ cx, cz, edits }) => ({ cx, cz, edits })), players: Object.fromEntries(this.saved) };
  }

  /** Restaura uma sala vazia a partir de um `snapshot`; devolve `false` (sem mudar nada) se a seed ou o gerador não batem. */
  restore(snap: TitanRoomSnapshot): boolean {
    if (!snap || snap.v !== TITAN_SNAPSHOT_VERSION || !snap.header || snap.header.seed !== this.seed || this.players.size) return false;
    const gen = generatorFor(snap.header.seed, snap.header.generatorVersion);
    if (!gen) return false;
    this.world = resume(gen, { header: snap.header, chunks: snap.chunks });
    this.saved.clear();
    for (const [k, v] of Object.entries(snap.players ?? {})) this.saved.set(k, v);
    this.pending = [];
    this.hook();
    return true;
  }
}
