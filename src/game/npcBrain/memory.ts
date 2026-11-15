/**
 * Memória dos NPCs (ADR 0034, nível 3): o que cada morador "lembra" da jogadora — quantas vezes conversou e quantas compras fez (nas lojas) —
 * e a **relação** (0–100) que sai disso. Puro e sem DOM. Guarda-se no **salvamento do jogador** (`SaveData.npcMemory`), nunca na sala do servidor.
 * As falas são escritas à mão e escolhidas por condição (faixa de relação); nada é gerado.
 */

export interface NpcMemory {
  /** Conversas (e visitas à loja) com este morador. */
  talks: number;
  /** Compras feitas nele (unidades). */
  bought: number;
}

/** Chave = id do NPC nomeado ou do sorteado (`rt3`, `rv1`…). */
export type MemoryBook = Record<string, NpcMemory>;

export type Tier = 'stranger' | 'acquaintance' | 'friend' | 'close';

/** Relação 0–100: cada conversa vale 6 pontos e cada compra, 4. */
export function relation(m: NpcMemory | undefined): number {
  if (!m) return 0;
  return Math.min(100, m.talks * 6 + m.bought * 4);
}

export function tierOf(m: NpcMemory | undefined): Tier {
  if (!m || (m.talks === 0 && m.bought === 0)) return 'stranger';
  const r = relation(m);
  return r < 25 ? 'acquaintance' : r < 60 ? 'friend' : 'close';
}

export function noteTalk(book: MemoryBook, key: string): void {
  const m = (book[key] ??= { talks: 0, bought: 0 });
  m.talks = Math.min(9999, m.talks + 1);
}

export function noteBuy(book: MemoryBook, key: string, n = 1): void {
  const m = (book[key] ??= { talks: 0, bought: 0 });
  m.bought = Math.min(9999, m.bought + n);
}

const KNOWN: Record<Exclude<Tier, 'stranger'>, readonly string[]> = {
  acquaintance: ['Ah, é você de novo!', 'Olá outra vez!'],
  friend: ['Que bom ver você de novo!', 'Você já é de casa por aqui!'],
  close: ['Minha visita preferida chegou!', 'Você nunca deixa de passar, e eu adoro isso.'],
};

/** Frase de reencontro dita antes da fala de sempre (vazia para quem ainda não conhece a jogadora). `n` alterna entre as variantes. */
export function knownLine(tier: Tier, n = 0): string {
  if (tier === 'stranger') return '';
  const l = KNOWN[tier];
  return l[Math.abs(n) % l.length];
}

const SHOP_GREETING: Record<'merchant' | 'florist', Record<Tier, string>> = {
  merchant: {
    stranger: 'Confira os meus itens à venda!',
    acquaintance: 'Bem-vinda de volta! Confira o que tenho hoje.',
    friend: 'Que bom te ver! Separei o melhor para você.',
    close: 'Minha freguesa preferida! O que vai levar hoje?',
  },
  florist: {
    stranger: 'Flores fofas para enfeitar o seu mundo!',
    acquaintance: 'Voltou! As flores sentiram a sua falta.',
    friend: 'Que bom te ver! Cada flor aqui já conhece você.',
    close: 'Minha jardineira favorita! Escolha à vontade.',
  },
};

export function shopGreeting(role: 'merchant' | 'florist', tier: Tier): string {
  return SHOP_GREETING[role][tier];
}

/** Valida o que veio do salvamento (descarta lixo, limita os números). */
export function sanitizeBook(raw: unknown): MemoryBook {
  const out: MemoryBook = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const m = v as Partial<NpcMemory> | null;
    if (!m || typeof m !== 'object') continue;
    const talks = Number.isFinite(m.talks) ? Math.max(0, Math.min(9999, Math.floor(m.talks as number))) : 0;
    const bought = Number.isFinite(m.bought) ? Math.max(0, Math.min(9999, Math.floor(m.bought as number))) : 0;
    if (talks || bought) out[k.slice(0, 40)] = { talks, bought };
  }
  return out;
}
