import { HOTBAR_BLOCKS, type BlockId } from '../world/blocks';
import { Item, type ItemId } from '../world/items';

/** Um espaço da hotbar: item contável (semente, trigo) ou bloco de construção (infinito). */
export type HotbarSlot = { kind: 'item'; item: ItemId } | { kind: 'block'; block: BlockId };

/** Itens de cultivo primeiro (teclas 1–2), depois os blocos. */
export const HOTBAR: HotbarSlot[] = [
  { kind: 'item', item: Item.WHEAT_SEED },
  { kind: 'item', item: Item.WHEAT },
  ...HOTBAR_BLOCKS.map((block) => ({ kind: 'block' as const, block })),
];
