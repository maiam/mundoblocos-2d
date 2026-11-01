import { HOTBAR_BLOCKS, type BlockId } from '../world/blocks';
import { Item, type ItemId, TOOL_ORDER, type ToolId } from '../world/items';

/**
 * Um espaço da hotbar: ferramenta (equipada ao selecionar), item contável
 * (semente, trigo) ou bloco de construção (infinito).
 */
export type HotbarSlot =
  | { kind: 'tool'; tool: ToolId }
  | { kind: 'item'; item: ItemId }
  | { kind: 'block'; block: BlockId };

/** Ferramentas (teclas 1–5), cultivo (6–7) e depois os blocos. */
export const HOTBAR: HotbarSlot[] = [
  ...TOOL_ORDER.map((tool) => ({ kind: 'tool' as const, tool })),
  { kind: 'item', item: Item.WHEAT_SEED },
  { kind: 'item', item: Item.WHEAT },
  ...HOTBAR_BLOCKS.map((block) => ({ kind: 'block' as const, block })),
];
