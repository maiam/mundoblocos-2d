import { describe, expect, it } from 'vitest';
import { BREAK_MS, breakTotalMs, PICK_FACTOR } from './breaking';
import { blockOfItem, isDagger, isPick, Item, itemOfBlock, maxStack, pickTier } from './items';
import { craft, RECIPES, stationMet } from './recipes';
import { isBrazier, isSolid, T, tileFor, tileIndex } from './voxel';
import { Inventory } from './inventory';


describe('Braseiro de Rocha e ferramentas de cobre (ADR 0065, 0068)', () => {
  it('ids, tiles, itens e tempos: braseiro de rocha, picareta de cobre mais rápida, adagas', () => {
    expect(isBrazier(T.BRAZIER) && isBrazier(T.BRAZIER_LIT)).toBe(true); expect(isSolid(T.BRAZIER)).toBe(true);
    expect(tileFor(T.BRAZIER, 'top')).toBe(tileIndex('17-braseiro-de-rocha/topo-apagado')); expect(tileFor(T.BRAZIER_LIT, 'top')).toBe(tileIndex('17-braseiro-de-rocha/topo-aceso')); expect(tileFor(T.BRAZIER, 'side')).toBe(tileIndex('17-braseiro-de-rocha/lateral-comum')); expect(tileFor(T.BRAZIER_LIT, 'bottom')).toBe(tileIndex('17-braseiro-de-rocha/lateral-comum'));
    expect(blockOfItem(Item.BRAZIER)).toBe(T.BRAZIER); expect(itemOfBlock(T.BRAZIER_LIT)).toBe(Item.BRAZIER); expect(itemOfBlock(T.BRAZIER)).toBe(Item.BRAZIER);
    expect(breakTotalMs('block', T.BRAZIER)).toBe(BREAK_MS.rock);
    expect(breakTotalMs('block', T.VEIN_COPPER, 'copper')).toBe(Math.round(BREAK_MS.rock * PICK_FACTOR.copper)); expect(PICK_FACTOR.copper).toBeLessThan(PICK_FACTOR.rock);
    expect(isPick(Item.COPPER_PICK) && !isPick(Item.COPPER_DAGGER) && isDagger(Item.STONE_DAGGER) && isDagger(Item.COPPER_DAGGER)).toBe(true);
    expect(pickTier(Item.STONE_PICK)).toBe('rock'); expect(pickTier(Item.COPPER_PICK)).toBe('copper'); expect(pickTier(Item.STONE_DAGGER)).toBeNull();
    for (const i of [Item.STONE_DAGGER, Item.COPPER_PICK, Item.COPPER_DAGGER]) expect(maxStack(i)).toBe(1);
  });
  it('receitas: braseiro (4 rochas, mesa), lingote (2 fragmentos, braseiro aceso), picareta e adagas (mesa); a estação do braseiro só atende receita do braseiro', () => {
    const r = (id: string) => RECIPES.find((x) => x.id === id)!;
    expect(r('braseiro').ingredients).toEqual([{ item: Item.DARK_ROCK, count: 4 }]); expect(r('braseiro').station).toBe('workbench');
    expect(r('lingote-cobre').station).toBe('brazier'); expect(r('lingote-cobre').ingredients).toEqual([{ item: Item.COPPER_SHARD, count: 2 }]);
    expect(r('picareta-cobre').ingredients).toEqual([{ item: Item.COPPER_INGOT, count: 3 }, { item: Item.DRY_REED, count: 2 }]);
    expect(r('adaga-rocha').ingredients).toEqual([{ item: Item.ROCK_SHARD, count: 1 }, { item: Item.DRY_REED, count: 1 }]);
    expect(r('adaga-cobre').ingredients).toEqual([{ item: Item.COPPER_INGOT, count: 1 }, { item: Item.DRY_REED, count: 1 }]);
    expect(stationMet(r('lingote-cobre'), 'brazier')).toBe(true); expect(stationMet(r('lingote-cobre'), 'workbench')).toBe(false); expect(stationMet(r('lingote-cobre'), null)).toBe(false);
    expect(stationMet(r('adaga-cobre'), 'brazier')).toBe(false); expect(stationMet(r('adaga-cobre'), 'workbench')).toBe(true); expect(stationMet(r('mesa'), 'brazier')).toBe(true);
    const inv = Inventory.starting(); inv.add(Item.COPPER_SHARD, 4);
    expect(craft(inv, r('lingote-cobre'), 'workbench').reason).toBe('station'); expect(craft(inv, r('lingote-cobre'), null).reason).toBe('station'); // o lingote só sai do braseiro (ADR 0068)
  });
});
