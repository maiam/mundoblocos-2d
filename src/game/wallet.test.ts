import { describe, expect, it } from 'vitest';
import { Item } from '../world/items';
import { buyOffer, CURRENCY, MARKET_STOCK } from '../world/shop';
import { Inventory } from './inventory';
import { splitCoins, Wallet, WALLET_MAX } from './wallet';

describe('carteira do painel do personagem (v0.93.122)', () => {
  it('as moedas viram prata (100) e ouro (100 de prata)', () => {
    expect(splitCoins(0)).toEqual({ gold: 0, silver: 0, copper: 0 });
    expect(splitCoins(99)).toEqual({ gold: 0, silver: 0, copper: 99 });
    expect(splitCoins(100)).toEqual({ gold: 0, silver: 1, copper: 0 });
    expect(splitCoins(12345)).toEqual({ gold: 1, silver: 23, copper: 45 });
    expect(splitCoins(10000)).toEqual({ gold: 1, silver: 0, copper: 0 });
  });

  it('a carteira valida: não gasta o que não tem, não passa do teto, ignora lixo', () => {
    const w = new Wallet();
    w.add(10);
    expect(w.take(11)).toBe(false);
    expect(w.copper).toBe(10);
    expect(w.take(4)).toBe(true);
    w.add(WALLET_MAX * 2);
    expect(w.copper).toBe(WALLET_MAX);
    w.set('x');
    expect(w.copper).toBe(0);
    w.set(-5);
    expect(w.copper).toBe(0);
  });

  it('a Moeda de Cobre vive na carteira, fora da bolsa, e a morte não a leva; o resto da bolsa vai', () => {
    const inv = new Inventory();
    inv.add(Item.COPPER_COIN, 30);
    inv.add(Item.WHEAT, 3);
    expect(inv.count(Item.COPPER_COIN)).toBe(30);
    expect(inv.wallet.copper).toBe(30);
    expect(inv.entries().some(([id]) => id === Item.COPPER_COIN)).toBe(false); // não aparece na bolsa
    inv.dropOnDeath();
    expect(inv.count(Item.WHEAT)).toBe(0);
    expect(inv.wallet.copper).toBe(30);
    expect(inv.take(Item.COPPER_COIN, 31)).toBe(false);
    expect(inv.take(Item.COPPER_COIN, 10)).toBe(true);
    expect(inv.wallet.copper).toBe(20);
  });

  it('a loja gasta da carteira (mesma interface)', () => {
    const inv = new Inventory();
    const offer = MARKET_STOCK[0];
    expect(buyOffer(inv, offer)).toBe('coins');
    inv.add(CURRENCY, offer.price + 3);
    expect(buyOffer(inv, offer)).toBe('ok');
    expect(inv.wallet.copper).toBe(3);
  });

  it('salvamento antigo: as moedas da bolsa (v20) migram para a carteira; replaceAll também', () => {
    const inv = new Inventory();
    inv.add(Item.COPPER_COIN, 5);
    inv.replaceAll({ wheat: 1, copper_coin: 9 });
    expect(inv.wallet.copper).toBe(9); // substitui, não soma ao que havia
  });
});
