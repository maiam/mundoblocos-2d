import { isItem, Item, maxStack } from './items';
import { RECIPES, type Recipe } from './recipes';
import type { Stack } from './inventory';

/**
 * Braseiro de Rocha como **bloco com estado** (ADR 0068), no modelo da Fornalha do Minecraft: 3 espaços (entrada, combustível, saída) guardados na coordenada do bloco, com barras de queima e de
 * cozimento que **continuam com a tela fechada** (só com o jogo ativo, como o rebrote da noz). A Mesa de Trabalho segue sem memória (devolve a grade ao fechar). Puro e determinístico, sem DOM.
 * Receitas do braseiro = as do catálogo com `station: 'brazier'` e **um ingrediente só** (Lingote de Cobre; a carne assada entra na etapa 4).
 */
/** Segundos de cozimento por preparação (provisório; 10 s como a fornalha do Minecraft). */
export const COOK_TIME_S = 10;
/**
 * Carga de combustível em segundos **de cozimento** (ADR 0073): a Brasa de Âmbar rende **4 preparações** (40 s) e o Bloco de Âmbar Compactado, 9 brasas = **36 preparações** (360 s). A carga só é gasta enquanto
 * o braseiro processa uma receita: parado, o saldo fica para a próxima vez.
 */
export const FUEL_TIME_S: Readonly<Record<number, number>> = { [Item.EMBER]: 40, [Item.EMBER_BLOCK]: 360 };
/** Preparações que ainda cabem na carga acesa (arredondado para cima), para mostrar na tela. */
export const prepsLeft = (f: FurnaceState): number => Math.ceil(f.burnLeft / COOK_TIME_S - 1e-9);

export interface FurnaceState {
  input: Stack | null; fuel: Stack | null; output: Stack | null;
  /** Saldo da carga em segundos de cozimento (> 0 = há carga) e a duração total da unidade queimada (para desenhar a chama). */
  burnLeft: number; burnTotal: number;
  /** Segundos de cozimento da preparação atual (0 a `COOK_TIME_S`). */
  cook: number;
}
export type FurnaceSlot = 'input' | 'fuel' | 'output';

export const newFurnace = (): FurnaceState => ({ input: null, fuel: null, output: null, burnLeft: 0, burnTotal: 0, cook: 0 });
export const furnaceKey = (x: number, y: number, z: number): string => `${x},${y},${z}`;
/** Há carga no braseiro (saldo > 0). O bloco só fica aceso enquanto processa (`isWorking`). */
export const isLit = (f: FurnaceState): boolean => f.burnLeft > 0;

/** Receita do braseiro para um item de entrada (um ingrediente só), ou null. */
export function smeltRecipe(item: number): Recipe | null {
  return RECIPES.find((r) => r.station === 'brazier' && r.ingredients.length === 1 && r.ingredients[0].item === item) ?? null;
}
export const isFuel = (item: number): boolean => item in FUEL_TIME_S;
/** O item cabe no espaço pedido? (entrada: tem receita; combustível: queima.) */
export const accepts = (slot: FurnaceSlot, item: number): boolean => (slot === 'input' ? smeltRecipe(item) !== null : slot === 'fuel' ? isFuel(item) : false);

/** Pode cozinhar agora: entrada com o suficiente para a receita e a saída aceita o resultado inteiro. */
export function canSmelt(f: FurnaceState): boolean {
  const r = f.input ? smeltRecipe(f.input.item) : null;
  if (!f.input || !r || f.input.count < r.ingredients[0].count) return false;
  if (!f.output) return true;
  return f.output.item === r.result.item && f.output.count + r.result.count <= maxStack(r.result.item);
}

/** O braseiro está processando agora (há carga e o que cozinhar): é o que deixa o bloco aceso. */
export const isWorking = (f: FurnaceState): boolean => f.burnLeft > 0 && canSmelt(f);

/**
 * Passa `dt` segundos (ADR 0073). A carga acende **consumindo 1 combustível na hora** (mesmo que a entrada seja tirada depois, o saldo fica) e só acende quando há o que cozinhar; **a carga só diminui enquanto
 * o braseiro processa**: parado, o saldo fica para a próxima vez. O cozimento só avança com carga, entrada válida e espaço na saída; sem isso o progresso regride (2× mais rápido). Devolve se algo discreto mudou
 * (acendeu, apagou, saiu um item).
 */
export function tickFurnace(f: FurnaceState, dt: number): { changed: boolean } {
  let changed = false;
  const was = isWorking(f);
  let rest = dt;
  // a conta é por trechos (até o fim da carga ou da preparação): nada se perde por arredondamento do passo
  for (let guard = 0; rest > EPS && guard < 64; guard++) {
    const can = canSmelt(f);
    if (f.burnLeft <= EPS && can && f.fuel && isFuel(f.fuel.item)) {
      f.burnTotal = f.burnLeft = FUEL_TIME_S[f.fuel.item];
      if (--f.fuel.count <= 0) f.fuel = null;
      changed = true;
    }
    if (!(f.burnLeft > EPS && can)) { if (f.cook > 0) f.cook = Math.max(0, f.cook - rest * 2); f.burnLeft = f.burnLeft > EPS ? f.burnLeft : 0; break; }
    const step = Math.min(rest, f.burnLeft, COOK_TIME_S - f.cook);
    f.burnLeft -= step; f.cook += step; rest -= step;
    if (f.burnLeft <= EPS) f.burnLeft = 0;
    if (f.cook >= COOK_TIME_S - EPS) {
      const r = smeltRecipe(f.input!.item)!;
      f.cook = 0;
      if ((f.input!.count -= r.ingredients[0].count) <= 0) f.input = null;
      f.output = f.output ? { item: f.output.item, count: f.output.count + r.result.count } : { item: r.result.item, count: r.result.count };
      changed = true;
    }
  }
  if (was !== isWorking(f)) changed = true;
  return { changed };
}
const EPS = 1e-6;

// ---- Save ----
export interface FurnaceData { i?: [number, number]; f?: [number, number]; o?: [number, number]; b: number; t: number; c: number }
const pack = (s: Stack | null): [number, number] | undefined => (s ? [s.item, s.count] : undefined);
export function furnaceToData(f: FurnaceState): FurnaceData {
  const d: FurnaceData = { b: Math.round(f.burnLeft * 10) / 10, t: f.burnTotal, c: Math.round(f.cook * 10) / 10 };
  const i = pack(f.input), fu = pack(f.fuel), o = pack(f.output);
  if (i) d.i = i; if (fu) d.f = fu; if (o) d.o = o;
  return d;
}
const unpack = (e: unknown): Stack | null => (Array.isArray(e) && isItem(e[0]) && Number.isInteger(e[1]) && e[1] >= 1 && e[1] <= maxStack(e[0]) ? { item: e[0], count: e[1] } : null);
const num = (v: unknown, lo: number, hi: number): number => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : 0);
/** Lê o gravado com limites; entrada ou combustível que não servem àquele espaço são descartados. */
export function furnaceFromData(d: unknown): FurnaceState {
  const o = (d && typeof d === 'object' ? d : {}) as Partial<FurnaceData>;
  const f = newFurnace();
  const i = unpack(o.i), fu = unpack(o.f);
  f.input = i && accepts('input', i.item) ? i : null; f.fuel = fu && accepts('fuel', fu.item) ? fu : null; f.output = unpack(o.o);
  f.burnTotal = num(o.t, 0, 600); f.burnLeft = Math.min(num(o.b, 0, 600), f.burnTotal); f.cook = num(o.c, 0, COOK_TIME_S);
  return f;
}
