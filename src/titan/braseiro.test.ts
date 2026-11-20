import { describe, expect, it } from 'vitest';
import { igniteBrazier, breakOrCollect, useBrazierCharge } from './actions';
import { BRAZIER_CHARGES, brazierKey } from './braziers';
import { BREAK_MS, breakTotalMs, PICK_FACTOR } from './breaking';
import { blockOfItem, isDagger, isPick, Item, itemOfBlock, maxStack, pickTier } from './items';
import { craft, RECIPES, stationMet } from './recipes';
import { MemoryTitanStorage } from './save';
import { discoverRecipes, flush, openSession } from './session';
import { isBrazier, isSolid, T, tileFor } from './voxel';
import { Inventory } from './inventory';

const Y = 150; // acima do relevo
async function open() {
  const st = new MemoryTitanStorage();
  const s = await openSession(st, 42, () => 1);
  return { st, s };
}
const hit = (x: number, y: number, z: number) => ({ x, y, z, nx: 0, ny: 1, nz: 0 });

describe('Braseiro de Rocha e ferramentas de cobre (ADR 0065)', () => {
  it('ids, tiles, itens e tempos: braseiro de rocha, picareta de cobre mais rápida, adagas', () => {
    expect(isBrazier(T.BRAZIER) && isBrazier(T.BRAZIER_LIT)).toBe(true); expect(isSolid(T.BRAZIER)).toBe(true);
    expect(tileFor(T.BRAZIER, 'top')).toBe(13); expect(tileFor(T.BRAZIER_LIT, 'top')).toBe(14); expect(tileFor(T.BRAZIER, 'side')).toBe(12); expect(tileFor(T.BRAZIER_LIT, 'bottom')).toBe(12);
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
    expect(craft(inv, r('lingote-cobre'), 'workbench').reason).toBe('station');
    expect(craft(inv, r('lingote-cobre'), 'brazier').ok).toBe(true); expect(inv.total(Item.COPPER_INGOT)).toBe(1); expect(inv.total(Item.COPPER_SHARD)).toBe(2);
  });
  it('a brasa acende o braseiro (8 preparações); aceso/outro bloco não gasta a brasa; a 8ª preparação apaga; vai no save', async () => {
    const { st, s } = await open();
    const x = 10, z = 10;
    expect(s.volume.place(x, Y, z, T.BRAZIER)).toBe(true); expect(s.volume.place(x + 2, Y, z, T.DARK_ROCK)).toBe(true);
    s.inventory.add(Item.EMBER, 2); const slot = Array.from({ length: 9 }, (_, i) => i).find((i) => s.inventory.get(i)?.item === Item.EMBER)!;
    expect(igniteBrazier(s, hit(x + 2, Y, z), slot).ok).toBe(false); expect(s.inventory.total(Item.EMBER)).toBe(2); // pedra comum: a brasa fica
    const r = igniteBrazier(s, hit(x, Y, z), slot);
    expect(r.ok).toBe(true); expect(s.volume.get(x, Y, z)).toBe(T.BRAZIER_LIT); expect(s.braziers.get(brazierKey(x, Y, z))).toBe(BRAZIER_CHARGES); expect(s.inventory.total(Item.EMBER)).toBe(1);
    expect(igniteBrazier(s, hit(x, Y, z), slot).msg).toBe('O braseiro já está aceso'); expect(s.inventory.total(Item.EMBER)).toBe(1);
    expect([...discoverRecipes(s)]).toContain('braseiro');
    for (let i = 0; i < 3; i++) expect(useBrazierCharge(s, x, Y, z).burnedOut).toBe(false);
    await flush(st, s);
    const o = await openSession(st, null, () => 1);
    expect(o.braziers.get(brazierKey(x, Y, z))).toBe(BRAZIER_CHARGES - 3); expect(o.volume.get(x, Y, z)).toBe(T.BRAZIER_LIT);
    for (let i = 0; i < BRAZIER_CHARGES - 4; i++) expect(useBrazierCharge(o, x, Y, z).burnedOut).toBe(false);
    expect(useBrazierCharge(o, x, Y, z).burnedOut).toBe(true);
    expect(o.volume.get(x, Y, z)).toBe(T.BRAZIER); expect(o.braziers.size).toBe(0);
  });
  it('levar o braseiro aceso devolve o item apagado e esquece a carga; gravação estragada é descartada', async () => {
    const { st, s } = await open();
    s.volume.place(5, Y, 5, T.BRAZIER); s.inventory.add(Item.EMBER);
    igniteBrazier(s, hit(5, Y, 5), 0 === 0 ? Array.from({ length: 9 }, (_, i) => i).find((i) => s.inventory.get(i)?.item === Item.EMBER)! : 0);
    expect(breakOrCollect(s, hit(5, Y, 5)).ok).toBe(true);
    expect(s.inventory.total(Item.BRAZIER)).toBe(1); expect(s.braziers.size).toBe(0); expect(s.volume.get(5, Y, 5)).toBe(T.AIR);
    await flush(st, s);
    st.games.get(42)!.braziers = { '9,9,9': 4, 'lixo': 3, '5,150,5': 99 } as unknown as Record<string, number>;
    const o = await openSession(st, null, () => 1);
    expect(o.braziers.size).toBe(0); // nenhum é um braseiro aceso de verdade
  });
});
