import { type PlayerAction, parseAction } from '../world/actions';
import type { Facing } from '../game/walker';

/**
 * Protocolo do multiplayer (ADR 0016): mensagens JSON entre jogo e servidor do Orvalis. Puro (sem DOM): o servidor usa
 * este mesmo arquivo. Mudou o formato de forma incompatível → suba `PROTOCOL_VERSION` (o servidor recusa versões
 * diferentes com uma mensagem clara, em vez de quebrar o jogo).
 */
export const PROTOCOL_VERSION = 8;
/** Jogadores por sala ao mesmo tempo. */
export const MAX_PLAYERS = 10;

/**
 * Salas fixas do servidor (dono do produto, 2026-11-06): cada uma é um mundo compartilhado e salvo no servidor, aberto
 * a quem quiser entrar, a qualquer hora. Por enquanto só a Sala 1. A seed é fixa (o mundo é sempre o mesmo).
 */
export const ROOMS: ReadonlyArray<{ id: number; name: string; seed: number }> = [
  { id: 1, name: 'Sala 1', seed: 20261106 },
];

export function roomById(id: number): (typeof ROOMS)[number] | undefined {
  return ROOMS.find((r) => r.id === id);
}

export const NAME_MIN = 2;
export const NAME_MAX = 16;

/** Nome de jogador: letras (com acento), números, espaço, - e _; 2 a 16 caracteres. Devolve o nome limpo ou null. */
export function sanitizeName(text: string): string | null {
  const n = text.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (n.length < NAME_MIN || n.length > NAME_MAX) return null;
  return /^[\p{L}\p{N} _-]+$/u.test(n) ? n : null;
}

/** Estado visível de um jogador (posição e animação), enviado algumas vezes por segundo. */
export interface PlayerState {
  x: number;
  y: number;
  facing: Facing;
  moving: boolean;
}

export interface PlayerInfo {
  id: number;
  name: string;
  state: PlayerState | null;
}

/** Ação aplicada pelo servidor (vale para todos, inclusive quem fez). */
export interface Applied {
  by: number;
  action: PlayerAction;
}

export type ClientMessage =
  /** Entrar numa sala fixa pelo número (`ROOMS`). */
  | { t: 'hello'; v: number; name: string; room: number }
  | { t: 'state'; s: PlayerState }
  /** `seq` volta no `rejected`, para o jogo saber qual ação não valeu. */
  | { t: 'action'; seq: number; a: PlayerAction }
  /** Bolsa e posição do jogador, para a sala guardar (volta no próximo `welcome` com o mesmo nome). */
  | { t: 'bag'; bag: RoomBag };

/** O que a sala guarda de cada jogador (pelo nome): itens, grade da mão e onde estava. */
export interface RoomBag {
  inventory: Record<string, number>;
  hotbar: Array<string | null> | null;
  x: number;
  y: number;
}

/** Chunk editado do mundo da sala (chão e níveis em base64, como no salvamento local). */
export interface RoomChunk {
  cx: number;
  cy: number;
  ground: string;
  levels: string[];
}

/** Célula que cresceu (planta/árvore) por decisão da sala: x, y e o bloco novo. */
export type Grown = [number, number, number];

export type ServerMessage =
  /**
   * Entrou: `chunks` = mundo da sala como está (chunks editados, crescimento incluso), `time` = hora do dia (0..1),
   * `bag` = bolsa guardada deste nome (null = primeira vez).
   */
  | { t: 'welcome'; you: number; room: number; roomName: string; seed: number; players: PlayerInfo[]; chunks: RoomChunk[]; time: number; bag: RoomBag | null }
  /** Hora do dia da sala (sincroniza o relógio de todos de tempos em tempos). */
  | { t: 'time'; time: number }
  /** Plantas/árvores que cresceram na sala. */
  | { t: 'grow'; cells: Grown[] }
  | { t: 'joined'; player: PlayerInfo }
  | { t: 'left'; id: number }
  | { t: 'state'; id: number; s: PlayerState }
  | ({ t: 'applied' } & Applied)
  | { t: 'rejected'; seq: number }
  | { t: 'error'; code: 'version' | 'name' | 'room' | 'full' | 'bad'; message: string };

const FACINGS = new Set<string>(['down', 'left', 'right', 'up']);
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) < 2 ** 30;

export function parseState(v: unknown): PlayerState | null {
  if (!v || typeof v !== 'object') return null;
  const s = v as Record<string, unknown>;
  if (!finite(s.x) || !finite(s.y) || !FACINGS.has(s.facing as string) || typeof s.moving !== 'boolean') return null;
  return { x: s.x, y: s.y, facing: s.facing as Facing, moving: s.moving };
}

/** Lê uma mensagem vinda de um jogador (texto da rede). Qualquer coisa malformada vira null — nunca exceção. */
export function parseClientMessage(text: string): ClientMessage | null {
  let m: unknown;
  try {
    m = JSON.parse(text);
  } catch {
    return null;
  }
  if (!m || typeof m !== 'object') return null;
  const o = m as Record<string, unknown>;
  switch (o.t) {
    case 'hello':
      if (!Number.isInteger(o.v) || typeof o.name !== 'string' || !Number.isInteger(o.room)) return null;
      return { t: 'hello', v: o.v as number, name: o.name, room: o.room as number };
    case 'bag': {
      const bag = parseBag(o.bag);
      return bag ? { t: 'bag', bag } : null;
    }
    case 'state': {
      const s = parseState(o.s);
      return s ? { t: 'state', s } : null;
    }
    case 'action': {
      const a = parseAction(o.a);
      return a && Number.isInteger(o.seq) ? { t: 'action', seq: o.seq as number, a } : null;
    }
    default:
      return null;
  }
}

const MAX_BAG_ENTRIES = 128;
const STACK_RE = /^(block:\d{1,4}|tool:[a-z_]{1,24}|[a-z_]{1,32})$/;

/** Lê a bolsa vinda da rede (limites de tamanho e formato; o conteúdo é confiado ao jogo, sem contas ainda). */
export function parseBag(v: unknown): RoomBag | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (!o.inventory || typeof o.inventory !== 'object' || !finite(o.x) || !finite(o.y)) return null;
  const inventory: Record<string, number> = {};
  const entries = Object.entries(o.inventory as Record<string, unknown>);
  if (entries.length > MAX_BAG_ENTRIES) return null;
  for (const [k, n] of entries) {
    if (!STACK_RE.test(k) || !Number.isInteger(n) || (n as number) < 0 || (n as number) > 99999) return null;
    inventory[k] = n as number;
  }
  let hotbar: Array<string | null> | null = null;
  if (o.hotbar !== null && o.hotbar !== undefined) {
    if (!Array.isArray(o.hotbar) || o.hotbar.length > 64) return null;
    if (!o.hotbar.every((s) => s === null || (typeof s === 'string' && STACK_RE.test(s)))) return null;
    hotbar = o.hotbar as Array<string | null>;
  }
  return { inventory, hotbar, x: o.x as number, y: o.y as number };
}
