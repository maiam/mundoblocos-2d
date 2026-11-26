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
/** `world`: a receita só existe nesse mundo voxel (ausente = Titã). O livro de receitas mostra só as do mundo aberto (ADR 0107). */
export interface Recipe { id: string; name: string; group: Group; result: Stackable; ingredients: readonly Stackable[]; station: Station; world?: 'orvalis' }

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
  { id: 'bloco-junco', name: 'Bloco de Junco', group: 'construcao', result: { item: Item.BLOCO_JUNCO, count: 1 }, ingredients: [{ item: Item.DRY_REED, count: 6 }], station: 'workbench' },
  { id: 'laje-junco', name: 'Laje de Junco', group: 'construcao', result: { item: Item.LAJE_JUNCO, count: 6 }, ingredients: [{ item: Item.BLOCO_JUNCO, count: 3 }], station: 'workbench' },
  { id: 'degrau-junco', name: 'Degrau de Junco', group: 'construcao', result: { item: Item.DEGRAU_JUNCO, count: 4 }, ingredients: [{ item: Item.BLOCO_JUNCO, count: 3 }], station: 'workbench' },
  { id: 'cadeira-junco', name: 'Cadeira de Junco', group: 'construcao', result: { item: Item.CADEIRA_JUNCO, count: 1 }, ingredients: [{ item: Item.DRY_REED, count: 3 }, { item: Item.ESTEIRA, count: 1 }], station: 'workbench' },
  { id: 'porta-junco', name: 'Porta de Junco', group: 'construcao', result: { item: Item.PORTA_JUNCO, count: 1 }, ingredients: [{ item: Item.BLOCO_JUNCO, count: 3 }], station: 'workbench' }, // provisória (ADR 0102): pede calibragem em jogo
  { id: 'balde', name: 'Balde de Cobre', group: 'ferramentas', result: { item: Item.BALDE, count: 1 }, ingredients: [{ item: Item.COPPER_INGOT, count: 3 }], station: 'workbench' },
  { id: 'cama', name: 'Cama de Junco', group: 'construcao', result: { item: Item.CAMA, count: 1 }, ingredients: [{ item: Item.DARK_ROCK, count: 3 }, { item: Item.ESTEIRA, count: 2 }], station: 'workbench' },
  { id: 'bau', name: 'Baú de Rocha e Junco', group: 'construcao', result: { item: Item.BAU, count: 1 }, ingredients: [{ item: Item.DARK_ROCK, count: 4 }, { item: Item.ESTEIRA, count: 1 }], station: 'workbench' },
  { id: 'escada', name: 'Escada de Junco', group: 'construcao', result: { item: Item.ESCADA, count: 3 }, ingredients: [{ item: Item.DRY_REED, count: 4 }], station: 'workbench' },
  { id: 'esteira', name: 'Esteira de Junco', group: 'construcao', result: { item: Item.ESTEIRA, count: 1 }, ingredients: [{ item: Item.DRY_REED, count: 3 }], station: 'workbench' },
  { id: 'noz-torrada', name: 'Noz Torrada', group: 'materiais', result: { item: Item.NOZ_TORRADA, count: 1 }, ingredients: [{ item: Item.NOZ, count: 1 }], station: 'brazier' },
  { id: 'carne-assada', name: 'Carne Assada de Farejador', group: 'materiais', result: { item: Item.COOKED_MEAT, count: 1 }, ingredients: [{ item: Item.RAW_MEAT, count: 1 }], station: 'brazier' },
  { id: 'picareta-cobre', name: 'Picareta de Cobre', group: 'ferramentas', result: { item: Item.COPPER_PICK, count: 1 }, ingredients: [{ item: Item.COPPER_INGOT, count: 3 }, { item: Item.DRY_REED, count: 2 }], station: 'workbench' },
  { id: 'adaga-rocha', name: 'Adaga de Rocha', group: 'ferramentas', result: { item: Item.STONE_DAGGER, count: 1 }, ingredients: [{ item: Item.ROCK_SHARD, count: 1 }, { item: Item.DRY_REED, count: 1 }], station: 'workbench' },
  { id: 'adaga-cobre', name: 'Adaga de Cobre', group: 'ferramentas', result: { item: Item.COPPER_DAGGER, count: 1 }, ingredients: [{ item: Item.COPPER_INGOT, count: 1 }, { item: Item.DRY_REED, count: 1 }], station: 'workbench' },
  { id: 'ambar-compactado', name: 'Bloco de Âmbar Compactado', group: 'construcao', result: { item: Item.EMBER_BLOCK, count: 1 }, ingredients: [{ item: Item.EMBER, count: 9 }], station: 'workbench' },
  { id: 'ambar-desmontar', name: 'Desmontar Bloco de Âmbar', group: 'materiais', result: { item: Item.EMBER, count: 9 }, ingredients: [{ item: Item.EMBER_BLOCK, count: 1 }], station: 'workbench' },
  // Madeira básica do Orvalis em voxel (ADR 0107): regras do Minecraft (1 tora → 4 tábuas; 2 tábuas → 4 hastes; 4 tábuas → mesa), uma receita por madeira (o catálogo não tem "qualquer tábua")
  { id: 'tabuas-carvalho', name: 'Tábuas de Carvalho', group: 'construcao', result: { item: Item.TABUA_CARVALHO, count: 4 }, ingredients: [{ item: Item.LOG_OAK, count: 1 }], station: 'personal', world: 'orvalis' },
  { id: 'tabuas-cerejeira', name: 'Tábuas de Cerejeira', group: 'construcao', result: { item: Item.TABUA_CEREJEIRA, count: 4 }, ingredients: [{ item: Item.LOG_CHERRY, count: 1 }], station: 'personal', world: 'orvalis' },
  { id: 'tabuas-betula', name: 'Tábuas de Bétula', group: 'construcao', result: { item: Item.TABUA_BETULA, count: 4 }, ingredients: [{ item: Item.LOG_BIRCH, count: 1 }], station: 'personal', world: 'orvalis' },
  { id: 'hastes-carvalho', name: 'Hastes de Madeira (tábuas de carvalho)', group: 'materiais', result: { item: Item.HASTE, count: 4 }, ingredients: [{ item: Item.TABUA_CARVALHO, count: 2 }], station: 'personal', world: 'orvalis' },
  { id: 'hastes-cerejeira', name: 'Hastes de Madeira (tábuas de cerejeira)', group: 'materiais', result: { item: Item.HASTE, count: 4 }, ingredients: [{ item: Item.TABUA_CEREJEIRA, count: 2 }], station: 'personal', world: 'orvalis' },
  { id: 'hastes-betula', name: 'Hastes de Madeira (tábuas de bétula)', group: 'materiais', result: { item: Item.HASTE, count: 4 }, ingredients: [{ item: Item.TABUA_BETULA, count: 2 }], station: 'personal', world: 'orvalis' },
  { id: 'mesa-carpintaria-carvalho', name: 'Mesa de Carpintaria (tábuas de carvalho)', group: 'utilidades', result: { item: Item.MESA_CARPINTARIA, count: 1 }, ingredients: [{ item: Item.TABUA_CARVALHO, count: 4 }], station: 'personal', world: 'orvalis' },
  { id: 'mesa-carpintaria-cerejeira', name: 'Mesa de Carpintaria (tábuas de cerejeira)', group: 'utilidades', result: { item: Item.MESA_CARPINTARIA, count: 1 }, ingredients: [{ item: Item.TABUA_CEREJEIRA, count: 4 }], station: 'personal', world: 'orvalis' },
  { id: 'mesa-carpintaria-betula', name: 'Mesa de Carpintaria (tábuas de bétula)', group: 'utilidades', result: { item: Item.MESA_CARPINTARIA, count: 1 }, ingredients: [{ item: Item.TABUA_BETULA, count: 4 }], station: 'personal', world: 'orvalis' },
  // Pedra de obra do Orvalis em voxel (ADR 0108), na Mesa de Carpintaria (a fundição em Braseiro ainda não existe no Orvalis: o polimento é provisório)
  { id: 'pedra-lisa', name: 'Pedra Lisa', group: 'construcao', result: { item: Item.PEDRA_LISA, count: 1 }, ingredients: [{ item: Item.STONE, count: 1 }], station: 'workbench', world: 'orvalis' },
  { id: 'tijolo-pedra', name: 'Tijolo de Pedra', group: 'construcao', result: { item: Item.TIJOLO_PEDRA, count: 4 }, ingredients: [{ item: Item.STONE, count: 4 }], station: 'workbench', world: 'orvalis' },
  { id: 'degrau-pedra', name: 'Degrau de Pedra', group: 'construcao', result: { item: Item.DEGRAU_PEDRA, count: 4 }, ingredients: [{ item: Item.PEDRA_LISA, count: 3 }], station: 'workbench', world: 'orvalis' },
  { id: 'mureta-pedra', name: 'Mureta de Pedra', group: 'construcao', result: { item: Item.MURETA_PEDRA, count: 6 }, ingredients: [{ item: Item.PEDRA_LISA, count: 6 }], station: 'workbench', world: 'orvalis' },
  // Solo e cerâmica do Orvalis em voxel (ADR 0111): receitas PROVISÓRIAS até existirem a enxada/pá (E4), a água do cultivo (E5), a argila no terreno e a fundição
  { id: 'terra-arada-seca', name: 'Terra Arada Seca', group: 'construcao', result: { item: Item.TERRA_ARADA_SECA, count: 1 }, ingredients: [{ item: Item.DIRT, count: 1 }], station: 'workbench', world: 'orvalis' },
  { id: 'terra-arada-umida', name: 'Terra Arada Úmida', group: 'construcao', result: { item: Item.TERRA_ARADA_UMIDA, count: 1 }, ingredients: [{ item: Item.TERRA_ARADA_SECA, count: 1 }], station: 'workbench', world: 'orvalis' },
  { id: 'caminho-terra', name: 'Caminho de Terra', group: 'construcao', result: { item: Item.CAMINHO_TERRA, count: 1 }, ingredients: [{ item: Item.DIRT, count: 1 }], station: 'workbench', world: 'orvalis' },
  { id: 'terra-infertil', name: 'Terra Infértil', group: 'construcao', result: { item: Item.TERRA_INFERTIL, count: 2 }, ingredients: [{ item: Item.DIRT, count: 1 }, { item: Item.BEACH, count: 1 }], station: 'workbench', world: 'orvalis' },
  { id: 'bola-argila', name: 'Bola de Argila', group: 'materiais', result: { item: Item.BOLA_ARGILA, count: 2 }, ingredients: [{ item: Item.DIRT, count: 2 }, { item: Item.BEACH, count: 1 }], station: 'workbench', world: 'orvalis' },
  { id: 'tijolo', name: 'Tijolo', group: 'materiais', result: { item: Item.TIJOLO, count: 1 }, ingredients: [{ item: Item.BOLA_ARGILA, count: 1 }], station: 'workbench', world: 'orvalis' },
  { id: 'bloco-argila', name: 'Bloco de Argila', group: 'construcao', result: { item: Item.BLOCO_ARGILA, count: 1 }, ingredients: [{ item: Item.BOLA_ARGILA, count: 4 }], station: 'workbench', world: 'orvalis' },
  { id: 'bloco-tijolos', name: 'Bloco de Tijolos', group: 'construcao', result: { item: Item.BLOCO_TIJOLOS, count: 1 }, ingredients: [{ item: Item.TIJOLO, count: 4 }], station: 'workbench', world: 'orvalis' },
  { id: 'laje-pedra', name: 'Laje de Pedra', group: 'construcao', result: { item: Item.LAJE_PEDRA, count: 6 }, ingredients: [{ item: Item.PEDRA_LISA, count: 3 }], station: 'workbench', world: 'orvalis' },
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

