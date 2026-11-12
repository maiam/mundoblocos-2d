import { describe, expect, it } from 'vitest';
import { GOBLIN_COIN_DROP, Item, ITEMS, LOOT_ITEMS, monsterDrops } from './items';

describe('espólio do goblin', () => {
  it('solta sempre 2 moedas de cobre, e nada mais', () => {
    expect(GOBLIN_COIN_DROP).toBe(2);
    for (const r of [0, 0.5, 0.999]) {
      expect(monsterDrops('goblin', () => r)).toEqual([{ item: Item.COPPER_COIN, count: 2 }]);
    }
  });

  it('a moeda de cobre é um item de espólio com nome em português', () => {
    expect(ITEMS.copper_coin.name).toBe('Moeda de Cobre');
    expect(ITEMS.copper_coin.loot).toBe(true);
    expect(LOOT_ITEMS).toContain(Item.COPPER_COIN);
  });
});
