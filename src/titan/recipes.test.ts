import { describe, expect, it } from 'vitest';
import { Inventory, SLOTS } from './inventory';
import { Item } from './items';
import { blockedReason, craft, ingredientStatus, matchBench, previewCells, recipeById, RECIPES } from './recipes';

const lanterna = recipeById('lanterna')!, lente = recipeById('lente')!, mesa = recipeById('mesa')!;
const fill = (i: Inventory, item: number): void => { while (i.canAdd(item)) i.add(item, 1); };
const snapshot = (i: Inventory): string => JSON.stringify(i.toData());

describe('catálogo de receitas (ADR 0045)', () => {
  it('o catálogo tem mesa (4 rochas, pessoal), lente (1 fragmento de gelo, mesa), lanterna (2 fragmentos de rocha + lente + brasa, mesa) laje (3 rochas → 6 lajes, mesa), Marco de Margem e Painel de Junco (mesa)', () => {
    expect(RECIPES.map((r) => r.id)).toEqual(['mesa', 'lente', 'lanterna', 'marco', 'painel', 'laje', 'picareta-rocha', 'braseiro', 'revestimento', 'lingote-cobre', 'balde', 'cama', 'bau', 'escada', 'esteira', 'noz-torrada', 'carne-assada', 'picareta-cobre', 'adaga-rocha', 'adaga-cobre', 'ambar-compactado', 'ambar-desmontar']);
    expect(recipeById('marco')).toMatchObject({ station: 'workbench', group: 'construcao', result: { item: Item.MARCO, count: 1 }, ingredients: [{ item: Item.ROCK_SHARD, count: 1 }, { item: Item.GLASS_REED, count: 1 }] });
    expect(recipeById('painel')).toMatchObject({ station: 'workbench', group: 'construcao', result: { item: Item.PAINEL, count: 2 }, ingredients: [{ item: Item.GLASS_REED, count: 2 }, { item: Item.DARK_ROCK, count: 1 }] });
    expect(recipeById('laje')).toMatchObject({ station: 'workbench', result: { item: Item.SLAB, count: 6 }, ingredients: [{ item: Item.DARK_ROCK, count: 3 }] });
    expect(mesa).toMatchObject({ station: 'personal', result: { item: Item.WORKBENCH, count: 1 }, ingredients: [{ item: Item.DARK_ROCK, count: 4 }] });
    expect(lente).toMatchObject({ station: 'workbench', result: { item: Item.ICE_LENS, count: 1 }, ingredients: [{ item: Item.FROST_SHARD, count: 1 }] });
    expect(lanterna.ingredients).toEqual([{ item: Item.ROCK_SHARD, count: 2 }, { item: Item.ICE_LENS, count: 1 }, { item: Item.EMBER, count: 1 }]);
    expect(lanterna.result).toEqual({ item: Item.LANTERN, count: 1 });
  });

  it('cartão: possui / precisa vem do inventário', () => {
    const i = Inventory.starting(); i.add(Item.ROCK_SHARD, 1); i.add(Item.EMBER, 1);
    expect(ingredientStatus(i, lanterna)).toEqual([{ item: Item.ROCK_SHARD, have: 1, need: 2 }, { item: Item.ICE_LENS, have: 0, need: 1 }, { item: Item.EMBER, have: 1, need: 1 }]);
  });

  it('estação: a receita da mesa não fabrica na mochila; a pessoal fabrica em qualquer lugar', () => {
    const i = Inventory.starting(); i.add(Item.FROST_SHARD, 1); i.add(Item.DARK_ROCK, 4);
    expect(craft(i, lente, null)).toEqual({ ok: false, reason: 'station' });
    expect(blockedReason(i, lente, null)).toBe('station');
    expect(craft(i, lente, 'workbench').ok).toBe(true);
    expect(i.total(Item.ICE_LENS)).toBe(1); expect(i.total(Item.FROST_SHARD)).toBe(0);
    expect(craft(i, mesa, null).ok).toBe(true); // pessoal, sem estação
    expect(i.total(Item.WORKBENCH)).toBe(1); expect(i.total(Item.DARK_ROCK)).toBe(0);
  });

  it('falta de ingrediente: nada muda e o motivo aparece', () => {
    const i = Inventory.starting(); i.add(Item.ROCK_SHARD, 2); i.add(Item.EMBER, 1);
    const before = snapshot(i);
    expect(craft(i, lanterna, 'workbench')).toEqual({ ok: false, reason: 'missing' });
    expect(snapshot(i)).toBe(before);
    expect(blockedReason(i, lanterna, 'workbench')).toBe('missing');
  });

  it('lanterna completa: consome tudo e entrega uma lanterna numa operação só (cada confirmação fabrica uma vez)', () => {
    const i = Inventory.starting(); i.add(Item.ROCK_SHARD, 3); i.add(Item.ICE_LENS, 1); i.add(Item.EMBER, 1);
    expect(craft(i, lanterna, 'workbench').ok).toBe(true);
    expect(i.total(Item.LANTERN)).toBe(1); expect(i.total(Item.ROCK_SHARD)).toBe(1); expect(i.total(Item.ICE_LENS)).toBe(0); expect(i.total(Item.EMBER)).toBe(0);
    expect(craft(i, lanterna, 'workbench').reason).toBe('missing'); // segunda confirmação sem material
    expect(i.total(Item.LANTERN)).toBe(1);
  });

  it('mochila cheia, caso 1: consumir os ingredientes libera espaço suficiente → fabrica', () => {
    const i = Inventory.starting(); i.add(Item.FROST_SHARD, 1); // a lente (pilha de 64) entra no espaço liberado
    fill(i, Item.SAND); // enche tudo
    expect(i.canAdd(Item.ICE_LENS)).toBe(false);
    expect(blockedReason(i, lente, 'workbench')).toBeNull(); // depois do débito, o espaço do fragmento serve ao resultado
    expect(craft(i, lente, 'workbench').ok).toBe(true);
    expect(i.total(Item.ICE_LENS)).toBe(1); expect(i.total(Item.FROST_SHARD)).toBe(0);
  });

  it('mochila cheia, caso 2: mesmo depois do consumo simulado o resultado não cabe → recusa e nada muda', () => {
    // 2 fragmentos de gelo numa pilha só: gastar 1 não libera espaço; o resultado (a lente) não tem onde entrar
    const i = Inventory.starting(); i.add(Item.FROST_SHARD, 2);
    fill(i, Item.SAND);
    const before = snapshot(i);
    expect(blockedReason(i, lente, 'workbench')).toBe('full');
    expect(craft(i, lente, 'workbench')).toEqual({ ok: false, reason: 'full' });
    expect(snapshot(i)).toBe(before); // pilhas como estavam
  });

  it('o débito sai da mochila antes da hotbar e do menor para o maior', () => {
    const i = Inventory.starting(); i.add(Item.FROST_SHARD, 1); // espaço 0 (hotbar)
    for (let n = 1; n < 8; n++) i.add(Item.SAND, 64); // enche hotbar e parte da mochila
    i.add(Item.FROST_SHARD, 1); // mochila
    expect(craft(i, lente, 'workbench').ok).toBe(true);
    expect(i.get(0)?.item).toBe(Item.FROST_SHARD); // o da hotbar ficou
  });

  it('a grade 3 × 3 usa o mesmo catálogo (todas as receitas)', () => {
    expect(matchBench(new Map([[Item.DARK_ROCK, 4]]))?.id).toBe('mesa');
    expect(matchBench(new Map([[Item.FROST_SHARD, 1]]))?.id).toBe('lente');
    expect(SLOTS).toBe(36);
  });

  it('prévia: uma célula por unidade pedida; o tanto que o jogador tem é repartido (4 → 1,1,1,1 · 3 → 1,1,1,0 · 12 → 3 cada · 9 → 3,2,2,2)', () => {
    const mesa = recipeById('mesa')!;
    const shares = (n: number): number[] => { const i = Inventory.starting(); if (n) i.add(Item.DARK_ROCK, n); return previewCells(i, mesa).map((c) => c.share); };
    expect(shares(4)).toEqual([1, 1, 1, 1]);
    expect(shares(3)).toEqual([1, 1, 1, 0]);
    expect(shares(12)).toEqual([3, 3, 3, 3]);
    expect(shares(9)).toEqual([3, 2, 2, 2]);
    expect(shares(0)).toEqual([0, 0, 0, 0]);
    const inv = Inventory.starting(); inv.add(Item.ROCK_SHARD, 2); inv.add(Item.ICE_LENS, 1);
    const l = previewCells(inv, recipeById('lanterna')!);
    expect(l.map((c) => [c.item, c.share])).toEqual([[Item.ROCK_SHARD, 1], [Item.ROCK_SHARD, 1], [Item.ICE_LENS, 1], [Item.EMBER, 0]]);
  });
});
