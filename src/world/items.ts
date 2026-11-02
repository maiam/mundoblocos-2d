import { Block, type BlockId, blockDef, isWheat, WHEAT_STAGES, wheatStage } from './blocks';
import type { MonsterKind } from './dungeon';

/**
 * Itens contáveis (diferentes dos blocos de construção, que são infinitos).
 * Fonte de verdade do que cada item é e do que o mundo devolve ao colher.
 */
export const Item = {
  WHEAT_SEED: 'wheat_seed',
  WHEAT: 'wheat',
  /** Espólios das aranhas (sem uso ainda — futuras receitas). */
  SILK: 'silk',
  FANG: 'fang',
  QUEEN_HEART: 'queen_heart',
} as const;

export type ItemId = (typeof Item)[keyof typeof Item];

export interface ItemDef {
  id: ItemId;
  name: string;
  /** Bloco que o item planta ao ser usado no chão (semente). */
  plants?: BlockId;
  /** Animal que come este item. */
  feeds?: 'sheep';
  /** Espólio de monstro: não ocupa a hotbar; aparece no contador de espólios da HUD. */
  loot?: boolean;
}

export const ITEMS: Record<ItemId, ItemDef> = {
  wheat_seed: { id: Item.WHEAT_SEED, name: 'Semente de Trigo', plants: Block.WHEAT_0 },
  wheat: { id: Item.WHEAT, name: 'Trigo', feeds: 'sheep' },
  silk: { id: Item.SILK, name: 'Seda de Aranha', loot: true },
  fang: { id: Item.FANG, name: 'Presa de Aranha', loot: true },
  queen_heart: { id: Item.QUEEN_HEART, name: 'Coração da Rainha', loot: true },
};

/** Espólios, na ordem exibida na HUD. */
export const LOOT_ITEMS: ItemId[] = [Item.SILK, Item.FANG, Item.QUEEN_HEART];

/**
 * O que cada monstro deixa ao morrer. Pequena: 1 seda (60%). Grande: 1–2 sedas + presa (35%).
 * Rainha: 5–7 sedas + 2–3 presas + o Coração da Rainha.
 */
export function monsterDrops(kind: MonsterKind, rand: () => number = Math.random): Drop[] {
  if (kind === 'spider-small') return rand() < 0.6 ? [{ item: Item.SILK, count: 1 }] : [];
  if (kind === 'spider-big') {
    const out: Drop[] = [{ item: Item.SILK, count: 1 + (rand() < 0.5 ? 1 : 0) }];
    if (rand() < 0.35) out.push({ item: Item.FANG, count: 1 });
    return out;
  }
  return [
    { item: Item.SILK, count: 5 + Math.floor(rand() * 3) },
    { item: Item.FANG, count: 2 + (rand() < 0.5 ? 1 : 0) },
    { item: Item.QUEEN_HEART, count: 1 },
  ];
}

export interface Drop {
  item: ItemId;
  count: number;
}

/**
 * O que um bloco quebrado devolve. Trigo maduro: 1 trigo + 1–2 sementes.
 * Trigo verde: devolve a semente. Demais blocos: nada (construção é infinita).
 */
export function dropsFor(id: BlockId, rand: () => number = Math.random): Drop[] {
  if (!isWheat(id)) return [];
  if (wheatStage(id) === WHEAT_STAGES - 1) {
    return [
      { item: Item.WHEAT, count: 1 },
      { item: Item.WHEAT_SEED, count: 1 + (rand() < 0.5 ? 1 : 0) },
    ];
  }
  return [{ item: Item.WHEAT_SEED, count: 1 }];
}

/**
 * Ferramentas: itens únicos (sem quantidade) que a personagem equipa.
 * Por enquanto só mudam a aparência; as ações de cada uma virão depois.
 */
export const Tool = {
  SWORD: 'sword',
  HOE: 'hoe',
  PICKAXE: 'pickaxe',
  SHOVEL: 'shovel',
  AXE: 'axe',
} as const;

export type ToolId = (typeof Tool)[keyof typeof Tool];

export interface ToolDef {
  id: ToolId;
  name: string;
  /** Uso (documentação). */
  plannedUse: string;
  /**
   * O que a ferramenta pode quebrar segurando: tudo, nada, orgânico (madeira, árvore e planta), só planta,
   * macio (blocos macios — terra, areia — e plantas) ou tudo menos madeira/árvore (`nonWood`).
   * Fonte de verdade da restrição por ferramenta.
   */
  breaks: 'any' | 'none' | 'organic' | 'plant' | 'soft' | 'nonWood';
  /** Plantas quebradas por esta ferramenta são destruídas sem soltar nada (pá, picareta). */
  destroysPlants: boolean;
  /** Toque curto num chão: 'till' = ara (enxada), 'flatten' = vira Caminho de Terra (pá), null = nada. */
  groundUse: 'till' | 'flatten' | null;
  /** Toque curto toca a animação de ação da ferramenta (golpe, arar…). */
  swings: boolean;
  /** O golpe acerta entidades à frente (animais/monstros). */
  strikes: boolean;
}

export const TOOLS: Record<ToolId, ToolDef> = {
  sword: {
    id: Tool.SWORD, name: 'Espada', plannedUse: 'golpe em animais/monstros; não quebra nada',
    breaks: 'none', destroysPlants: false, groundUse: null, swings: true, strikes: true,
  },
  hoe: {
    id: Tool.HOE, name: 'Enxada', plannedUse: 'ara Terra/Terra com Grama → Terra Arada; quebra só plantas; não ataca',
    breaks: 'plant', destroysPlants: false, groundUse: 'till', swings: true, strikes: false,
  },
  pickaxe: {
    id: Tool.PICKAXE, name: 'Picareta', plannedUse: 'minera qualquer bloco menos madeira/árvore; plantas sem drop; não ataca',
    breaks: 'nonWood', destroysPlants: true, groundUse: null, swings: true, strikes: false,
  },
  shovel: {
    id: Tool.SHOVEL, name: 'Pá', plannedUse: 'Terra/Grama/Arada → Caminho de Terra; cava só macios e plantas (sem drop); não ataca',
    breaks: 'soft', destroysPlants: true, groundUse: 'flatten', swings: true, strikes: false,
  },
  axe: {
    id: Tool.AXE, name: 'Machado', plannedUse: 'golpe em animais/monstros; corta só madeira/árvore/planta',
    breaks: 'organic', destroysPlants: false, groundUse: null, swings: true, strikes: true,
  },
};

/** A ferramenta (ou mão/item, `null`) pode quebrar este bloco? */
export function toolCanBreak(tool: ToolId | null, id: BlockId): boolean {
  if (!tool) return true;
  const rule = TOOLS[tool].breaks;
  const { organic, soft } = blockDef(id);
  if (rule === 'any') return true;
  if (rule === 'organic') return organic !== null;
  if (rule === 'plant') return organic === 'plant';
  if (rule === 'soft') return soft || organic === 'plant';
  if (rule === 'nonWood') return organic !== 'wood';
  return false;
}

/** O que cai ao quebrar este bloco com esta ferramenta: pá e picareta destroem plantas sem soltar nada. */
export function toolDrops(tool: ToolId | null, id: BlockId, rand: () => number = Math.random): Drop[] {
  if (tool && TOOLS[tool].destroysPlants && blockDef(id).organic === 'plant') return [];
  return dropsFor(id, rand);
}

export const TOOL_ORDER: ToolId[] = [Tool.SWORD, Tool.HOE, Tool.PICKAXE, Tool.SHOVEL, Tool.AXE];

/** Tempo segurando para quebrar com a mão/item (s). */
export const BREAK_HOLD_HAND_S = 2;
/** Tempo segurando para quebrar com uma ferramenta que pode quebrar o alvo (s). */
export const BREAK_HOLD_TOOL_S = 1;

/** Quanto tempo segurar para quebrar: ferramenta 1 s, mão ou item 2 s. */
export function breakSeconds(tool: ToolId | null): number {
  return tool ? BREAK_HOLD_TOOL_S : BREAK_HOLD_HAND_S;
}
