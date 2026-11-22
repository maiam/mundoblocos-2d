import { breakOrCollect, chestAt, chestMoveIn, chestTakeOut, collectNearby, dieAndRespawn, furnaceMoveIn, furnaceTakeOut, placeFromSlot, useBed, useDoor, type ActionResult } from '../../titan/actions';
import { ATTACK_REACH, ATTACK_COOLDOWN_S, attackCreature, tickRespawn } from '../../titan/combat';
import { chestToData } from '../../titan/chest';
import { stepFarejador, type Farejador } from '../../titan/creature';
import { furnaceToData } from '../../titan/furnace';
import { stepDrops } from '../../titan/drops';
import { TitanGenerator } from '../../titan/generator';
import { Inventory } from '../../titan/inventory';
import { EYE_HEIGHT, newBody } from '../../titan/physics';
import type { ChunkRecord, TitanHeader } from '../../titan/save';
import { fresh, generatorFor, headerOf, resume, tickCrops, tickFurnaces, tickRegrow, type TitanSession } from '../../titan/session';
import { advanceDay, isNightTime } from '../../titan/sky';
import { isDead, newVitals, vitalsFromData, vitalsToData, type PlayerVitals, type VitalsData } from '../../titan/vitals';
import { isBed, isDoor } from '../../titan/voxel';
import { sanitizeTitanName, TITAN_MAX_PLAYERS, TITAN_PROTOCOL_VERSION, type Edit, type TitanClientMessage, type TitanPlayerInfo, type TitanServerMessage, type WireCreature } from './protocol';

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
/** Farejadores (ADR 0074): só os a até `SIM_RADIUS` m de algum jogador (ou em ação) são simulados; os a até `SHOW_RADIUS` vão aos aparelhos (10×/s). */
export const TITAN_SIM_RADIUS = 56, TITAN_SHOW_RADIUS = 64, TITAN_CREATURES_EVERY = 0.1, TITAN_FURNACES_EVERY = 1;
/** Distância máxima do olho ao centro do animal para um golpe valer (alcance do jogo + folga de rede). */
export const TITAN_STRIKE_REACH = ATTACK_REACH + 2;

interface Player { id: number; name: string; view: TitanSession; moved: boolean; /** Última vez (relógio da sala) que golpeou um animal. */ struckAt: number; /** Cama onde deitou esperando a noite passar (`null` = acordado). */ bed: { x: number; y: number; z: number } | null }
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
  private sinceCreatures = 0;
  private sinceFurnaces = 0;
  private clock = 0;
  private timeDirty = false;

  constructor(readonly id: number, readonly name: string, readonly seed: number, private readonly rand: () => number = Math.random) {
    this.world = fresh(new TitanGenerator(seed));
    this.hook();
  }

  private hook(): void {
    this.world.volume.onSet = (x, y, z, id) => { this.pending.push([x, y, z, id]); };
    this.lastDropsRev = this.world.dropsRev;
  }

  get playerCount(): number { return this.players.size; }
  /** Quantos jogadores há (o servidor lê `room.size`, como na `Room` do mundo principal). */
  get size(): number { return this.players.size; }
  /** Há algo novo para gravar em disco (o servidor grava quando `dirty`; `snapshot()` limpa). */
  dirty = false;
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
    const p: Player = { id: this.nextId++, name, view, moved: false, struckAt: -1e9, bed: null };
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
    this.dirty = true; // a bolsa e a posição de quem saiu vão para o arquivo
    this.players.delete(id);
    const rest = [...this.players.values()]; // quem ficou já estava todo na cama: a noite passa
    if (rest.length && rest.every((o) => o.bed) && isNightTime(this.world.time)) { const o = rest[0]; useBed(o.view, o.bed!.x, o.bed!.y, o.bed!.z, true); for (const q of rest) q.bed = null; this.timeDirty = true; }
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
        if (m.v) { const q = p.view.vitals, c = (x: number, max: number): number => Math.min(max, Math.max(0, x)); q.health = c(m.v.health, q.maxHealth); q.hunger = c(m.v.hunger, q.maxHunger); q.saturation = Math.min(q.hunger, c(m.v.saturation, q.maxHunger)); q.air = c(m.v.air, q.maxAir); } // vida, fome e ar vêm do aparelho (que simula o corpo); vida 0 vale (morreu)
        if (p.bed && Math.hypot(b.x - (p.bed.x + 0.5), b.z - (p.bed.z + 0.5)) > 3) p.bed = null; // saiu da cama: não conta mais para a noite
        return [];
      }
      case 'bag': {
        p.view.inventory = Inventory.fromData(m.bag);
        this.dirty = true;
        return [];
      }
      case 'act': return this.act(p, m.seq, m.a);
      default: return [];
    }
  }

  private act(p: Player, seq: number, a: Extract<TitanClientMessage, { t: 'act' }>['a']): TitanOutgoing[] {
    const v = p.view, b = v.body, out: TitanOutgoing[] = [];
    const cell = 'hit' in a ? a.hit : 'x' in a ? a : null;
    let r: ActionResult = { ok: false, msg: 'Longe demais' };
    const near = !cell || Math.hypot(cell.x + 0.5 - b.x, cell.y + 0.5 - (b.y + EYE_HEIGHT), cell.z + 0.5 - b.z) <= TITAN_ROOM_REACH;
    if (near) {
      r = { ok: false };
      switch (a.k) {
        case 'place': r = placeFromSlot(v, a.hit, a.slot); break;
        case 'break': r = breakOrCollect(v, a.hit); break;
        case 'use': r = this.useCell(p, a.x, a.y, a.z); break;
        case 'chest': {
          r = a.op === 'in' ? chestMoveIn(v, a.x, a.y, a.z, a.slot) : chestTakeOut(v, a.x, a.y, a.z, a.i);
          const c = chestAt(v, a.x, a.y, a.z);
          if (c) out.push({ to: 'all', msg: { t: 'chest', key: `${a.x},${a.y},${a.z}`, data: chestToData(c) } });
          break;
        }
        case 'furnace': {
          r = a.op === 'in' ? furnaceMoveIn(v, a.x, a.y, a.z, a.kind, a.slot) : furnaceTakeOut(v, a.x, a.y, a.z, a.kind);
          out.push(this.furnacesMsg());
          break;
        }
        case 'strike': r = this.strike(p, a.id); break;
        case 'die': r = this.die(p, out); break;
      }
    }
    this.dirty = true;
    return [{ to: p.id, msg: { t: 'applied', seq, ok: r.ok, ...(r.msg ? { msg: r.msg } : {}), ...(r.open !== undefined ? { open: r.open } : {}), bag: v.inventory.toData() } }, ...out, ...this.flush()];
  }

  /** Porta abre/fecha; cama marca o ponto de retorno e, à noite, a noite só passa quando **todos** da sala estão na cama (o relógio é de todos). */
  private useCell(p: Player, x: number, y: number, z: number): ActionResult {
    const id = this.world.volume.get(x, y, z);
    if (isDoor(id)) return useDoor(p.view, x, y, z);
    if (!isBed(id)) return { ok: false };
    const r = useBed(p.view, x, y, z, false);
    if (!isNightTime(this.world.time)) return r;
    p.bed = { x, y, z };
    const asleep = [...this.players.values()].filter((o) => o.bed).length, total = this.players.size;
    if (asleep < total) return { ok: true, msg: `Na cama: ${asleep} de ${total}. A noite passa quando todos dormirem.` };
    const w = useBed(p.view, x, y, z, true); // todos deitados: o relógio vai ao amanhecer
    for (const o of this.players.values()) o.bed = null;
    this.timeDirty = true;
    return { ok: true, msg: w.msg };
  }

  /** Golpe num Farejador pelo id: alcance, pausa entre golpes (0,6 s por jogador) e as regras de `titan/combat.ts`. */
  private strike(p: Player, id: string): ActionResult {
    const idx = this.world.creatures.findIndex((c) => c.id === id), f = this.world.creatures[idx], b = p.view.body;
    if (!f) return { ok: false };
    if (Math.hypot(f.body.x - b.x, f.body.y - (b.y + EYE_HEIGHT), f.body.z - b.z) > TITAN_STRIKE_REACH) return { ok: false, msg: 'Longe demais' };
    if (this.clock - p.struckAt < ATTACK_COOLDOWN_S - 0.05) return { ok: false };
    p.struckAt = this.clock;
    const r = attackCreature(p.view, idx);
    this.sinceCreatures = TITAN_CREATURES_EVERY; // o próximo tick manda a lista nova
    return { ok: r.ok, ...(r.msg ? { msg: r.msg } : {}) };
  }

  /** Morte: só vale com a vida zerada no último `state`; solta as pilhas, renasce e manda o renascer. */
  private die(p: Player, out: TitanOutgoing[]): ActionResult {
    if (!isDead(p.view.vitals)) return { ok: false, msg: 'Ainda vivo' };
    dieAndRespawn(p.view);
    p.bed = null;
    const b = p.view.body;
    out.push({ to: p.id, msg: { t: 'respawn', x: b.x, y: b.y, z: b.z, yaw: p.view.yaw, vitals: vitalsToData(p.view.vitals) } });
    return { ok: true };
  }

  private furnacesMsg(): TitanOutgoing { return { to: 'all', msg: { t: 'furnaces', data: Object.fromEntries([...this.world.furnaces].map(([k, f]) => [k, furnaceToData(f)])) } }; }

  private wire(f: Farejador): WireCreature {
    const r = (n: number): number => Math.round(n * 1000) / 1000;
    return { id: f.id, kind: f.kind, x: r(f.body.x), y: r(f.body.y), z: r(f.body.z), vx: r(f.body.vx), vz: r(f.body.vz), yaw: r(f.yaw), phase: f.phase, t: r(f.t), hp: f.hp, hurt: r(f.hurt), clock: r(f.clock), aggro: r(f.aggro) };
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
    this.clock += dt;
    if (tickFurnaces(w, dt)) this.dirty = true;
    if (tickRegrow(w, dt)) this.dirty = true;
    stepDrops(w, dt);
    const n = Math.max(1, this.players.size);
    for (const p of this.players.values()) {
      const b = p.view.body;
      if (tickCrops(w, dt / n, this.rand, { x: b.x, z: b.z })) this.dirty = true;
      const c = collectNearby(p.view, b.x, b.y, b.z, dt);
      if (c.collected) this.dirty = true;
      if (c.collected) out.push({ to: p.id, msg: { t: 'bag', bag: p.view.inventory.toData() } });
    }
    // Farejadores (ADR 0061/0074): simulam perto de algum jogador; quem é acertado recebe `hurt`
    tickRespawn(w, dt);
    const list = [...this.players.values()];
    if (list.length) {
      for (const f of w.creatures) {
        let near: Player | null = null, nd = Infinity;
        for (const p of list) { const d = Math.hypot(f.body.x - p.view.body.x, f.body.z - p.view.body.z); if (d < nd) { nd = d; near = p; } }
        if (!near || (f.phase === 'wander' && nd > TITAN_SIM_RADIUS)) continue;
        const ev = stepFarejador(f, w.volume, { x: near.view.body.x, y: near.view.body.y, z: near.view.body.z }, dt);
        if (ev.hit) out.push({ to: near.id, msg: { t: 'hurt', damage: ev.damage, kind: f.kind } });
      }
    }
    this.sinceCreatures += dt; this.sinceFurnaces += dt;
    if (this.sinceCreatures >= TITAN_CREATURES_EVERY && list.length) {
      this.sinceCreatures = 0;
      const shown = w.creatures.filter((f) => list.some((p) => Math.hypot(f.body.x - p.view.body.x, f.body.z - p.view.body.z) <= TITAN_SHOW_RADIUS));
      out.push({ to: 'all', msg: { t: 'creatures', list: shown.map((f) => this.wire(f)) } });
    }
    if (this.sinceFurnaces >= TITAN_FURNACES_EVERY && w.furnaces.size) { this.sinceFurnaces = 0; out.push(this.furnacesMsg()); }
    if (this.timeDirty) { this.timeDirty = false; out.push({ to: 'all', msg: { t: 'time', time: w.time, days: w.days } }); }
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
    this.dirty = false;
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
    this.dirty = false;
    return true;
  }
}
