import { maxStack, isItem } from './items';
import { maxDurability } from './wear';
import type { Stack } from './inventory';

/**
 * Conteúdo do Baú de Rocha e Junco (ADR 0089): 18 espaços (2 × 9), **estado da sessão** por `x,y,z` (`session.chests`), gravado em `header.chests`. Regras puras, sem DOM: pôr é tudo ou nada
 * (completa pilhas do mesmo item e depois usa espaços vazios) e a ferramenta desgastada leva o desgaste. Quebrar o baú cospe tudo no chão (`actions.spillChest`).
 */
export const CHEST_SLOTS = 18;
export type ChestState = Array<Stack | null>;
export const newChest = (): ChestState => new Array(CHEST_SLOTS).fill(null);

/** Quanto de `item` ainda cabe no baú (pilhas parciais + espaços vazios). */
export function chestRoom(c: ChestState, item: number): number {
  const m = maxStack(item);
  return c.reduce((r, s) => r + (s ? (s.item === item && !s.wear ? m - s.count : 0) : m), 0);
}

/** Põe a pilha no baú. Tudo ou nada: sem espaço para ela inteira, nada muda e devolve false. Pilha com desgaste (ferramenta) não se funde: ocupa um espaço vazio. */
export function chestPut(c: ChestState, st: Stack): boolean {
  if (st.count < 1 || chestRoom(c, st.item) < st.count) return false;
  let left = st.count;
  const m = maxStack(st.item);
  if (!st.wear) for (const s of c) if (s && s.item === st.item && !s.wear && s.count < m && left > 0) { const t = Math.min(m - s.count, left); s.count += t; left -= t; }
  for (let i = 0; i < c.length && left > 0; i++) if (!c[i]) { const t = Math.min(m, left); c[i] = { item: st.item, count: t, ...(st.wear ? { wear: st.wear } : {}) }; left -= t; }
  return left === 0;
}

// ---- Save: `[item, count]` ou `[item, count, desgaste]` por espaço; vazio = null ----
type Packed = [number, number] | [number, number, number] | null;
export const chestToData = (c: ChestState): Packed[] => c.map((s) => (s ? (s.wear ? [s.item, s.count, s.wear] : [s.item, s.count]) : null));
/** Lê o gravado com limites: item conhecido, contagem 1–`maxStack`, desgaste só em ferramenta; tudo o que não serve vira espaço vazio. Sempre devolve 18 espaços. */
export function chestFromData(d: unknown): ChestState {
  const c = newChest();
  if (!Array.isArray(d)) return c;
  for (let i = 0; i < CHEST_SLOTS && i < d.length; i++) {
    const e = d[i] as unknown;
    if (!Array.isArray(e) || !isItem(e[0]) || !Number.isInteger(e[1]) || e[1] < 1 || e[1] > maxStack(e[0])) continue;
    const max = maxDurability(e[0]), wear = max !== null && Number.isInteger(e[2]) && (e[2] as number) >= 1 && (e[2] as number) < max ? (e[2] as number) : 0;
    c[i] = { item: e[0], count: e[1], ...(wear ? { wear } : {}) };
  }
  return c;
}
export const chestIsEmpty = (c: ChestState): boolean => c.every((s) => !s);
