import { Block, type BlockId, blockDef, isWheat, WHEAT_STAGES, wheatStage } from './blocks';

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
  /** Uso (documentação). */
  plannedUse: string;
  /**
   * O que a ferramenta pode quebrar segurando: tudo, nada ou só o que é de madeira/árvore/planta.
   * Fonte de verdade da restrição por ferramenta.
   */
  breaks: 'any' | 'none' | 'choppable';
  /** Toque curto dá um golpe (animação de ataque) que acerta entidades à frente. */
  strikes: boolean;
}

export const TOOLS: Record<ToolId, ToolDef> = {
  sword: { id: Tool.SWORD, name: 'Espada', plannedUse: 'golpe em animais/monstros; não quebra nada', breaks: 'none', strikes: true },
  hoe: { id: Tool.HOE, name: 'Enxada', plannedUse: 'ara Terra/Terra com Grama → Terra Arada', breaks: 'any', strikes: false },
  pickaxe: { id: Tool.PICKAXE, name: 'Picareta', plannedUse: 'quebrar pedra (futuro)', breaks: 'any', strikes: false },
  shovel: { id: Tool.SHOVEL, name: 'Pá', plannedUse: 'cavar o chão (futuro)', breaks: 'any', strikes: false },
  axe: {
    id: Tool.AXE, name: 'Machado', plannedUse: 'golpe em animais/monstros; corta só madeira/árvore/planta',
    breaks: 'choppable', strikes: true,
  },
};

/** A ferramenta (ou mão/item, `null`) pode quebrar este bloco? */
export function toolCanBreak(tool: ToolId | null, id: BlockId): boolean {
  if (!tool) return true;
  const rule = TOOLS[tool].breaks;
  return rule === 'any' || (rule === 'choppable' && blockDef(id).choppable);
}

export const TOOL_ORDER: ToolId[] = [Tool.SWORD, Tool.HOE, Tool.PICKAXE, Tool.SHOVEL, Tool.AXE];
