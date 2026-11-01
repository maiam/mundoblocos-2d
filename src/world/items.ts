import { Block, type BlockId, isWheat, WHEAT_STAGES, wheatStage } from './blocks';

/**
 * Itens contáveis (diferentes dos blocos de construção, que são infinitos).
 * Fonte de verdade do que cada item é e do que o mundo devolve ao colher.
 */
export const Item = {
  WHEAT_SEED: 'wheat_seed',
  WHEAT: 'wheat',
} as const;

export type ItemId = (typeof Item)[keyof typeof Item];

export interface ItemDef {
  id: ItemId;
  name: string;
  /** Bloco que o item planta ao ser usado no chão (semente). */
  plants?: BlockId;
  /** Animal que come este item. */
  feeds?: 'sheep';
}

export const ITEMS: Record<ItemId, ItemDef> = {
  wheat_seed: { id: Item.WHEAT_SEED, name: 'Semente de Trigo', plants: Block.WHEAT_0 },
  wheat: { id: Item.WHEAT, name: 'Trigo', feeds: 'sheep' },
};

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
  /** Uso planejado (documentação; ainda sem efeito no jogo). */
  plannedUse: string;
}

export const TOOLS: Record<ToolId, ToolDef> = {
  sword: { id: Tool.SWORD, name: 'Espada', plannedUse: 'combate' },
  hoe: { id: Tool.HOE, name: 'Enxada', plannedUse: 'preparar a terra para plantar' },
  pickaxe: { id: Tool.PICKAXE, name: 'Picareta', plannedUse: 'quebrar pedra e minérios' },
  shovel: { id: Tool.SHOVEL, name: 'Pá', plannedUse: 'cavar o chão' },
  axe: { id: Tool.AXE, name: 'Machado', plannedUse: 'cortar árvores e madeira' },
};

export const TOOL_ORDER: ToolId[] = [Tool.SWORD, Tool.HOE, Tool.PICKAXE, Tool.SHOVEL, Tool.AXE];
