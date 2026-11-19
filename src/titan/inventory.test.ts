import { describe, expect, it } from 'vitest';
import { CRAFT_START, HOTBAR, Inventory, OUTPUT, SLOTS } from './inventory';
import { Item } from './items';

const full = (): Inventory => { const i = new Inventory(); for (let n = 0; n < SLOTS; n++) i.add(Item.CAPSULE, 1); return i; };

describe('inventário do Titã', () => {
  it('começa só com a cápsula; hotbar de 7 + mochila de 24', () => {
    const i = Inventory.starting();
    expect(HOTBAR).toBe(7); expect(SLOTS - HOTBAR).toBe(24);
    expect(i.total(Item.CAPSULE)).toBe(1);
  });
  it('blocos e fragmentos empilham até 64; cápsula e lanterna até 1', () => {
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
  it('fabrica a lanterna com cápsula + fragmento de rocha + fragmento de gelo em qualquer disposição; pegar consome os ingredientes', () => {
    const i = Inventory.starting(); i.add(Item.ROCK_SHARD, 2); i.add(Item.FROST_SHARD, 1);
    // disposição manual diferente da do botão: gelo, cápsula e rocha nos cantos 3, 0, 2 (a pilha de 2 rochas entra 1 por vez)
    const find = (item: number): number => { for (let n = 0; n < SLOTS; n++) if (i.get(n)?.item === item) return n; return -1; };
    i.move(find(Item.FROST_SHARD), CRAFT_START + 3); i.move(find(Item.CAPSULE), CRAFT_START);
    expect(i.craftResult()).toBeNull();
    const rock = find(Item.ROCK_SHARD);
    i.move(rock, CRAFT_START + 2);
    expect(i.get(CRAFT_START + 2)).toEqual({ item: Item.ROCK_SHARD, count: 1 });
    expect(i.total(Item.ROCK_SHARD)).toBe(1); // a outra continua na mochila
    expect(i.craftResult()).toBe(Item.LANTERN);
    expect(i.takeResult()).toBe(true);
    expect(i.total(Item.LANTERN)).toBe(1);
    expect(i.total(Item.CAPSULE)).toBe(0); expect(i.craftResult()).toBeNull();
  });
  it('botão da receita preenche a grade e a lanterna sai; sem ingredientes não faz nada', () => {
    const i = Inventory.starting();
    expect(i.fillRecipe()).toBe(false);
    i.add(Item.ROCK_SHARD, 1); i.add(Item.FROST_SHARD, 1);
    expect(i.fillRecipe()).toBe(true);
    expect(i.total(Item.CAPSULE) + i.total(Item.ROCK_SHARD) + i.total(Item.FROST_SHARD)).toBe(0); // estão na grade
    expect(i.craftResult()).toBe(Item.LANTERN);
    expect(i.takeResult()).toBe(true);
    expect(i.total(Item.LANTERN)).toBe(1);
  });
  it('mochila cheia: a lanterna só sai se couber; os ingredientes ficam na grade', () => {
    const i = Inventory.starting(); i.add(Item.ROCK_SHARD, 1); i.add(Item.FROST_SHARD, 1);
    i.fillRecipe();
    for (let n = 0; n < SLOTS; n++) i.add(Item.SAND, 64); // enche tudo
    expect(i.takeResult()).toBe(false);
    expect(i.craftResult()).toBe(Item.LANTERN); // nada foi consumido
    // fechar a mochila com a grade cheia de ingredientes e sem vaga os mantém na grade (não se perdem)
    expect(i.returnCraft()).toBe(false);
    expect(i.get(CRAFT_START)).not.toBeNull();
  });
  it('fechar a mochila devolve a grade; serialização preserva tudo e descarta lixo', () => {
    const i = Inventory.starting(); i.add(Item.SAND, 5); i.add(Item.ROCK_SHARD, 1); i.add(Item.FROST_SHARD, 1);
    i.fillRecipe();
    const d = JSON.parse(JSON.stringify(i.toData()));
    const j = Inventory.fromData(d);
    expect(j.get(CRAFT_START)?.item).toBe(Item.CAPSULE);
    expect(j.returnCraft()).toBe(true);
    expect(j.total(Item.CAPSULE)).toBe(1);
    const bad = Inventory.fromData({ v: 1, slots: [[99, 1], [Item.SAND, 500], [Item.SAND, 3]], craft: [] });
    expect(bad.total(Item.SAND)).toBe(3);
    expect(OUTPUT).toBe(35);
  });
});
