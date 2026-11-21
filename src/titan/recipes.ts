import type { Inventory } from './inventory';
import { Item } from './items';

/**
 * Catálogo de receitas do Titã (ADR 0045). **Uma fonte só**: os cartões do livro de receitas, a validação, o consumo e a grade 2 × 2 leem daqui.
 * Sem DOM. Cada receita tem estação (`personal` = fabricação pessoal 2 × 2 na mochila; `workbench` = Mesa de Trabalho) e é fabricada por inteiro ou nada
 * (`craft`: confere estação e ingredientes, calcula a capacidade **depois** dos débitos e aplica consumo e resultado numa operação só).
 * A Laje de Rocha (3 blocos → 6 lajes, mesa) entrou na segunda entrega (ADR 0046), depois do aceite da mesa.
 */
export type Station = 'personal' | 'workbench' | 'brazier';
export interface Stackable { item: number; count: number }
/** Grupo do livro de receitas (faixa da esquerda): pelo tipo do item fabricado. */
export type Group = 'construcao' | 'utilidades' | 'materiais' | 'ferramentas';
export const GROUP_NAMES: Record<Group, string> = { construcao: 'Construção', utilidades: 'Utilidades', materiais: 'Materiais', ferramentas: 'Ferramentas' };
export interface Recipe { id: string; name: string; group: Group; result: Stackable; ingredients: readonly Stackable[]; station: Station }

export const RECIPES: readonly Recipe[] = [
  { id: 'mesa', name: 'Mesa de Trabalho', group: 'utilidades', result: { item: Item.WORKBENCH, count: 1 }, ingredients: [{ item: Item.DARK_ROCK, count: 4 }], station: 'personal' },
  { id: 'lente', name: 'Lente de Gelo', group: 'materiais', result: { item: Item.ICE_LENS, count: 1 }, ingredients: [{ item: Item.FROST_SHARD, count: 1 }], station: 'workbench' },
  { id: 'lanterna', name: 'Lanterna da Margem', group: 'utilidades', result: { item: Item.LANTERN, count: 1 }, ingredients: [{ item: Item.ROCK_SHARD, count: 2 }, { item: Item.ICE_LENS, count: 1 }, { item: Item.EMBER, count: 1 }], station: 'workbench' },
  { id: 'marco', name: 'Marco de Margem', group: 'construcao', result: { item: Item.MARCO, count: 1 }, ingredients: [{ item: Item.ROCK_SHARD, count: 1 }, { item: Item.GLASS_REED, count: 1 }], station: 'workbench' },
  { id: 'painel', name: 'Painel de Junco', group: 'construcao', result: { item: Item.PAINEL, count: 2 }, ingredients: [{ item: Item.GLASS_REED, count: 2 }, { item: Item.DARK_ROCK, count: 1 }], station: 'workbench' },
  { id: 'laje', name: 'Laje de Rocha', group: 'construcao', result: { item: Item.SLAB, count: 6 }, ingredients: [{ item: Item.DARK_ROCK, count: 3 }], station: 'workbench' },
  { id: 'picareta-rocha', name: 'Picareta de Rocha', group: 'ferramentas', result: { item: Item.STONE_PICK, count: 1 }, ingredients: [{ item: Item.ROCK_SHARD, count: 3 }, { item: Item.DRY_REED, count: 2 }], station: 'workbench' },
  { id: 'braseiro', name: 'Braseiro de Rocha', group: 'utilidades', result: { item: Item.BRAZIER, count: 1 }, ingredients: [{ item: Item.DARK_ROCK, count: 4 }], station: 'workbench' },
  { id: 'revestimento', name: 'Revestimento de Carapaça', group: 'construcao', result: { item: Item.CARAPACE, count: 2 }, ingredients: [{ item: Item.PLATE, count: 1 }, { item: Item.DARK_ROCK, count: 1 }], station: 'workbench' },
  { id: 'lingote-cobre', name: 'Lingote de Cobre de Duna', group: 'materiais', result: { item: Item.COPPER_INGOT, count: 1 }, ingredients: [{ item: Item.COPPER_SHARD, count: 2 }], station: 'brazier' },
  { id: 'noz-torrada', name: 'Noz Torrada', group: 'materiais', result: { item: Item.NOZ_TORRADA, count: 1 }, ingredients: [{ item: Item.NOZ, count: 1 }], station: 'brazier' },
  { id: 'carne-assada', name: 'Carne Assada de Farejador', group: 'materiais', result: { item: Item.COOKED_MEAT, count: 1 }, ingredients: [{ item: Item.RAW_MEAT, count: 1 }], station: 'brazier' },
  { id: 'picareta-cobre', name: 'Picareta de Cobre', group: 'ferramentas', result: { item: Item.COPPER_PICK, count: 1 }, ingredients: [{ item: Item.COPPER_INGOT, count: 3 }, { item: Item.DRY_REED, count: 2 }], station: 'workbench' },
  { id: 'adaga-rocha', name: 'Adaga de Rocha', group: 'ferramentas', result: { item: Item.STONE_DAGGER, count: 1 }, ingredients: [{ item: Item.ROCK_SHARD, count: 1 }, { item: Item.DRY_REED, count: 1 }], station: 'workbench' },
  { id: 'adaga-cobre', name: 'Adaga de Cobre', group: 'ferramentas', result: { item: Item.COPPER_DAGGER, count: 1 }, ingredients: [{ item: Item.COPPER_INGOT, count: 1 }, { item: Item.DRY_REED, count: 1 }], station: 'workbench' },
  { id: 'ambar-compactado', name: 'Bloco de Âmbar Compactado', group: 'construcao', result: { item: Item.EMBER_BLOCK, count: 1 }, ingredients: [{ item: Item.EMBER, count: 9 }], station: 'workbench' },
  { id: 'ambar-desmontar', name: 'Desmontar Bloco de Âmbar', group: 'materiais', result: { item: Item.EMBER, count: 9 }, ingredients: [{ item: Item.EMBER_BLOCK, count: 1 }], station: 'workbench' },
];
export const recipeById = (id: string): Recipe | undefined => RECIPES.find((r) => r.id === id);

export const STATION_NAMES: Record<Station, string> = { personal: 'Fabricação pessoal (mochila)', workbench: 'Mesa de Trabalho', brazier: 'Braseiro de Rocha aceso' };

/**
 * Prévia da receita na grade 3 × 3 (ADR 0050): **uma célula por unidade pedida** (4 rochas = 4 células com 1 ícone cada, o resto vazio) e, em cada célula, quanto do que o jogador tem cabe
 * a ela, repartido por igual com o resto nas primeiras (tem 12 → 3,3,3,3; tem 9 → 3,2,2,2; tem 3 de 4 → 1,1,1,0). Até 9 células (o catálogo pede no máximo 4).
 */
export function previewCells(inv: Inventory, r: Recipe): Array<{ item: number; share: number; have: number; need: number }> {
  const out: Array<{ item: number; share: number; have: number; need: number }> = [];
  for (const g of r.ingredients) {
    const have = inv.total(g.item);
    for (let u = 0; u < g.count && out.length < 9; u++) out.push({ item: g.item, share: Math.floor(have / g.count) + (u < have % g.count ? 1 : 0), have, need: g.count });
  }
  return out;
}

/** Ingredientes com o que o jogador tem (hotbar + mochila) e o que a receita pede. */
export function ingredientStatus(inv: Inventory, r: Recipe): Array<{ item: number; have: number; need: number }> {
  return r.ingredients.map((g) => ({ item: g.item, have: inv.total(g.item), need: g.count }));
}

export type CraftReason = 'ok' | 'station' | 'missing' | 'full';
export const CRAFT_MESSAGES: Record<Exclude<CraftReason, 'ok'>, string> = {
  station: 'Precisa da Mesa de Trabalho',
  missing: 'Faltam ingredientes',
  full: 'Mochila cheia: libere espaço para o resultado',
};

/**
 * Fabrica `r` com os materiais do inventário. `at` = estação em uso (`null` = só a mochila). Falhou → nada muda e o motivo volta em `reason`.
 * A mesma função serve o cartão "Fabricar" e a grade 2 × 2 (esta consome da grade, não daqui).
 */
/** A estação em uso atende a receita? Pessoal serve em qualquer lugar; Mesa e Braseiro aceso só nas suas (ADR 0065). */
export const stationMet = (r: Recipe, at: Station | null): boolean => r.station === 'personal' || r.station === at;

export function craft(inv: Inventory, r: Recipe, at: Station | null): { ok: boolean; reason: CraftReason } {
  if (!stationMet(r, at)) return { ok: false, reason: 'station' };
  const res = inv.tryCraft(r.ingredients, r.result);
  return { ok: res === 'ok', reason: res };
}

/** Motivo pelo qual o cartão está indisponível agora (ou `null` se pode fabricar): estação, ingredientes e, depois do débito simulado, espaço. */
export function blockedReason(inv: Inventory, r: Recipe, at: Station | null): CraftReason | null {
  if (!stationMet(r, at)) return 'station';
  if (ingredientStatus(inv, r).some((g) => g.have < g.need)) return 'missing';
  return inv.canCraft(r.ingredients, r.result) ? null : 'full';
}

/**
 * Receita formada pela grade 3 × 3 (a **única** grade de montagem, ADR 0049/0050): as quantidades por item têm de ser **exatamente** as dos ingredientes, em qualquer disposição das células.
 * Ingrediente extra, errado ou faltando → `null`. Vale para todas as receitas; quem exige a Mesa de Trabalho é a hora de retirar a saída (`Inventory.takeBenchResult`).
 */
export function matchBench(totals: ReadonlyMap<number, number>): Recipe | null {
  for (const r of RECIPES) {
    if (r.ingredients.length === totals.size && r.ingredients.every((g) => totals.get(g.item) === g.count)) return r;
  }
  return null;
}

