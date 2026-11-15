import { FLOWER_BLOCKS } from './blocks';
import { blockStack, Item, type ItemId, type StackId } from './items';
import { foodValue } from './progression';

/**
 * Mercado (v0.93.57, dono do produto): o mercador fixo (Bento) vende **só consumíveis** (comida: tudo o que enche a fome, `FOOD`),
 * pagos em **Moedas de Cobre** (hoje só o goblin as solta). Regras puras, sem DOM; a janela (`game/shopWindow.ts`) e o `Game` só
 * chamam `buyOffer`. Preços provisórios, ajustáveis olhando o ritmo do jogo (um goblin dá 2 moedas).
 */
export const CURRENCY: ItemId = Item.COPPER_COIN;

export interface ShopOffer {
  /** O que se vende: um item (Mercado) ou um bloco (`blockStack`, Floricultura). */
  item: StackId;
  /** Moedas de cobre por unidade. */
  price: number;
}

/** Vitrine do Mercado, na ordem da janela: colhidos do campo primeiro, depois os pratos e os produtos dos animais. */
export const MARKET_STOCK: readonly ShopOffer[] = [
  { item: Item.POTATO, price: 1 },
  { item: Item.TOMATO, price: 1 },
  { item: Item.CARROT, price: 2 },
  { item: Item.APPLE, price: 2 },
  { item: Item.MILK, price: 2 },
  { item: Item.BREAD, price: 4 },
  { item: Item.CHEESE, price: 4 },
  { item: Item.PASTA_TOMATO, price: 6 },
  { item: Item.APPLE_PIE, price: 8 },
];

/**
 * Vitrine da Floricultura (v0.93.110, dono do produto): as **15 Flores Fofas**, na ordem da lista dele, pagas em Moedas de Cobre. São só enfeite —
 * viram ícones da hotbar, o jogador as coloca no chão e elas **não têm efeito nenhum além do visual**. Preço provisório igual para todas.
 */
export const FLORIST_PRICE = 2;
export const FLORIST_STOCK: readonly ShopOffer[] = FLOWER_BLOCKS.map((id) => ({ item: blockStack(id), price: FLORIST_PRICE }));

/** Itens por página da janela (2 colunas × 5 fileiras). */
export const SHOP_PAGE_SIZE = 10;

export function shopPages(offers: readonly ShopOffer[]): number {
  return Math.max(1, Math.ceil(offers.length / SHOP_PAGE_SIZE));
}

/** Fatia da vitrine na página `page` (0 = primeira); página fora do intervalo vira a última/primeira. */
export function shopPage(offers: readonly ShopOffer[], page: number): readonly ShopOffer[] {
  const p = Math.min(Math.max(0, page), shopPages(offers) - 1);
  return offers.slice(p * SHOP_PAGE_SIZE, (p + 1) * SHOP_PAGE_SIZE);
}

/** O que a compra precisa saber do inventário (o `Inventory` do jogo cumpre). */
export interface Wallet {
  count(id: StackId): number;
  take(id: StackId, n?: number): boolean;
  add(id: StackId, n?: number): void;
}

/** `ok`: comprou; `coins`: faltam moedas (nada muda); `full`: sem lugar na bolsa para um item novo (nada muda). */
export type BuyResult = 'ok' | 'coins' | 'full';

/** Compra `qty` unidades: confere o lugar na bolsa (`canCarry`) e as moedas, depois gasta e entrega — tudo ou nada. */
export function buyOffer(wallet: Wallet, offer: ShopOffer, canCarry: (item: StackId) => boolean = () => true, qty = 1): BuyResult {
  if (!canCarry(offer.item)) return 'full';
  const cost = offer.price * qty;
  if (wallet.count(CURRENCY) < cost) return 'coins';
  wallet.take(CURRENCY, cost);
  wallet.add(offer.item, qty);
  return 'ok';
}

/** Toda a vitrine é consumível (enche a fome) e tem preço positivo? (guarda do teste: o Mercado não vende outra coisa.) */
export function stockIsConsumable(offers: readonly ShopOffer[] = MARKET_STOCK): boolean {
  return offers.every((o) => foodValue(o.item as ItemId) > 0 && o.price > 0);
}
