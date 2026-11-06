import { type PlayerAction, parseAction } from '../world/actions';
import type { Facing } from '../game/walker';

/**
 * Protocolo do multiplayer (ADR 0016): mensagens JSON entre jogo e servidor do Orvalis. Puro (sem DOM): o servidor usa
 * este mesmo arquivo. Mudou o formato de forma incompatível → suba `PROTOCOL_VERSION` (o servidor recusa versões
 * diferentes com uma mensagem clara, em vez de quebrar o jogo).
 */
export const PROTOCOL_VERSION = 3;
/** Jogadores por sala (co-op pequeno com convite). */
export const MAX_PLAYERS = 4;
/** Código de convite: 6 letras/números sem os confundíveis (0/O, 1/I/L). */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 6;
export const NAME_MIN = 2;
export const NAME_MAX = 16;

/** Código de convite digitado → forma canônica (maiúsculas, sem espaços/hífens), ou null se inválido. */
export function normalizeRoomCode(text: string): string | null {
  const c = text.toUpperCase().replace(/[\s-]/g, '');
  if (c.length !== ROOM_CODE_LENGTH) return null;
  for (const ch of c) if (!ROOM_CODE_ALPHABET.includes(ch)) return null;
  return c;
}

/** Sorteia um código de convite com o gerador dado (o servidor usa um gerador seguro). */
export function makeRoomCode(rand: () => number): string {
  let s = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) s += ROOM_CODE_ALPHABET[Math.floor(rand() * ROOM_CODE_ALPHABET.length)];
  return s;
}

/** Nome de convidado: letras (com acento), números, espaço, - e _; 2 a 16 caracteres. Devolve o nome limpo ou null. */
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
  /** Entrar: sem `room` cria uma sala nova; com `room` entra pelo código de convite. */
  | { t: 'hello'; v: number; name: string; room?: string }
  | { t: 'state'; s: PlayerState }
  /** `seq` volta no `rejected`, para o jogo saber qual ação não valeu. */
  | { t: 'action'; seq: number; a: PlayerAction };

export type ServerMessage =
  | { t: 'welcome'; you: number; room: string; seed: number; players: PlayerInfo[]; edits: Applied[] }
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
      if (!Number.isInteger(o.v) || typeof o.name !== 'string' || (o.room !== undefined && typeof o.room !== 'string')) return null;
      return { t: 'hello', v: o.v as number, name: o.name, room: o.room as string | undefined };
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
