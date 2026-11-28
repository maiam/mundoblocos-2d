import { describe, expect, it } from 'vitest';
import { attackGrunho, damageOf } from '../combat';
import { GRUNHO, grunhoDrops, newGrunho } from '../grunho';
import { HOTBAR, BAG } from '../inventory';
import { isClub, isDagger, isItem, isSword, isTool, Item, ITEM_NAMES, maxStack, toolOf } from '../items';
import { craft, recipeById } from '../recipes';
import { MemoryTitanStorage } from '../save';
import { openSession } from '../session';
import { maxDurability, wearCost } from '../wear';
import { T } from '../voxel';
import { ORVALIS_GENERATOR_VERSION, OrvalisGenerator, orvalisGeneratorFor } from './generator';

/** Clava de Madeira do Orvalis (ADR 0148): item 177, dano 5, durabilidade 59, 3 tábuas + 2 hastes; o Grunho a solta com 25% de chance. */
const open = () => openSession(new MemoryTitanStorage(), 42, () => 1, orvalisGeneratorFor, ORVALIS_GENERATOR_VERSION, (s, v) => new OrvalisGenerator(s, v));
type S = Awaited<ReturnType<typeof open>>;
const hold = (s: S, item: number): void => { s.inventory.add(item, 1); const i = [...Array(HOTBAR + BAG).keys()].find((k) => s.inventory.get(k)?.item === item)!; s.selected = i; };

describe('clava de madeira (ADR 0148)', () => {
  it('item 177: nome, tipo clava (não espada nem adaga), nível madeira, pilha de 1, dano 5, durabilidade 59, desgaste como a espada', () => {
    expect(Item.CLAVA_MADEIRA).toBe(177); expect(isItem(177) && !isItem(178)).toBe(true); expect(ITEM_NAMES[177]).toBe('Clava de Madeira');
    expect(isTool(177)).toBe(true); expect(toolOf(177)).toEqual({ kind: 'club', tier: 'wood' }); expect(isClub(177) && !isSword(177) && !isDagger(177)).toBe(true);
    expect(maxStack(177)).toBe(1); expect(maxDurability(177)).toBe(59); expect(damageOf(177)).toBe(5);
    expect(wearCost(177, { type: 'attack' })).toBe(1); expect(wearCost(177, { type: 'break_block', block: T.STONE })).toBe(2); expect(wearCost(177, { type: 'break_block', block: T.LANTERN })).toBe(0);
  });

  it('receita na Mesa de Carpintaria (só no Orvalis): 3 tábuas de carvalho + 2 hastes', async () => {
    const s = await open(), r = recipeById('clava-madeira')!;
    expect(r.world).toBe('orvalis'); expect(r.station).toBe('workbench'); expect(r.result).toEqual({ item: Item.CLAVA_MADEIRA, count: 1 });
    expect(r.ingredients).toEqual([{ item: Item.TABUA_CARVALHO, count: 3 }, { item: Item.HASTE, count: 2 }]);
    s.inventory.add(Item.TABUA_CARVALHO, 3); s.inventory.add(Item.HASTE, 2);
    expect(craft(s.inventory, r, null)).toEqual({ ok: false, reason: 'station' });
    expect(craft(s.inventory, r, 'workbench').ok).toBe(true); expect(s.inventory.total(Item.CLAVA_MADEIRA)).toBe(1);
  });

  it('espólio do Grunho: 25% de chance, determinístico (mesmo goblin e instante dão o mesmo resultado) e nunca mais que 1 clava', () => {
    expect(GRUNHO.dropChance).toBe(0.25);
    let drops = 0; const N = 800;
    for (let i = 0; i < N; i++) {
      const g = newGrunho({ id: `g:t:${i}`, x: 10, y: 70, z: 10, campX: 10, campZ: 10 }, 42); g.clock = i * 0.37;
      const a = grunhoDrops(g, 42); expect(grunhoDrops(g, 42)).toEqual(a); expect(a.length).toBeLessThanOrEqual(1);
      if (a.length) { drops++; expect(a[0]).toEqual({ item: Item.CLAVA_MADEIRA, count: 1 }); }
    }
    expect(drops / N).toBeGreaterThan(0.18); expect(drops / N).toBeLessThan(0.32);
  });

  it('no jogo: a clava tira 5 do Grunho; ao abater, a clava cai no chão quando o sorteio dá, com a mensagem; sem sorteio, nada', async () => {
    const s = await open(); hold(s, Item.CLAVA_MADEIRA);
    let withDrop = 0, without = 0;
    for (let i = 0; i < 120 && (!withDrop || !without); i++) {
      const g = newGrunho({ id: `g:k:${i}`, x: 10, y: 70, z: 10, campX: 10, campZ: 10 }, 42); g.clock = i * 0.9; g.hp = 5; s.grunhos = [g];
      const before = s.drops.size, r = attackGrunho(s, 0, 'p');
      expect(r).toMatchObject({ ok: true, damage: 5, dead: true });
      if (grunhoDrops(g, 42).length) { withDrop++; expect(s.drops.size).toBe(before + 1); expect(r.msg).toContain('1 Clava de Madeira'); }
      else { without++; expect(s.drops.size).toBe(before); expect(r.msg).toBe('Grunho abatido'); }
    }
    expect(withDrop).toBeGreaterThan(0); expect(without).toBeGreaterThan(0);
  });
});
