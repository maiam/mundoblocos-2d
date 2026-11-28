import type { Drop, ChunkRecord, TitanHeader } from '../../titan/save';
import type { InventoryData } from '../../titan/inventory';
import type { VitalsData } from '../../titan/vitals';
import type { VoxelWorld } from '../../titan/terrain';

/**
 * Protocolo das salas do Titã (ADR 0104): paralelo ao do mundo principal (`net/protocol.ts`), porque o Titã tem motor próprio (`TitanVolume`).
 * Compartilhado com o servidor (`build:net`): sem DOM. Mudou uma mensagem de forma incompatível → suba `TITAN_PROTOCOL_VERSION` e o servidor junto.
 */
export const TITAN_PROTOCOL_VERSION = 8; // 8 (ADR 0149): a Costa v102 (casas e celeiro) — o cliente antigo não conhece o gerador 102; 7 (ADR 0147): o Grunho (mob inimigo da sala 102): mensagem `grunhos` (os próximos de cada jogador), ação `strikeGrunho`, `hurt` com `kind: 'grunho'`, e a Costa v101 (acampamentos) — cliente e servidor juntos; 6 (ADR 0142): a sala 102 vira a Aldeia da Costa (gerador `COSTA_GENERATOR_VERSION` 100 no `welcome`): o cliente antigo não a abre; 5 (ADR 0138 C): // 4 (ADR 0138, entrega B): fauna de fazenda do Orvalis pela sala (mensagem `fauna`, ações `strikeFauna` e `feedFauna`); 5 (entrega C): pesca (`bobber`) e botes (`boats`, `boat`, ações `mountBoat` e `dismountBoat`)
export const TITAN_MAX_PLAYERS = 10;
export const TITAN_NAME_MIN = 2, TITAN_NAME_MAX = 16;
/** Salas fixas do Titã (ids acima dos do mundo principal, que usam 1…). Cooperativas de sobrevivência: vida, fome, ar e morte valem. */
export const TITAN_ROOMS: ReadonlyArray<{ id: number; name: string; seed: number; /** Mundo da sala: decide o gerador, os itens e as regras (ADR 0138). */ world: VoxelWorld; /** Terreno feito à mão em vez do sorteado pela seed (ADR 0142): só `'costa'`. */ terrain?: 'costa' }> = [
  { id: 101, name: 'Titã 1', seed: 20261122, world: 'titan' },
  { id: 102, name: 'Orvalis 1', seed: 128064, world: 'orvalis', terrain: 'costa' }, // a Aldeia da Costa (ADR 0142); antes, seed 20261127 com relevo por ruído // Orvalis em sala (ADR 0138): o mesmo motor, o gerador e as regras do Orvalis
];
/** Salas de um mundo. */
export const titanRoomsOf = (world: VoxelWorld): typeof TITAN_ROOMS => TITAN_ROOMS.filter((r) => r.world === world);
export const titanRoomById = (id: number): (typeof TITAN_ROOMS)[number] | undefined => TITAN_ROOMS.find((r) => r.id === id);

/** Alvo de uma ação: a célula, a face e, se for o caso, o ponto de altura (laje) ou o fragmento apontado. */
export interface WireHit { x: number; y: number; z: number; nx: number; ny: number; nz: number; hy?: number; item?: string }
/** Ações de mundo do jogador: a sala as valida (alcance, regras do `actions.ts`) e responde `applied`. */
export type TitanAction =
  | { k: 'place'; hit: WireHit; slot: number }
  | { k: 'break'; hit: WireHit }
  | { k: 'use'; x: number; y: number; z: number }
  /** Baú (ADR 0089): guardar a pilha `slot` da bolsa ou tirar o espaço `i` do baú. */
  | { k: 'chest'; x: number; y: number; z: number; op: 'in'; slot: number }
  | { k: 'chest'; x: number; y: number; z: number; op: 'out'; i: number }
  /** Braseiro (ADR 0068): levar a pilha `slot` da bolsa à entrada/combustível ou tirar o que há num espaço. */
  | { k: 'furnace'; x: number; y: number; z: number; op: 'in'; kind: 'input' | 'fuel'; slot: number }
  | { k: 'furnace'; x: number; y: number; z: number; op: 'out'; kind: 'input' | 'fuel' | 'output' }
  /** Golpe no Farejador `id` com o item da mão (ADR 0069). */
  | { k: 'strike'; id: string }
  /** Fauna de fazenda do Orvalis (ADR 0138): golpe no animal `id` com o item da mão; ou alimentá-lo com a comida da mão (a sala escolhe pelo item selecionado). */
  | { k: 'strikeFauna'; id: string }
  | { k: 'strikeGrunho'; id: string }
  | { k: 'feedFauna'; id: string }
  /** Botes do Orvalis (ADR 0138, entrega C): embarcar no bote `id` (ao alcance e vazio) e desembarcar. */
  | { k: 'mountBoat'; id: string }
  | { k: 'dismountBoat' }
  /** Morte: a sala solta as pilhas onde o corpo está e devolve o renascer (vale com vida zerada no último `state`). */
  | { k: 'die' };

export interface TitanPlayerState { x: number; y: number; z: number; yaw: number; pitch: number; sel: number }
export interface TitanPlayerInfo extends TitanPlayerState { id: number; name: string }

export type TitanClientMessage =
  | { t: 'hello'; v: number; name: string; room: number }
  /** Posição e, opcionalmente, vida/fome/ar (o aparelho simula o corpo; a sala guarda e persiste). */
  | { t: 'state'; s: TitanPlayerState; v?: VitalsData }
  | { t: 'act'; seq: number; a: TitanAction }
  /** Reorganização da bolsa feita na interface (mover, fabricar): a sala guarda a cópia do aparelho. */
  | { t: 'bag'; bag: InventoryData }
  /** Quem pilota um bote manda a posição dele; a sala confere (só água, velocidade) e repassa a todos (ADR 0138, entrega C). */
  | { t: 'boat'; b: { x: number; z: number; r: number } };

export type Edit = [number, number, number, number];
/** Farejador na rede: o que o aparelho precisa para desenhar, animar e mirar. */
export interface WireCreature { id: string; kind: 'pequeno' | 'grande'; x: number; y: number; z: number; vx: number; vz: number; yaw: number; phase: 'wander' | 'charge' | 'stunned' | 'return'; t: number; hp: number; hurt: number; clock: number; aggro: number }
/** Bote na rede (ADR 0138, entrega C): `k` = madeira (0–2), `r` = giro, `d` = id do jogador que pilota (0 = vazio). */
export interface WireBoat { id: string; k: number; x: number; y: number; z: number; r: number; d: number }
/** Animal de fazenda na rede (ADR 0138): o que o aparelho precisa para desenhar, animar e mirar (`id` estável; `m` = anda; `l` = em amor; `b` = filhote; `hu` = segundos desde o último golpe; `c` = relógio da animação). */
export interface WireFauna { id: string; k: 'porco' | 'vaca' | 'ovelha' | 'galinha'; x: number; y: number; z: number; yaw: number; ph: 'wander' | 'panic'; b: 0 | 1; hp: number; l: 0 | 1; m: 0 | 1; hu: number; c: number }
/** Grunho na rede (ADR 0147): o que o aparelho precisa para desenhar, animar e mirar (`ph` = fase; `sw` = segundos desde o início do golpe, −1 sem golpe; `hu` = segundos desde o último golpe levado; `m` = anda; `c` = relógio da animação). Só os vivos vão. */
export interface WireGrunho { id: string; x: number; y: number; z: number; yaw: number; ph: 'wander' | 'chase' | 'return'; hp: number; sw: number; hu: number; m: 0 | 1; c: number }
/** Estado completo da sala para quem entra (o formato do cabeçalho do save local: o aparelho abre com `resume`). */
export interface TitanWelcome { t: 'welcome'; id: number; header: TitanHeader; chunks: ChunkRecord[]; players: TitanPlayerInfo[]; you: TitanPlayerState & { bag: InventoryData; vitals: VitalsData; spawn: { x: number; y: number; z: number } | null } }
export type TitanServerMessage =
  | TitanWelcome
  | { t: 'joined'; p: TitanPlayerInfo }
  | { t: 'left'; id: number }
  | { t: 'players'; list: TitanPlayerInfo[] }
  | { t: 'applied'; seq: number; ok: boolean; msg?: string; open?: boolean; bag: InventoryData }
  | { t: 'edits'; cells: Edit[] }
  /** Farejadores perto de algum jogador (estado de desenho e de mira). */
  | { t: 'creatures'; list: WireCreature[] }
  /** Fauna de fazenda perto de quem recebe (os 40 mais próximos a até 64 m; ADR 0138). */
  | { t: 'fauna'; list: WireFauna[] }
  /** Grunhos vivos perto de quem recebe (os 40 mais próximos a até 64 m; ADR 0147). */
  | { t: 'grunhos'; list: WireGrunho[] }
  /** Todos os botes da sala (a cada mudança, no máximo 10×/s; ADR 0138, entrega C). */
  | { t: 'boats'; list: WireBoat[] }
  /** A boia de pesca de quem recebe: lançada (`b`, `bite` = o peixe fisgou), recolhida (`null`); `e` = o evento que causou a mensagem (ADR 0138, entrega C). */
  | { t: 'bobber'; b: { x: number; y: number; z: number; bite: 0 | 1 } | null; e?: 'bite' | 'lost' }
  /** Levou um golpe de Farejador: o aparelho tira a vida. */
  | { t: 'hurt'; damage: number; kind: 'pequeno' | 'grande' | 'grunho' }
  /** Conteúdo novo de um baú (`x,y,z`) ou de todos os braseiros com estado. */
  | { t: 'chest'; key: string; data: unknown }
  | { t: 'furnaces'; data: Record<string, unknown> }
  /** Renascer depois da morte: posição nova e vida cheia. */
  | { t: 'respawn'; x: number; y: number; z: number; yaw: number; vitals: VitalsData }
  /** Bolsa nova (item coletado do chão ou devolvido por uma ação da sala). */
  | { t: 'bag'; bag: InventoryData }
  /** Relógio da sala e se chove (ADR 0118; o clima só existe no Orvalis). */
  | { t: 'time'; time: number; days: number; rain: boolean }
  | { t: 'drops'; drops: Drop[] }
  | { t: 'error'; code: 'bad' | 'version' | 'room' | 'full' | 'name'; message: string };

const num = (v: unknown, lim = 1e6): v is number => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= lim;
const int = (v: unknown, lim = 1e6): v is number => num(v, lim) && Number.isInteger(v);

export function sanitizeTitanName(text: unknown): string | null {
  if (typeof text !== 'string') return null;
  const t = text.trim().replace(/\s+/g, ' ');
  return t.length >= TITAN_NAME_MIN && t.length <= TITAN_NAME_MAX && /^[\p{L}\p{N} _.-]+$/u.test(t) ? t : null;
}

export function parseTitanState(v: unknown): TitanPlayerState | null {
  const s = v as Partial<TitanPlayerState> | null;
  if (!s || !num(s.x) || !num(s.y) || !num(s.z) || !num(s.yaw, 1e4) || !num(s.pitch, 10) || !int(s.sel, 8) || (s.sel as number) < 0) return null;
  return { x: s.x, y: s.y, z: s.z, yaw: s.yaw, pitch: s.pitch, sel: s.sel as number };
}

function parseHit(v: unknown): WireHit | null {
  const h = v as Partial<WireHit> | null;
  if (!h || !int(h.x) || !int(h.y, 1000) || !int(h.z) || !int(h.nx, 1) || !int(h.ny, 1) || !int(h.nz, 1)) return null;
  if (h.hy !== undefined && (!num(h.hy, 1) || h.hy < 0)) return null;
  if (h.item !== undefined && (typeof h.item !== 'string' || h.item.length > 40)) return null;
  return { x: h.x, y: h.y, z: h.z, nx: h.nx, ny: h.ny, nz: h.nz, ...(h.hy !== undefined ? { hy: h.hy } : {}), ...(h.item !== undefined ? { item: h.item } : {}) };
}

export function parseVitals(v: unknown): VitalsData | null {
  const d = v as Partial<VitalsData> | null;
  return d && num(d.health, 100) && num(d.hunger, 100) && num(d.saturation, 100) && num(d.air, 100) ? { health: d.health, hunger: d.hunger, saturation: d.saturation, air: d.air } : null;
}

export function parseTitanAction(v: unknown): TitanAction | null {
  const a = v as { k?: unknown; hit?: unknown; slot?: unknown; x?: unknown; y?: unknown; z?: unknown } | null;
  if (!a) return null;
  if (a.k === 'place') { const hit = parseHit(a.hit); return hit && int(a.slot, 35) && (a.slot as number) >= 0 ? { k: 'place', hit, slot: a.slot as number } : null; }
  if (a.k === 'break') { const hit = parseHit(a.hit); return hit ? { k: 'break', hit } : null; }
  const cell = int(a.x) && int(a.y, 1000) && int(a.z);
  if (a.k === 'use') return cell ? { k: 'use', x: a.x as number, y: a.y as number, z: a.z as number } : null;
  const o = a as { op?: unknown; slot?: unknown; i?: unknown; kind?: unknown; id?: unknown };
  const xyz = { x: a.x as number, y: a.y as number, z: a.z as number };
  if (a.k === 'chest' && cell) {
    if (o.op === 'in' && int(o.slot, 35) && (o.slot as number) >= 0) return { k: 'chest', ...xyz, op: 'in', slot: o.slot as number };
    if (o.op === 'out' && int(o.i, 17) && (o.i as number) >= 0) return { k: 'chest', ...xyz, op: 'out', i: o.i as number };
    return null;
  }
  if (a.k === 'furnace' && cell) {
    const kinds = ['input', 'fuel', 'output'];
    if (o.op === 'in' && (o.kind === 'input' || o.kind === 'fuel') && int(o.slot, 35) && (o.slot as number) >= 0) return { k: 'furnace', ...xyz, op: 'in', kind: o.kind, slot: o.slot as number };
    if (o.op === 'out' && typeof o.kind === 'string' && kinds.includes(o.kind)) return { k: 'furnace', ...xyz, op: 'out', kind: o.kind as 'input' | 'fuel' | 'output' };
    return null;
  }
  if (a.k === 'strike') return typeof o.id === 'string' && o.id.length > 0 && o.id.length <= 20 ? { k: 'strike', id: o.id } : null;
  if (a.k === 'dismountBoat') return { k: 'dismountBoat' };
  if (a.k === 'mountBoat') return typeof o.id === 'string' && o.id.length > 0 && o.id.length <= 20 ? { k: 'mountBoat', id: o.id } : null;
  if (a.k === 'strikeFauna' || a.k === 'feedFauna' || a.k === 'strikeGrunho') return typeof o.id === 'string' && o.id.length > 0 && o.id.length <= 40 ? { k: a.k, id: o.id } : null;
  if (a.k === 'die') return { k: 'die' };
  return null;
}

export function parseTitanClientMessage(text: string): TitanClientMessage | null {
  if (text.length > 200_000) return null;
  let m: { t?: unknown } & Record<string, unknown>;
  try { m = JSON.parse(text); } catch { return null; }
  if (!m || typeof m !== 'object') return null;
  switch (m.t) {
    case 'hello': { const name = sanitizeTitanName(m.name); return name && int(m.v, 1000) && int(m.room, 1e6) ? { t: 'hello', v: m.v as number, name, room: m.room as number } : null; }
    case 'state': { const s = parseTitanState(m.s), v = m.v === undefined ? undefined : parseVitals(m.v); return s && (m.v === undefined || v) ? { t: 'state', s, ...(v ? { v } : {}) } : null; }
    case 'boat': { const b = m.b as { x?: unknown; z?: unknown; r?: unknown } | undefined; return b && num(b.x) && num(b.z) && num(b.r, 1000) ? { t: 'boat', b: { x: b.x as number, z: b.z as number, r: b.r as number } } : null; }
    case 'act': { const a = parseTitanAction(m.a); return a && int(m.seq, 1e9) ? { t: 'act', seq: m.seq as number, a } : null; }
    case 'bag': return m.bag && typeof m.bag === 'object' ? { t: 'bag', bag: m.bag as InventoryData } : null;
    default: return null;
  }
}
