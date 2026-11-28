import { describe, expect, it } from 'vitest';
import { attackFauna, damageOf, FIST_DAMAGE } from '../combat';
import { HOTBAR, BAG } from '../inventory';
import { isDagger, isItem, isSword, isTool, Item, ITEM_NAMES, maxStack, toolOf } from '../items';
import { craft, recipeById } from '../recipes';
import { MemoryTitanStorage } from '../save';
import { openSession } from '../session';
import { maxDurability, wearCost } from '../wear';
import { T } from '../voxel';
import { ORVALIS_GENERATOR_VERSION, OrvalisGenerator, orvalisGeneratorFor } from './generator';

/** Espadas de madeira e de pedra do Orvalis (ADR 0145): dano 4/5 (Java), durabilidade 59/131, golpe −1 e bloco −2, receita na Mesa de Carpintaria. */
const open = () => openSession(new MemoryTitanStorage(), 42, () => 1, orvalisGeneratorFor, ORVALIS_GENERATOR_VERSION, (s, v) => new OrvalisGenerator(s, v));
type S = Awaited<ReturnType<typeof open>>;
const hold = (s: S, item: number): void => { s.inventory.add(item, 1); const i = [...Array(HOTBAR + BAG).keys()].find((k) => s.inventory.get(k)?.item === item)!; s.selected = i; };
const SWORDS: ReadonlyArray<[number, string, 'wood' | 'rock', number, number]> = [[Item.ESPADA_MADEIRA, 'Espada de Madeira', 'wood', 4, 59], [Item.ESPADA_PEDRA, 'Espada de Pedra', 'rock', 5, 131]];

describe('espadas do Orvalis (ADR 0145)', () => {
  it('itens 174 e 175: nome, tipo espada (não adaga), nível, pilha de 1, dano e durabilidade', () => {
    expect(Item.ESPADA_MADEIRA).toBe(174); expect(Item.ESPADA_PEDRA).toBe(175);
    for (const [item, name, tier, dmg, dur] of SWORDS) {
      expect(isItem(item) && isTool(item)).toBe(true); expect(ITEM_NAMES[item]).toBe(name);
      expect(toolOf(item)).toEqual({ kind: 'sword', tier }); expect(isSword(item)).toBe(true); expect(isDagger(item)).toBe(false);
      expect(maxStack(item)).toBe(1); expect(maxDurability(item)).toBe(dur); expect(damageOf(item)).toBe(dmg);
    }
    expect(isItem(177)).toBe(false); expect(damageOf(Item.ESPADA_PEDRA)).toBeGreaterThan(FIST_DAMAGE);
  });

  it('desgaste: golpe −1, bloco que não quebra de uma vez −2, bloco de quebra instantânea 0', () => {
    for (const [item] of SWORDS) {
      expect(wearCost(item, { type: 'attack' })).toBe(1);
      expect(wearCost(item, { type: 'break_block', block: T.STONE })).toBe(2);
      expect(wearCost(item, { type: 'break_block', block: T.LANTERN })).toBe(0);
    }
  });

  it('receitas na Mesa de Carpintaria (só no Orvalis): 2 tábuas de carvalho ou 2 de Pedra + 1 haste', async () => {
    const s = await open();
    for (const [id, mat, out] of [['espada-madeira', Item.TABUA_CARVALHO, Item.ESPADA_MADEIRA], ['espada-pedra', Item.STONE, Item.ESPADA_PEDRA]] as const) {
      const r = recipeById(id)!;
      expect(r.world).toBe('orvalis'); expect(r.station).toBe('workbench'); expect(r.result).toEqual({ item: out, count: 1 });
      expect(r.ingredients).toEqual([{ item: mat, count: 2 }, { item: Item.HASTE, count: 1 }]);
      s.inventory.add(mat, 2); s.inventory.add(Item.HASTE, 1);
      expect(craft(s.inventory, r, null)).toEqual({ ok: false, reason: 'station' });
      expect(craft(s.inventory, r, 'workbench').ok).toBe(true); expect(s.inventory.total(out)).toBe(1);
    }
  });

  it('no jogo: a espada de madeira tira 4 do animal, gasta 1 e quebra na 59ª pancada', async () => {
    const s = await open();
    hold(s, Item.ESPADA_MADEIRA);
    s.fauna[0].hp = 100;
    const r = attackFauna(s, 0);
    expect(r.ok).toBe(true); expect(r.damage).toBe(4); expect(s.fauna[0].hp).toBe(96);
    expect(s.inventory.get(s.selected)?.wear).toBe(1);
    let last = r;
    for (let i = 1; i < 59; i++) { s.fauna[0].hp = 100; last = attackFauna(s, 0); }
    expect(last.broken).toBe(true); expect(s.inventory.total(Item.ESPADA_MADEIRA)).toBe(0);
  });
});
