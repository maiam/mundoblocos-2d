import { describe, expect, it } from 'vitest';
import { Inventory } from '../game/inventory';
import { Item } from './items';
import { buyOffer, CURRENCY, MARKET_STOCK, shopPage, shopPages, stockIsConsumable } from './shop';

describe('Mercado (v0.93.57)', () => {
  it('só vende consumíveis, com preço, sem repetir item', () => {
    expect(stockIsConsumable()).toBe(true);
    expect(new Set(MARKET_STOCK.map((o) => o.item)).size).toBe(MARKET_STOCK.length);
    expect(MARKET_STOCK.map((o) => o.item)).not.toContain(Item.WHEAT_SEED); // semente não é consumível
    expect(MARKET_STOCK.map((o) => o.item)).not.toContain(CURRENCY);
  });

  it('comprar gasta as moedas e entrega o item', () => {
    const inv = new Inventory({ [Item.COPPER_COIN]: 10 });
    expect(buyOffer(inv, { item: Item.BREAD, price: 4 })).toBe('ok');
    expect(inv.count(Item.COPPER_COIN)).toBe(6);
    expect(inv.count(Item.BREAD)).toBe(1);
    expect(buyOffer(inv, { item: Item.BREAD, price: 4 }, undefined, 1)).toBe('ok');
    expect(inv.count(Item.BREAD)).toBe(2);
    expect(inv.count(Item.COPPER_COIN)).toBe(2);
  });

  it('sem moedas suficientes não muda nada', () => {
    const inv = new Inventory({ [Item.COPPER_COIN]: 3 });
    expect(buyOffer(inv, { item: Item.APPLE_PIE, price: 8 })).toBe('coins');
    expect(inv.count(Item.COPPER_COIN)).toBe(3);
    expect(inv.count(Item.APPLE_PIE)).toBe(0);
  });

  it('bolsa cheia (item novo sem lugar) não gasta moedas; item que já se tem sempre cabe', () => {
    const inv = new Inventory({ [Item.COPPER_COIN]: 5 });
    expect(buyOffer(inv, { item: Item.APPLE, price: 2 }, () => false)).toBe('full');
    expect(inv.count(Item.COPPER_COIN)).toBe(5);
    expect(buyOffer(inv, { item: Item.APPLE, price: 2 }, () => true)).toBe('ok');
  });

  it('quantidade maior cobra tudo ou nada', () => {
    const inv = new Inventory({ [Item.COPPER_COIN]: 5 });
    expect(buyOffer(inv, { item: Item.CARROT, price: 2 }, undefined, 3)).toBe('coins');
    expect(inv.count(Item.COPPER_COIN)).toBe(5);
    expect(buyOffer(inv, { item: Item.CARROT, price: 2 }, undefined, 2)).toBe('ok');
    expect(inv.count(Item.COPPER_COIN)).toBe(1);
    expect(inv.count(Item.CARROT)).toBe(2);
  });

  it('páginas de 10: a vitrine atual cabe em uma; fora do intervalo vira a última/primeira', () => {
    expect(shopPages(MARKET_STOCK)).toBe(1);
    expect(shopPage(MARKET_STOCK, 0)).toHaveLength(MARKET_STOCK.length);
    expect(shopPage(MARKET_STOCK, 5)).toHaveLength(MARKET_STOCK.length);
    expect(shopPage(MARKET_STOCK, -1)).toHaveLength(MARKET_STOCK.length);
    const many = Array.from({ length: 23 }, () => MARKET_STOCK[0]);
    expect(shopPages(many)).toBe(3);
    expect(shopPage(many, 2)).toHaveLength(3);
  });
});
