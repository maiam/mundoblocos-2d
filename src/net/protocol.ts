import { type PlayerAction, parseAction } from '../world/actions';
import type { Facing } from '../game/walker';
import { TOOLS, type ToolId } from '../world/items';

/**
 * Protocolo do multiplayer (ADR 0016): mensagens JSON entre jogo e servidor do Orvalis. Puro (sem DOM): o servidor usa
 * este mesmo arquivo. Mudou o formato de forma incompatível → suba `PROTOCOL_VERSION` (o servidor recusa versões
 * diferentes com uma mensagem clara, em vez de quebrar o jogo).
 */
export const PROTOCOL_VERSION = 18;
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
  /** Ferramenta na mão (ausente = mãos vazias): os outros a veem no boneco. */
  tool?: ToolId;
  /** Golpes começados até agora: quando muda, quem vê toca a animação do golpe com `tool`. */
  swing?: number;
  /** Sentado: quadro da folha de sentar (0–15); ausente = de pé. */
  sit?: number;
}

/**
 * Como o jogador aparece para os outros: personagem pronto (`body`) ou, com `look`, o chibi modular com as peças
 * escolhidas. Quem desenha confere as peças no próprio manifesto (`cleanLook`); peça desconhecida vira a padrão.
 */
/** Personagens prontos que a rede aceita (fonte única: o jogo usa a mesma lista em `HERO_BODIES`). */
export const APPEARANCE_BODIES = ['heroine', 'hero', 'hood', 'gino'] as const;
export type AppearanceBody = (typeof APPEARANCE_BODIES)[number];

export interface Appearance {
  body: AppearanceBody;
  look: Record<string, string> | null;
}

export const DEFAULT_APPEARANCE: Appearance = { body: 'heroine', look: null };

export interface PlayerInfo {
  id: number;
  name: string;
  state: PlayerState | null;
  appearance: Appearance;
}

/** Ação aplicada pelo servidor (vale para todos, inclusive quem fez). */
export interface Applied {
  by: number;
  action: PlayerAction;
}

export type ClientMessage =
  /** Entrar numa sala fixa pelo número (`ROOMS`). */
  | { t: 'hello'; v: number; name: string; room: number; appearance?: Appearance }
  | { t: 'state'; s: PlayerState }
  /** `seq` volta no `rejected`, para o jogo saber qual ação não valeu. */
  | { t: 'action'; seq: number; a: PlayerAction }
  /** Bolsa e posição do jogador, para a sala guardar (volta no próximo `welcome` com o mesmo nome). */
  | { t: 'bag'; bag: RoomBag }
  /** Pegar um item do chão (quem pedir primeiro leva). */
  | { t: 'take'; id: number }
  /** Conteúdo novo de um baú depois de mexer nele (a sala guarda e repassa). */
  | { t: 'chest'; x: number; y: number; slots: ChestSlotsMsg }
  /** Golpe (espada/machado) para `facing`, com a força de quem bate (ataque + poder da arma): a sala calcula o acerto. */
  | { t: 'strike'; facing: Facing; attack: number }
  /** Dar `item` ao animal `id` (o da lista `mobs`): a sala decide se ele come; o item sai da bolsa no `fed`. */
  | { t: 'feed'; id: number; item: string };

/** Direções na rede (índice em `MobState.f`). */
export const FACING_ORDER: readonly Facing[] = ['down', 'left', 'right', 'up'];

/**
 * Bicho da sala visto por um jogador (Etapa 3: a sala roda animais e monstros; o aparelho só desenha). Curto de
 * propósito (vai ~10×/s): `i` id (0 = efeito sem id: morte ou coraçõezinhos), `k` tipo (`sheep`, `horse`, `cow`,
 * `chicken`, monstro ou `love-hearts`), `f` direção (`FACING_ORDER`), `m` andando, `b` filhote, `l` apaixonado (coração),
 * `e` pode comer agora, `p` vida restante (0..1, só ferido), `h` piscando de dor, `d` morte (0..1), `r` quadro e `s`
 * tamanho dos coraçõezinhos.
 */
export interface MobState {
  i: number;
  k: string;
  x: number;
  y: number;
  f: number;
  m?: 1;
  b?: 1;
  l?: 1;
  e?: 1;
  p?: number;
  h?: 1;
  d?: number;
  r?: number;
  s?: number;
}

/** Espaços de um baú na rede: pilha (id + quantidade) ou vazio. */
export type ChestSlotsMsg = Array<{ item: string; count: number } | null>;

/** Item no chão da sala (um por unidade, como no jogo sozinho). */
export interface RoomDrop {
  id: number;
  item: string;
  x: number;
  y: number;
}

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
  | {
    t: 'welcome'; you: number; room: number; roomName: string; seed: number; players: PlayerInfo[]; chunks: RoomChunk[];
    time: number; bag: RoomBag | null; drops: RoomDrop[]; chests: Array<{ x: number; y: number; slots: ChestSlotsMsg }>;
  }
  /** Itens que caíram no chão da sala (ao quebrar ou colher). */
  | { t: 'drops'; list: RoomDrop[] }
  /** Item pego (`by` = quem levou; some para todos). */
  | { t: 'taken'; id: number; by: number }
  /** Baú mudou (outro jogador mexeu). */
  | { t: 'chest'; x: number; y: number; slots: ChestSlotsMsg }
  /** Hora do dia da sala (sincroniza o relógio de todos de tempos em tempos). */
  | { t: 'time'; time: number }
  /** Plantas/árvores que cresceram na sala. */
  | { t: 'grow'; cells: Grown[] }
  /** Bichos da sala perto deste jogador (~10×/s); quem não está na lista saiu de perto ou sumiu. */
  | { t: 'mobs'; list: MobState[] }
  /** Um monstro (`k`) em (x, y) mordeu este jogador: o dano sai da defesa dele, no aparelho. */
  | { t: 'bite'; k: string; x: number; y: number }
  /** Dano que entrou em monstros (números na tela): x, y, quanto, crítico (1). */
  | { t: 'hits'; list: Array<[number, number, number, 0 | 1]> }
  /** O animal comeu: tira `item` da bolsa de quem deu. */
  | { t: 'fed'; id: number; item: string }
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
  const out: PlayerState = { x: s.x, y: s.y, facing: s.facing as Facing, moving: s.moving };
  if (typeof s.tool === 'string' && s.tool in TOOLS) out.tool = s.tool as ToolId;
  if (Number.isInteger(s.swing) && (s.swing as number) >= 0 && (s.swing as number) < 2 ** 31) out.swing = s.swing as number;
  if (Number.isInteger(s.sit) && (s.sit as number) >= 0 && (s.sit as number) < 16) out.sit = s.sit as number;
  return out;
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
      return { t: 'hello', v: o.v as number, name: o.name, room: o.room as number, appearance: parseAppearance(o.appearance) };
    case 'bag': {
      const bag = parseBag(o.bag);
      return bag ? { t: 'bag', bag } : null;
    }
    case 'take':
      return Number.isInteger(o.id) ? { t: 'take', id: o.id as number } : null;
    case 'chest': {
      const slots = parseChestSlots(o.slots);
      return slots && Number.isInteger(o.x) && Number.isInteger(o.y) ? { t: 'chest', x: o.x as number, y: o.y as number, slots } : null;
    }
    case 'state': {
      const s = parseState(o.s);
      return s ? { t: 'state', s } : null;
    }
    case 'strike':
      if (!FACINGS.has(o.facing as string) || !finite(o.attack) || (o.attack as number) < 0 || (o.attack as number) > 1000) return null;
      return { t: 'strike', facing: o.facing as Facing, attack: o.attack as number };
    case 'feed':
      return Number.isInteger(o.id) && typeof o.item === 'string' && /^[a-z_]{1,32}$/.test(o.item) ? { t: 'feed', id: o.id as number, item: o.item } : null;
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

const PIECE_RE = /^[a-z0-9-]{1,40}$/;

/** Lê a aparência vinda da rede; qualquer coisa estranha vira a padrão (Heroína). */
export function parseAppearance(v: unknown): Appearance {
  if (!v || typeof v !== 'object') return DEFAULT_APPEARANCE;
  const o = v as Record<string, unknown>;
  const body = (APPEARANCE_BODIES as readonly unknown[]).includes(o.body) ? (o.body as AppearanceBody) : 'heroine';
  let look: Record<string, string> | null = null;
  if (o.look && typeof o.look === 'object') {
    const entries = Object.entries(o.look as Record<string, unknown>);
    if (entries.length <= 12 && entries.every(([k, val]) => PIECE_RE.test(k) && typeof val === 'string' && PIECE_RE.test(val))) {
      look = Object.fromEntries(entries) as Record<string, string>;
    }
  }
  return { body, look };
}

/** Lê os espaços de um baú vindos da rede (27 espaços, ids de pilha válidos, quantidades inteiras). */
export function parseChestSlots(v: unknown, size = 27): ChestSlotsMsg | null {
  if (!Array.isArray(v) || v.length !== size) return null;
  const out: ChestSlotsMsg = [];
  for (const s of v) {
    if (s === null) { out.push(null); continue; }
    if (!s || typeof s !== 'object') return null;
    const o = s as Record<string, unknown>;
    if (typeof o.item !== 'string' || !STACK_RE.test(o.item) || !Number.isInteger(o.count) || (o.count as number) < 1 || (o.count as number) > 99999) return null;
    out.push({ item: o.item, count: o.count as number });
  }
  return out;
}
