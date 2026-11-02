import { Block } from '../world/blocks';
import { blockStack, Item, type StackId, TOOL_ORDER, toolStack } from '../world/items';

/** Começo no mundo com coleta: as 5 ferramentas, 5 sementes, 2 trigos e 1 Porta de Carvalho (sem materiais). */
export const STARTING_ITEMS: Partial<Record<StackId, number>> = {
  ...Object.fromEntries(TOOL_ORDER.map((t) => [toolStack(t), 1])),
  [Item.WHEAT_SEED]: 5,
  [Item.WHEAT]: 2,
  [blockStack(Block.OAK_DOOR)]: 1,
};

/**
 * Tudo que a heroína carrega, por `StackId` (itens, materiais coletados, ferramentas), sem limite por pilha.
 * A grade (`Hotbar`) só aponta para o que está aqui. Estado de execução (persistido por `game/save.ts`).
 */
export class Inventory {
  private readonly counts = new Map<StackId, number>();

  constructor(initial: Partial<Record<StackId, number>> = STARTING_ITEMS) {
    this.replaceAll(initial);
  }

  count(id: StackId): number {
    return this.counts.get(id) ?? 0;
  }

  add(id: StackId, n = 1): void {
    this.counts.set(id, this.count(id) + n);
  }

  /** Gasta `n` unidades; false (sem gastar nada) se não houver o suficiente. */
  take(id: StackId, n = 1): boolean {
    if (this.count(id) < n) return false;
    this.counts.set(id, this.count(id) - n);
    return true;
  }

  /** O que há (quantidade > 0), na ordem em que foi obtido. */
  entries(): Array<[StackId, number]> {
    return [...this.counts.entries()].filter(([, n]) => n > 0);
  }

  /** Substitui tudo (carregar um salvamento). */
  replaceAll(counts: Partial<Record<StackId, number>>): void {
    this.counts.clear();
    for (const [id, n] of Object.entries(counts)) if (n) this.counts.set(id as StackId, n);
  }

  /** Morte: perde tudo (materiais, sementes, trigo, espólios); só as ferramentas ficam. */
  dropOnDeath(): void {
    for (const id of [...this.counts.keys()]) if (!id.startsWith('tool:')) this.counts.delete(id);
  }
}
