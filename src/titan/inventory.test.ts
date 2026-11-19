import { describe, expect, it } from 'vitest';
import { BENCH_START, CRAFT_START, HOTBAR, Inventory, OUTPUT, SLOTS } from './inventory';
import { Item, maxStack } from './items';

const full = (): Inventory => { const i = new Inventory(); for (let n = 0; n < SLOTS; n++) i.add(Item.CAPSULE, 1); return i; };

describe('inventário do Titã', () => {
  it('começa de mãos vazias (a cápsula saiu, o id 7 fica reservado); hotbar de 7 + mochila de 24', () => {
    const i = Inventory.starting();
    expect(HOTBAR).toBe(9); expect(SLOTS - HOTBAR).toBe(27); // hotbar de 9 + mochila 3 × 9 (ADR 0047)
    for (let n = 0; n < SLOTS; n++) expect(i.get(n)).toBeNull();
    expect(Item.CAPSULE).toBe(7);
  });
  it('blocos e fragmentos empilham até 64; cápsula, lanterna e mesa até 1', () => {
    const i = new Inventory();
    expect(i.add(Item.SAND, 70)).toBe(true);
    expect(i.get(0)).toEqual({ item: Item.SAND, count: 64 });
    expect(i.get(1)).toEqual({ item: Item.SAND, count: 6 });
    i.add(Item.CAPSULE, 1); i.add(Item.CAPSULE, 1);
    expect(i.total(Item.CAPSULE)).toBe(2);
    expect(i.get(2)?.count).toBe(1); expect(i.get(3)?.count).toBe(1); // um por espaço
  });
  it('mochila cheia: tudo ou nada, sem mudar nada', () => {
    const i = full();
    const rev = i.rev;
    expect(i.add(Item.ROCK_SHARD, 1)).toBe(false);
    expect(i.rev).toBe(rev);
    expect(i.canAdd(Item.CAPSULE)).toBe(false);
    const p = new Inventory(); p.add(Item.SAND, 64 * SLOTS - 1);
    expect(p.add(Item.SAND, 2)).toBe(false); // cabe 1, pedido 2: nada entra
    expect(p.total(Item.SAND)).toBe(64 * SLOTS - 1);
  });
  it('mover une pilhas até o limite, troca itens diferentes e não perde quantidade', () => {
    const i = new Inventory(); i.add(Item.SAND, 64); i.add(Item.SAND, 10); i.add(Item.ROCK_SHARD, 3);
    expect(i.move(1, 0)).toBe(false); // pilha de destino cheia
    expect(i.move(2, 20)).toBe(true); // vazio
    expect(i.get(20)).toEqual({ item: Item.ROCK_SHARD, count: 3 });
    expect(i.move(20, 1)).toBe(true); // troca
    expect(i.get(1)).toEqual({ item: Item.ROCK_SHARD, count: 3 }); expect(i.get(20)).toEqual({ item: Item.SAND, count: 10 });
    expect(i.total(Item.SAND)).toBe(74);
  });
  it('grade 3 × 3 única: quatro rochas formam a Mesa de Trabalho sem estação (receita pessoal); a saída consome a grade', () => {
    const i = Inventory.starting(); i.add(Item.DARK_ROCK, 6);
    for (let k = 0; k < 4; k++) i.move(0, BENCH_START + k); // 1 por vez
    expect(i.benchResult()).toEqual({ item: Item.WORKBENCH, count: 1 });
    expect(i.total(Item.DARK_ROCK)).toBe(2); // as outras duas continuam
    expect(i.takeBenchResult(null)).toBe('ok');
    expect(i.total(Item.WORKBENCH)).toBe(1); expect(i.benchResult()).toBeNull();
  });
  it('receita da Mesa montada na grade sem a Mesa não sai (station); com ingredientes a menos, a mais ou diferentes não forma receita', () => {
    const i = Inventory.starting(); i.add(Item.DARK_ROCK, 5); i.add(Item.SAND, 1);
    for (let k = 0; k < 3; k++) i.move(0, BENCH_START + k);
    expect(i.benchResult()?.item).toBe(Item.SLAB); // 3 rochas = laje (da Mesa)
    expect(i.takeBenchResult(null)).toBe('station'); expect(i.benchTotals().get(Item.DARK_ROCK)).toBe(3); // nada consumido
    i.move(1, BENCH_START + 3);
    expect(i.benchResult()).toBeNull(); // 3 rochas + areia
  });
  it('mochila cheia: a mesa da grade só sai se couber; os ingredientes ficam na grade', () => {
    const i = Inventory.starting(); i.add(Item.DARK_ROCK, 4);
    for (let k = 0; k < 4; k++) i.move(0, BENCH_START + k);
    for (let n = 0; n < SLOTS; n++) i.add(Item.SAND, 64); // enche tudo
    expect(i.takeBenchResult(null)).toBe('full');
    expect(i.benchResult()).not.toBeNull(); // nada foi consumido
    expect(i.returnBench()).toBeGreaterThan(0);
  });
  it('convertItem troca as pilhas de um item por outro, uma única vez', () => {
    const i = Inventory.fromData({ v: 1, slots: [[Item.CAPSULE, 1], null, [Item.SAND, 3]], craft: [[Item.CAPSULE, 1]] });
    expect(i.convertItem(Item.CAPSULE, Item.EMBER)).toBe(2);
    expect(i.total(Item.EMBER)).toBe(1); expect(i.get(CRAFT_START)?.item).toBe(Item.EMBER); expect(i.total(Item.CAPSULE)).toBe(0);
    expect(i.convertItem(Item.CAPSULE, Item.EMBER)).toBe(0); // nada a converter na segunda vez
  });
  it('fechar a mochila devolve a grade; serialização preserva tudo e descarta lixo', () => {
    const i = Inventory.starting(); i.add(Item.SAND, 5); i.add(Item.DARK_ROCK, 2);
    i.move(1, CRAFT_START); i.move(1, CRAFT_START + 1);
    const d = JSON.parse(JSON.stringify(i.toData()));
    const j = Inventory.fromData(d);
    expect(j.get(CRAFT_START)?.item).toBe(Item.DARK_ROCK);
    expect(j.returnCraft()).toBe(true);
    expect(j.total(Item.DARK_ROCK)).toBe(2);
    const bad = Inventory.fromData({ v: 1, slots: [[99, 1], [Item.SAND, 500], [Item.SAND, 3]], craft: [] });
    expect(bad.total(Item.SAND)).toBe(3);
    expect(OUTPUT).toBe(40);
  });

  it('migração por seção (save anterior): 7 da hotbar → 1–7, 8–9 vazios, 24 da bolsa → 10–33, 3 novos vazios, grade preservada, sem perder nem duplicar', () => {
    // bolsa cheia com itens distintos em cada seção (itens 1–11 em sequência, contagens diferentes)
    const slots: Array<[number, number] | null> = Array.from({ length: 31 }, (_, i) => [(i % 11) + 1, Math.min(maxStack((i % 11) + 1), (i % 5) + 1)]);
    const craft: Array<[number, number] | null> = [[Item.DARK_ROCK, 1], null, [Item.SAND, 1], null];
    const old = { v: 1 as const, slots, craft };
    const j = Inventory.fromData(old);
    for (let i = 0; i < 7; i++) expect(j.get(i)).toEqual({ item: slots[i]![0], count: slots[i]![1] }); // hotbar antiga → 0–6
    expect(j.get(7)).toBeNull(); expect(j.get(8)).toBeNull(); // 8 e 9 vazios
    for (let i = 0; i < 24; i++) expect(j.get(9 + i)).toEqual({ item: slots[7 + i]![0], count: slots[7 + i]![1] }); // bolsa antiga → 9–32
    for (let i = 33; i < SLOTS; i++) expect(j.get(i)).toBeNull(); // 3 espaços novos
    expect(j.get(CRAFT_START)).toEqual({ item: Item.DARK_ROCK, count: 1 }); expect(j.get(CRAFT_START + 1)).toBeNull(); expect(j.get(CRAFT_START + 2)).toEqual({ item: Item.SAND, count: 1 });
    // nada some e nada duplica: totais por item iguais
    const sum = (arr: Array<[number, number] | null>, item: number): number => arr.reduce((n, e) => n + (e && e[0] === item ? e[1] : 0), 0);
    for (let item = 1; item <= 11; item++) expect(j.total(item)).toBe(sum(slots, item));
    // gravar de novo usa o formato novo e é estável ao reabrir
    const d = j.toData();
    expect(d.v).toBe(3); expect(d.slots).toHaveLength(SLOTS);
    expect(JSON.stringify(Inventory.fromData(JSON.parse(JSON.stringify(d))).toData())).toBe(JSON.stringify(d));
  });
});
