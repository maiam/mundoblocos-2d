import { Block } from '../world/blocks';
import { blockStack, Item, type StackId, TOOL_ORDER, toolStack } from '../world/items';
import { Wallet } from './wallet';

/**
 * Começo no mundo com coleta: as 5 ferramentas, 5 sementes, 2 trigos, 2 de cada hortaliça (batata, tomate, cenoura —
 * plantam a si mesmas) e 1 Porta de Carvalho (sem materiais).
 */
export const STARTING_ITEMS: Partial<Record<StackId, number>> = {
  ...Object.fromEntries(TOOL_ORDER.map((t) => [toolStack(t), 1])),
  [Item.WHEAT_SEED]: 5,
  [Item.WHEAT]: 2,
  [Item.POTATO]: 2,
  [Item.TOMATO]: 2,
  [Item.CARROT]: 2,
  [blockStack(Block.OAK_DOOR)]: 1,
};

/**
 * Tudo que a heroína carrega, por `StackId` (itens, materiais coletados, ferramentas), sem limite por pilha.
 * A grade (`Hotbar`) só aponta para o que está aqui. Estado de execução (persistido por `game/save.ts`).
 */
export class Inventory {
  private readonly counts = new Map<StackId, number>();
  /**
   * A Moeda de Cobre não é uma pilha da bolsa: vive na carteira do painel do personagem (`Wallet`) e **sobrevive à morte** (v0.93.122). `count/add/take` da moeda
   * leiam e gravam ali (loja, missões e espólios seguem usando a mesma interface); `entries()` e o salvamento da bolsa não a incluem.
   */
  readonly wallet = new Wallet();

  constructor(initial: Partial<Record<StackId, number>> = STARTING_ITEMS) {
    this.replaceAll(initial);
  }

  count(id: StackId): number {
    return id === Item.COPPER_COIN ? this.wallet.copper : this.counts.get(id) ?? 0;
  }

  add(id: StackId, n = 1): void {
    if (id === Item.COPPER_COIN) { this.wallet.add(n); return; }
    this.counts.set(id, this.count(id) + n);
  }

  /** Gasta `n` unidades; false (sem gastar nada) se não houver o suficiente. */
  take(id: StackId, n = 1): boolean {
    if (this.count(id) < n) return false;
    if (id === Item.COPPER_COIN) return this.wallet.take(n);
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
    this.wallet.set(0);
    for (const [id, n] of Object.entries(counts)) {
      if (id === Item.COPPER_COIN) { this.wallet.add(n ?? 0); continue; } // salvamento antigo: as moedas da bolsa vão para a carteira
      if (n) this.counts.set(id as StackId, n);
    }
  }

  /** Morte: perde tudo (materiais, sementes, trigo, espólios); só as ferramentas ficam — e o dinheiro (a carteira não é tocada). */
  dropOnDeath(): void {
    for (const id of [...this.counts.keys()]) if (!id.startsWith('tool:')) this.counts.delete(id);
  }
}
