import { describe, expect, it } from 'vitest';
import { BENCH_SLOTS, BENCH_START, CRAFT_START, HOTBAR, Inventory, SLOTS } from './inventory';
import { Item } from './items';
import { matchBench, recipeById } from './recipes';
import { MemoryTitanStorage } from './save';
import { flush, openSession } from './session';

/** Coloca `n` unidades de `item` na célula `cell` da grade da mesa, um toque (uma unidade) por vez, como o jogador faz. */
function put(inv: Inventory, item: number, cell: number, n = 1): void {
  for (let k = 0; k < n; k++) {
    const from = [...Array(SLOTS).keys()].find((i) => inv.get(i)?.item === item)!;
    expect(inv.move(from, BENCH_START + cell)).toBe(true);
  }
}
const fill = (i: Inventory, item: number): void => { while (i.canAdd(item)) i.add(item, 1); };
const snap = (i: Inventory): string => JSON.stringify(i.toData());

describe('grade 3 × 3 da Mesa de Trabalho (ADR 0049)', () => {
  it('catálogo: as três receitas da mesa pedem quantidades exatas, em qualquer disposição', () => {
    expect(matchBench(new Map([[Item.FROST_SHARD, 1]]))?.id).toBe('lente');
    expect(matchBench(new Map([[Item.EMBER, 1], [Item.ROCK_SHARD, 2], [Item.ICE_LENS, 1]]))?.id).toBe('lanterna');
    expect(matchBench(new Map([[Item.DARK_ROCK, 3]]))?.id).toBe('laje');
    expect(matchBench(new Map([[Item.DARK_ROCK, 4]]))).toBeNull(); // extra
    expect(matchBench(new Map([[Item.DARK_ROCK, 2]]))).toBeNull(); // faltando
    expect(matchBench(new Map([[Item.FROST_SHARD, 1], [Item.SAND, 1]]))).toBeNull(); // errado
    expect(matchBench(new Map([[Item.ROCK_SHARD, 2], [Item.ICE_LENS, 1]]))).toBeNull(); // sem a brasa
    expect(matchBench(new Map())).toBeNull();
  });

  it('cada toque põe uma unidade na célula; as unidades podem ficar em células diferentes ou na mesma', () => {
    const i = Inventory.starting(); i.add(Item.DARK_ROCK, 3);
    put(i, Item.DARK_ROCK, 0); put(i, Item.DARK_ROCK, 4); put(i, Item.DARK_ROCK, 8);
    expect(i.get(BENCH_START + 4)).toEqual({ item: Item.DARK_ROCK, count: 1 });
    expect(i.benchResult()).toEqual({ item: Item.SLAB, count: 6 });
    const j = Inventory.starting(); j.add(Item.DARK_ROCK, 3);
    put(j, Item.DARK_ROCK, 2, 3); // as três na mesma célula
    expect(j.get(BENCH_START + 2)).toEqual({ item: Item.DARK_ROCK, count: 3 });
    expect(j.benchResult()).toEqual({ item: Item.SLAB, count: 6 });
  });

  it('fabrica as três receitas manualmente: lente, lanterna e **três rochas rendem seis lajes em uma única retirada**', () => {
    const i = Inventory.starting(); i.add(Item.FROST_SHARD, 1); i.add(Item.ROCK_SHARD, 2); i.add(Item.EMBER, 1); i.add(Item.DARK_ROCK, 3);
    put(i, Item.FROST_SHARD, 4);
    expect(i.takeBenchResult()).toBe('ok');
    expect(i.total(Item.ICE_LENS)).toBe(1); expect(i.total(Item.FROST_SHARD)).toBe(0);
    put(i, Item.ROCK_SHARD, 0, 2); put(i, Item.ICE_LENS, 1); put(i, Item.EMBER, 8);
    expect(i.benchResult()).toEqual({ item: Item.LANTERN, count: 1 });
    expect(i.takeBenchResult()).toBe('ok');
    expect(i.total(Item.LANTERN)).toBe(1);
    put(i, Item.DARK_ROCK, 3, 3);
    expect(i.takeBenchResult()).toBe('ok');
    expect(i.total(Item.SLAB)).toBe(6); // uma única retirada
    expect(i.total(Item.DARK_ROCK)).toBe(0);
    for (let c = 0; c < BENCH_SLOTS; c++) expect(i.get(BENCH_START + c)).toBeNull(); // a grade ficou vazia
  });

  it('ingrediente errado, extra ou faltando deixa a saída vazia e nada é consumido; toque repetido na saída não duplica', () => {
    const i = Inventory.starting(); i.add(Item.FROST_SHARD, 2); i.add(Item.SAND, 1);
    put(i, Item.FROST_SHARD, 0); put(i, Item.SAND, 1);
    expect(i.benchResult()).toBeNull(); // errado: gelo + areia
    const before = snap(i);
    expect(i.takeBenchResult()).toBe('none');
    expect(snap(i)).toBe(before);
    expect(i.move(BENCH_START + 1, HOTBAR + 3)).toBe(true); // tira a areia para um espaço vazio da bolsa
    expect(i.benchResult()?.item).toBe(Item.ICE_LENS);
    put(i, Item.FROST_SHARD, 2); // extra: 2 fragmentos de gelo na grade
    expect(i.benchResult()).toBeNull();
    expect(i.takeBenchResult()).toBe('none');
    expect(i.move(BENCH_START + 2, HOTBAR + 4)).toBe(true); // devolve o extra
    expect(i.takeBenchResult()).toBe('ok');
    expect(i.takeBenchResult()).toBe('none'); // segundo toque na saída: a grade está vazia, nada duplica
    expect(i.total(Item.ICE_LENS)).toBe(1);
    expect(i.total(Item.FROST_SHARD)).toBe(1); // 2 fragmentos: 1 virou lente, o outro voltou para a bolsa
  });

  it('bolsa cheia: a saída não sai e todos os ingredientes ficam na grade', () => {
    const i = Inventory.starting(); i.add(Item.DARK_ROCK, 3);
    put(i, Item.DARK_ROCK, 0, 3); // ocupa 1 espaço da bolsa que fica livre (a pilha saiu): preenche tudo com outro item
    fill(i, Item.SAND);
    expect(i.canAdd(Item.SLAB)).toBe(false);
    const before = snap(i);
    expect(i.takeBenchResult()).toBe('full');
    expect(snap(i)).toBe(before);
    expect(i.get(BENCH_START)).toEqual({ item: Item.DARK_ROCK, count: 3 });
  });

  it('a grade da mesa é separada da pessoal: itens de uma não aparecem na outra nem na contagem da bolsa', () => {
    const i = Inventory.starting(); i.add(Item.DARK_ROCK, 4);
    put(i, Item.DARK_ROCK, 0);
    expect(i.total(Item.DARK_ROCK)).toBe(3); // a grade não conta
    expect(i.benchTotals().get(Item.DARK_ROCK)).toBe(1);
    expect(i.craftRecipe()).toBeNull(); // a grade pessoal continua vazia
    for (let k = 0; k < 4; k++) i.move(0, CRAFT_START + k);
    expect(i.benchTotals().get(Item.DARK_ROCK)).toBe(1); // e a da mesa não mudou
  });

  it('fechar devolve a grade à bolsa e à hotbar; o que não couber fica na grade, com a contagem do que sobrou', () => {
    const i = Inventory.starting(); i.add(Item.DARK_ROCK, 3); i.add(Item.FROST_SHARD, 1);
    put(i, Item.DARK_ROCK, 0, 2); put(i, Item.FROST_SHARD, 1);
    expect(i.returnBench()).toBe(0);
    expect(i.total(Item.DARK_ROCK)).toBe(3); expect(i.total(Item.FROST_SHARD)).toBe(1);
    for (let c = 0; c < BENCH_SLOTS; c++) expect(i.get(BENCH_START + c)).toBeNull();
    expect(Inventory.starting().returnBench()).toBe(0);
  });

  it('bolsa lotada: nada volta e tudo fica na grade; com espaço para só parte, volta uma unidade por vez e o resto fica; nada se perde', () => {
    const i = Inventory.starting(); i.add(Item.DARK_ROCK, 2); i.add(Item.FROST_SHARD, 1);
    put(i, Item.DARK_ROCK, 0, 2); put(i, Item.FROST_SHARD, 1);
    fill(i, Item.SAND);
    expect(i.canAdd(Item.DARK_ROCK)).toBe(false);
    expect(i.returnBench()).toBe(3);
    expect(i.get(BENCH_START)).toEqual({ item: Item.DARK_ROCK, count: 2 });
    expect(i.get(BENCH_START + 1)).toEqual({ item: Item.FROST_SHARD, count: 1 });
    // abre espaço para uma pilha: cabem as rochas (um espaço) e sobra o gelo
    for (let k = 0; k < 64; k++) i.consume(HOTBAR);
    expect(i.returnBench()).toBe(1);
    expect(i.total(Item.DARK_ROCK)).toBe(2);
    expect(i.get(BENCH_START + 1)).toEqual({ item: Item.FROST_SHARD, count: 1 }); // o que não coube continua na grade
    expect(i.total(Item.DARK_ROCK) + i.total(Item.FROST_SHARD) + [...i.benchTotals().values()].reduce((x, y) => x + y, 0)).toBe(3); // nada se perdeu
  });

  it('save: grade da mesa gravada (v3), saves anteriores abrem com ela vazia e as pilhas, a seleção e a grade 2 × 2 intactas', () => {
    const i = Inventory.starting(); i.add(Item.DARK_ROCK, 5); i.add(Item.SAND, 9);
    put(i, Item.DARK_ROCK, 3, 2);
    for (let k = 0; k < 2; k++) i.move(0, CRAFT_START + k); // grade 2 × 2 com 2 rochas
    const d = JSON.parse(JSON.stringify(i.toData()));
    expect(d.v).toBe(3); expect(d.bench[3]).toEqual([Item.DARK_ROCK, 2]);
    const j = Inventory.fromData(d);
    expect(j.get(BENCH_START + 3)).toEqual({ item: Item.DARK_ROCK, count: 2 });
    expect(snap(j)).toBe(snap(i));
    const old = { ...d, v: 2 as const }; delete old.bench; // save v2 (sem a grade da mesa)
    const k = Inventory.fromData(old);
    for (let c = 0; c < BENCH_SLOTS; c++) expect(k.get(BENCH_START + c)).toBeNull();
    for (let n = 0; n < SLOTS; n++) expect(k.get(n)).toEqual(i.get(n));
    expect(k.get(CRAFT_START)).toEqual(i.get(CRAFT_START));
  });

  it('sessão: ingredientes pendentes na bancada sobrevivem ao salvar e reabrir sem duplicar (voltam à bolsa se couberem; se não, ficam na grade)', async () => {
    const st = new MemoryTitanStorage();
    const s = await openSession(st, 42, () => 1);
    s.inventory.add(Item.DARK_ROCK, 3);
    put(s.inventory, Item.DARK_ROCK, 5, 3);
    await flush(st, s);
    const r = await openSession(st, null, () => 1);
    expect(r.inventory.total(Item.DARK_ROCK)).toBe(3); // voltou à bolsa
    expect(r.inventory.benchTotals().size).toBe(0);
    // bolsa lotada: o pendente fica na grade e continua lá ao reabrir
    const st2 = new MemoryTitanStorage();
    const s2 = await openSession(st2, 42, () => 1);
    s2.inventory.add(Item.DARK_ROCK, 3);
    put(s2.inventory, Item.DARK_ROCK, 5, 3);
    fill(s2.inventory, Item.SAND);
    await flush(st2, s2);
    const r2 = await openSession(st2, null, () => 1);
    expect(r2.inventory.get(BENCH_START + 5)).toEqual({ item: Item.DARK_ROCK, count: 3 });
    expect(r2.inventory.benchResult()).toEqual({ item: Item.SLAB, count: 6 });
    expect(recipeById('laje')!.result.count).toBe(6);
  });
});
