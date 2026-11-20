import { describe, expect, it } from 'vitest';
import { breakOrCollect, furnaceAt, furnaceMoveIn, furnaceTakeOut } from './actions';
import { accepts, canSmelt, COOK_TIME_S, FUEL_TIME_S, furnaceFromData, furnaceToData, isFuel, isLit, newFurnace, smeltRecipe, tickFurnace } from './furnace';
import { Item } from './items';
import { MemoryTitanStorage } from './save';
import { flush, openSession, tickFurnaces } from './session';
import { T } from './voxel';

const run = (f: ReturnType<typeof newFurnace>, secs: number, step = 0.1): void => { for (let t = 0; t < secs - 1e-9; t += step) tickFurnace(f, step); };
const Y = 150;
const slotOf = (s: { inventory: { get(i: number): { item: number } | null } }, item: number): number => Array.from({ length: 36 }, (_, i) => i).find((i) => s.inventory.get(i)?.item === item)!;

describe('fornalha (ADR 0068): regras puras', () => {
  it('só aceita o que serve: entrada com receita (fragmento de cobre), combustível que queima (brasa)', () => {
    expect(smeltRecipe(Item.COPPER_SHARD)!.result.item).toBe(Item.COPPER_INGOT); expect(smeltRecipe(Item.SAND)).toBeNull();
    expect(accepts('input', Item.COPPER_SHARD)).toBe(true); expect(accepts('input', Item.EMBER)).toBe(false); expect(accepts('fuel', Item.EMBER)).toBe(true); expect(accepts('fuel', Item.SAND)).toBe(false); expect(accepts('output', Item.EMBER)).toBe(false);
    expect(isFuel(Item.EMBER)).toBe(true); expect(FUEL_TIME_S[Item.EMBER]).toBe(80); expect(COOK_TIME_S).toBe(10);
  });
  it('acende só quando há o que cozinhar e consome 1 combustível na hora; 10 s por lingote (2 fragmentos); a brasa rende 8 preparações', () => {
    const f = newFurnace(); f.fuel = { item: Item.EMBER, count: 2 };
    run(f, 5); expect(isLit(f)).toBe(false); expect(f.fuel.count).toBe(2); // sem entrada: não acende
    f.input = { item: Item.COPPER_SHARD, count: 4 };
    tickFurnace(f, 0.1); expect(isLit(f)).toBe(true); expect(f.fuel.count).toBe(1); expect(f.burnTotal).toBe(80);
    run(f, 10); expect(f.output).toEqual({ item: Item.COPPER_INGOT, count: 1 }); expect(f.input!.count).toBe(2);
    run(f, 10.5); expect(f.output!.count).toBe(2); expect(f.input).toBeNull();
    run(f, 70); expect(isLit(f)).toBe(false); expect(f.fuel!.count).toBe(1); // sem entrada o fogo corre até o fim e a segunda brasa não é gasta
    expect(f.cook).toBe(0);
  });
  it('tirar a entrada depois de acender não apaga (o combustível já foi gasto); sem fogo o progresso regride; saída cheia ou com outro item bloqueia', () => {
    const f = newFurnace(); f.fuel = { item: Item.EMBER, count: 1 }; f.input = { item: Item.COPPER_SHARD, count: 2 };
    run(f, 4); expect(isLit(f)).toBe(true); expect(f.cook).toBeGreaterThan(3.5);
    f.input = null; run(f, 1); expect(isLit(f)).toBe(true); expect(f.burnLeft).toBeGreaterThan(70); expect(f.cook).toBeLessThan(2.2); // fogo continua, cozimento regride
    const g = newFurnace(); g.input = { item: Item.COPPER_SHARD, count: 2 }; g.output = { item: Item.COPPER_INGOT, count: 64 }; g.fuel = { item: Item.EMBER, count: 1 };
    expect(canSmelt(g)).toBe(false); run(g, 5); expect(isLit(g)).toBe(false); expect(g.fuel.count).toBe(1);
    g.output = { item: Item.SAND, count: 1 }; expect(canSmelt(g)).toBe(false);
  });
  it('gravar e ler com limites; entrada/combustível que não servem são descartados', () => {
    const f = newFurnace(); f.input = { item: Item.COPPER_SHARD, count: 3 }; f.fuel = { item: Item.EMBER, count: 2 }; f.output = { item: Item.COPPER_INGOT, count: 5 }; f.burnLeft = 42.3; f.burnTotal = 80; f.cook = 6.5;
    const back = furnaceFromData(JSON.parse(JSON.stringify(furnaceToData(f))));
    expect(back).toEqual({ ...f, burnLeft: 42.3, cook: 6.5 });
    const bad = furnaceFromData({ i: [Item.SAND, 3], f: [Item.SAND, 1], o: [Item.COPPER_INGOT, 999], b: 9999, t: -5, c: 99 });
    expect(bad.input).toBeNull(); expect(bad.fuel).toBeNull(); expect(bad.output).toBeNull(); expect(bad.burnLeft).toBe(0); expect(bad.cook).toBe(10);
    expect(furnaceFromData(undefined)).toEqual(newFurnace());
  });
});

describe('fornalha no mundo (ADR 0068)', () => {
  it('põe fragmentos e brasa, fecha a tela (só o tempo corre) e o braseiro trabalha sozinho: acende, entrega 2 lingotes, apaga; persiste no meio e tudo se tira para a mochila', async () => {
    const st = new MemoryTitanStorage();
    const s = await openSession(st, 42, () => 1);
    const x = 10, z = 10;
    s.volume.place(x, Y, z, T.BRAZIER);
    s.inventory.add(Item.COPPER_SHARD, 4); s.inventory.add(Item.EMBER, 1); s.inventory.add(Item.SAND, 3);
    expect(furnaceMoveIn(s, x, Y, z, 'input', slotOf(s, Item.SAND)).msg).toBe('O braseiro não cozinha isso'); expect(s.inventory.total(Item.SAND)).toBe(3);
    expect(furnaceMoveIn(s, x, Y, z, 'fuel', slotOf(s, Item.COPPER_SHARD)).msg).toBe('Isso não queima');
    expect(furnaceMoveIn(s, x, Y, z, 'input', slotOf(s, Item.COPPER_SHARD)).ok).toBe(true); expect(s.inventory.total(Item.COPPER_SHARD)).toBe(0);
    expect(furnaceMoveIn(s, x, Y, z, 'fuel', slotOf(s, Item.EMBER)).ok).toBe(true);
    expect(s.volume.get(x, Y, z)).toBe(T.BRAZIER); // ainda apagado até o primeiro passo
    for (let t = 0; t < 12; t += 0.1) tickFurnaces(s, 0.1);
    expect(s.volume.get(x, Y, z)).toBe(T.BRAZIER_LIT); expect(furnaceAt(s, x, Y, z)!.output!.count).toBe(1);
    await flush(st, s);
    const o = await openSession(st, null, () => 1); // reabrir no meio: o estado volta
    const f = furnaceAt(o, x, Y, z)!; expect(f.output!.count).toBe(1); expect(f.burnLeft).toBeGreaterThan(60); expect(o.volume.get(x, Y, z)).toBe(T.BRAZIER_LIT);
    for (let t = 0; t < 100; t += 0.1) tickFurnaces(o, 0.1);
    expect(o.volume.get(x, Y, z)).toBe(T.BRAZIER); expect(furnaceAt(o, x, Y, z)!.output!.count).toBe(2); expect(isLit(furnaceAt(o, x, Y, z)!)).toBe(false);
    expect(furnaceTakeOut(o, x, Y, z, 'output').ok).toBe(true); expect(o.inventory.total(Item.COPPER_INGOT)).toBe(2); expect(furnaceAt(o, x, Y, z)!.output).toBeNull();
  });
  it('quebrar o braseiro cospe o conteúdo no chão e devolve o bloco; mochila cheia não deixa tirar da saída', async () => {
    const s = await openSession(new MemoryTitanStorage(), 42, () => 1);
    const x = 5, z = 5;
    s.volume.place(x, Y, z, T.BRAZIER);
    const f = furnaceAt(s, x, Y, z)!; f.input = { item: Item.COPPER_SHARD, count: 3 }; f.fuel = { item: Item.EMBER, count: 1 }; f.output = { item: Item.COPPER_INGOT, count: 2 };
    for (let i = 0; i < 36; i++) s.inventory.add(Item.SAND, 64);
    expect(furnaceTakeOut(s, x, Y, z, 'output').msg).toBe('Mochila cheia'); expect(f.output!.count).toBe(2);
    for (let i = 0; i < 9; i++) s.inventory.consume(0);
    // libera a mochila para o bloco do braseiro voltar
    for (let i = 0; i < 64; i++) s.inventory.consume(5);
    expect(breakOrCollect(s, { x, y: Y, z, nx: 0, ny: 1, nz: 0 }).ok).toBe(true);
    expect(s.inventory.total(Item.BRAZIER)).toBe(1); expect(s.furnaces.size).toBe(0);
    const spilled = [...s.drops.values()].filter((d) => d.id.startsWith('f:'));
    expect(spilled.map((d) => [d.item, d.count ?? 1]).sort()).toEqual([[Item.COPPER_SHARD, 3], [Item.EMBER, 1], [Item.COPPER_INGOT, 2]].sort());
  });
});
