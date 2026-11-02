import type { BlockId } from '../world/blocks';
import { Item, type ItemId, TOOL_ORDER, type ToolId } from '../world/items';
import { WORLD_PROFILES, type WorldProfile } from '../world/profiles';

/**
 * Um espaço da hotbar: ferramenta (equipada ao selecionar), item contável
 * (semente, trigo) ou bloco de construção (infinito).
 */
export type HotbarSlot =
  | { kind: 'tool'; tool: ToolId }
  | { kind: 'item'; item: ItemId }
  | { kind: 'block'; block: BlockId };

/** Hotbar de um mundo: ferramentas e cultivo só se o perfil permitir; depois os blocos do perfil. */
export function hotbarFor(profile: WorldProfile): HotbarSlot[] {
  return [
    ...(profile.tools ? TOOL_ORDER.map((tool) => ({ kind: 'tool' as const, tool })) : []),
    ...(profile.farming ? [{ kind: 'item' as const, item: Item.WHEAT_SEED }, { kind: 'item' as const, item: Item.WHEAT }] : []),
    ...profile.blocks.map((block) => ({ kind: 'block' as const, block })),
  ];
}

/** Hotbar do mundo principal: ferramentas 1–5, semente 6, trigo 7, materiais depois. */
export const HOTBAR: HotbarSlot[] = hotbarFor(WORLD_PROFILES.principal);
