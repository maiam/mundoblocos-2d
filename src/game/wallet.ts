/**
 * Carteira da jogadora (v0.93.122): as Moedas de Cobre deixam de ser uma pilha da bolsa e viram um saldo do **painel do personagem**; **não se perde ao morrer**.
 * Um número só (em cobre); o painel mostra em três moedas: 100 de cobre = 1 de prata, 100 de prata = 1 de ouro. Puro e sem DOM.
 */
export const COPPER_PER_SILVER = 100;
export const SILVER_PER_GOLD = 100;
/** Teto do saldo (nada de número gigante vindo de um salvamento adulterado). */
export const WALLET_MAX = 999_999_999;

export class Wallet {
  private total = 0;

  get copper(): number {
    return this.total;
  }

  add(n: number): void {
    this.total = Math.min(WALLET_MAX, this.total + Math.max(0, Math.floor(n)));
  }

  /** Gasta `n`; false (sem gastar nada) se não houver o bastante. */
  take(n: number): boolean {
    if (n < 0 || this.total < n) return false;
    this.total -= Math.floor(n);
    return true;
  }

  /** Carrega um saldo (salvamento / sala): valida. */
  set(n: unknown): void {
    this.total = typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.min(WALLET_MAX, Math.floor(n))) : 0;
  }
}

/** O saldo em cobre dividido nas três moedas do painel. */
export function splitCoins(copper: number): { gold: number; silver: number; copper: number } {
  const perGold = COPPER_PER_SILVER * SILVER_PER_GOLD;
  return { gold: Math.floor(copper / perGold), silver: Math.floor(copper / COPPER_PER_SILVER) % SILVER_PER_GOLD, copper: copper % COPPER_PER_SILVER };
}
