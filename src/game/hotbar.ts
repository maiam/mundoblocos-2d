import type { BlockId } from '../world/blocks';
import { blockStack, Item, type ItemId, stackBlock, type StackId, stackTool, TOOL_ORDER, type ToolId, toolStack } from '../world/items';
import { WORLD_PROFILES, type WorldProfile } from '../world/profiles';
import type { Inventory } from './inventory';

/**
 * Um espaço da grade: ferramenta (equipada ao selecionar), item contável (semente, trigo, espólio) ou
 * bloco de construção (coletado; infinito em mundo sem coleta).
 */
export type HotbarSlot =
  | { kind: 'tool'; tool: ToolId }
  | { kind: 'item'; item: ItemId }
  | { kind: 'block'; block: BlockId };

/** Espaços de item da grade da mão em mundo com coleta (depois deles: personagem, habilidades e bolsa). */
export const GRID_SLOTS = 9;
/** Espaços da bolsa: 4 fileiras de 3 à direita, acima dos botões personagem/habilidades/bolsa (com a mão, 21 itens). */
export const BAG_SLOTS = 12;
/** Tipos de item que a heroína carrega ao todo (mão + bolsa). */
export const CARRY_LIMIT = GRID_SLOTS + BAG_SLOTS;

/**
 * Cabe coletar `id`? Pilha que ela já tem sempre soma; tipo novo entra num espaço vazio da mão (vai direto para lá)
 * ou na bolsa, se ela tiver lugar. Assim a bolsa nunca passa dos `BAG_SLOTS` espaços.
 */
export function canCarry(inv: Inventory, grid: Hotbar, id: StackId): boolean {
  if (inv.count(id) > 0) return true;
  if (grid.hasFree) return true;
  return bagStacks(inv, grid).length < BAG_SLOTS;
}

/** Pilhas que estão na bolsa (o que ela carrega e não está na grade), na ordem em que foram obtidas. */
export function bagStacks(inv: Inventory, grid: Hotbar): StackId[] {
  return inv.entries().map(([id]) => id).filter((id) => grid.indexOf(id) < 0);
}

/** A bolsa tem lugar para mais uma pilha (ex.: guardar um item da grade)? */
export function bagHasRoom(inv: Inventory, grid: Hotbar): boolean {
  return bagStacks(inv, grid).length < BAG_SLOTS;
}

export function slotStack(s: HotbarSlot): StackId {
  return s.kind === 'tool' ? toolStack(s.tool) : s.kind === 'block' ? blockStack(s.block) : s.item;
}

export function stackSlot(id: StackId): HotbarSlot {
  const b = stackBlock(id);
  if (b !== null) return { kind: 'block', block: b };
  const t = stackTool(id);
  if (t !== null) return { kind: 'tool', tool: t };
  return { kind: 'item', item: id as ItemId };
}

/** Sementes e vegetais plantáveis, na ordem da grade (o vegetal é a própria semente de batata, tomate e cenoura). */
const CROP_ITEMS: readonly ItemId[] = [Item.WHEAT_SEED, Item.WHEAT, Item.CARROT, Item.POTATO, Item.TOMATO];

/** Grade fixa de um mundo sem coleta (Santuário): ferramentas/cultivo do perfil + todos os blocos dele. */
export function hotbarFor(profile: WorldProfile): HotbarSlot[] {
  return [
    ...(profile.tools ? TOOL_ORDER.map((tool) => ({ kind: 'tool' as const, tool })) : []),
    ...(profile.farming ? [{ kind: 'item' as const, item: Item.WHEAT_SEED }, { kind: 'item' as const, item: Item.WHEAT }] : []),
    ...profile.blocks.map((block) => ({ kind: 'block' as const, block })),
    ...(profile.crops ? CROP_ITEMS.map((item) => ({ kind: 'item' as const, item })) : []),
  ];
}

/** Grade inicial do mundo com coleta: ferramentas 1–5, semente 6, trigo 7, 8º e 9º livres (a porta vai na bolsa). */
export function startingGrid(): (StackId | null)[] {
  return [...TOOL_ORDER.map(toolStack), Item.WHEAT_SEED, Item.WHEAT, null, null];
}

/**
 * Grade na tela. Com coleta (`dynamic`): 8 espaços que apontam para pilhas do inventário — o que é coletado vai
 * para a grade se já estiver nela ou houver espaço livre, senão fica na bolsa; o espaço se libera quando a pilha
 * acaba. Sem coleta: lista fixa do perfil (blocos infinitos).
 */
export class Hotbar {
  readonly dynamic: boolean;
  private readonly slots: (StackId | null)[];

  constructor(profile: WorldProfile = WORLD_PROFILES.principal, layout?: (StackId | null)[]) {
    this.dynamic = profile.collectBlocks;
    this.slots = this.dynamic
      ? Array.from({ length: GRID_SLOTS }, (_, i) => (layout ?? startingGrid())[i] ?? null)
      : hotbarFor(profile).map(slotStack);
  }

  get length(): number {
    return this.slots.length;
  }

  /** Espaço i como HotbarSlot (null = vazio). */
  get(i: number): HotbarSlot | null {
    const s = this.slots[i];
    return s ? stackSlot(s) : null;
  }

  stack(i: number): StackId | null {
    return this.slots[i] ?? null;
  }

  /** Layout atual (salvamento). */
  layout(): (StackId | null)[] {
    return [...this.slots];
  }

  indexOf(id: StackId): number {
    return this.slots.indexOf(id);
  }

  /** Há espaço vazio na grade? */
  get hasFree(): boolean {
    return this.dynamic && this.slots.includes(null);
  }

  /** Coletou `id`: se não está na grade e há espaço livre, ocupa o primeiro. Devolve o índice ou -1 (bolsa). */
  autoPlace(id: StackId): number {
    if (!this.dynamic) return this.indexOf(id);
    const at = this.indexOf(id);
    if (at >= 0) return at;
    const free = this.slots.indexOf(null);
    if (free >= 0) this.slots[free] = id;
    return free;
  }

  /** Põe `id` no espaço i (o que estava lá volta para a bolsa); se `id` já estava em outro espaço, troca de lugar. */
  assign(i: number, id: StackId | null): void {
    if (!this.dynamic || i < 0 || i >= this.slots.length) return;
    if (id !== null) {
      const prev = this.slots.indexOf(id);
      if (prev >= 0) this.slots[prev] = this.slots[i];
    }
    this.slots[i] = id;
  }

  /** Libera os espaços cujas pilhas acabaram (material gasto, semente plantada, morte). */
  prune(inv: Inventory): void {
    if (!this.dynamic) return;
    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[i];
      if (s && inv.count(s) <= 0) this.slots[i] = null;
    }
  }
}
