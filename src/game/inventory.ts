import { Item, type ItemId } from '../world/items';

/** Quantidades iniciais para começar a plantar e testar a alimentação das ovelhas. */
export const STARTING_ITEMS: Partial<Record<ItemId, number>> = {
  [Item.WHEAT_SEED]: 5,
  [Item.WHEAT]: 2,
};

/**
 * Inventário de itens contáveis do jogador (sementes, trigo). Blocos de
 * construção não passam por aqui: são infinitos. Estado de execução, não persistido.
 */
export class Inventory {
  private readonly counts = new Map<ItemId, number>();

  constructor(initial: Partial<Record<ItemId, number>> = STARTING_ITEMS) {
    for (const [id, n] of Object.entries(initial)) this.counts.set(id as ItemId, n ?? 0);
  }

  count(id: ItemId): number {
    return this.counts.get(id) ?? 0;
  }

  add(id: ItemId, n = 1): void {
    this.counts.set(id, this.count(id) + n);
  }

  /** Gasta `n` unidades; false (sem gastar nada) se não houver o suficiente. */
  take(id: ItemId, n = 1): boolean {
    if (this.count(id) < n) return false;
    this.counts.set(id, this.count(id) - n);
    return true;
  }
}
