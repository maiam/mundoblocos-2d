import { describe, expect, it } from 'vitest';
import { breakOrCollect, placeFromSlot } from '../actions';
import { blockOfItem, isItem, Item, ITEM_NAMES, itemOfBlock, maxStack } from '../items';
import { craft, recipeById } from '../recipes';
import { MemoryTitanStorage } from '../save';
import { openSession } from '../session';
import { blocksLight, CAMPFIRE_LIGHT, isCampfire, isFull, isSolid, isTarget, lightLevelOf, modelOf, T, T_MAX } from '../voxel';
import { HOTBAR, BAG } from '../inventory';
import { ORVALIS_GENERATOR_VERSION, OrvalisGenerator, orvalisGeneratorFor } from './generator';

/** Fogueira do Orvalis (ADR 0146): bloco de modelo (não sólido, alvo da mira, luz 15), item 176 fabricável na Mesa de Carpintaria, em pé sobre um chão firme. */
const open = () => openSession(new MemoryTitanStorage(), 42, () => 1, orvalisGeneratorFor, ORVALIS_GENERATOR_VERSION, (s, v) => new OrvalisGenerator(s, v));
type S = Awaited<ReturnType<typeof open>>;
const hold = (s: S, item: number): void => { s.inventory.add(item, 1); const i = [...Array(HOTBAR + BAG).keys()].find((k) => s.inventory.get(k)?.item === item)!; s.selected = i; };
const top = (x: number, y: number, z: number) => ({ x, y, z, nx: 0, ny: 1, nz: 0 });

describe('fogueira do Orvalis (ADR 0146)', () => {
  it('bloco 424 e item 176: modelo, luz 15, não sólida, alvo da mira, não bloqueia luz, ida e volta item ↔ bloco', () => {
    expect(T.CAMPFIRE).toBe(424); expect(T_MAX).toBeGreaterThanOrEqual(424); expect(Item.FOGUEIRA).toBe(176);
    expect(isCampfire(T.CAMPFIRE)).toBe(true); expect(isItem(176) && isItem(177) && isItem(178) && !isItem(179)).toBe(true);
    expect(ITEM_NAMES[176]).toBe('Fogueira'); expect(maxStack(176)).toBeGreaterThan(1);
    expect(modelOf(T.CAMPFIRE)).toEqual({ kind: 'fogueira', turn: 0 });
    expect(lightLevelOf(T.CAMPFIRE)).toBe(CAMPFIRE_LIGHT); expect(CAMPFIRE_LIGHT).toBe(15);
    expect(isSolid(T.CAMPFIRE)).toBe(false); expect(isTarget(T.CAMPFIRE)).toBe(true); expect(isFull(T.CAMPFIRE)).toBe(false); expect(blocksLight(T.CAMPFIRE)).toBe(false);
    expect(blockOfItem(Item.FOGUEIRA)).toBe(T.CAMPFIRE); expect(itemOfBlock(T.CAMPFIRE)).toBe(Item.FOGUEIRA);
  });

  it('receita na Mesa de Carpintaria (só no Orvalis): 3 hastes + 1 carvão vegetal + 3 troncos de carvalho', async () => {
    const s = await open(), r = recipeById('fogueira')!;
    expect(r.world).toBe('orvalis'); expect(r.station).toBe('workbench'); expect(r.result).toEqual({ item: Item.FOGUEIRA, count: 1 });
    expect(r.ingredients).toEqual([{ item: Item.HASTE, count: 3 }, { item: Item.CARVAO_VEGETAL, count: 1 }, { item: Item.LOG_OAK, count: 3 }]);
    s.inventory.add(Item.HASTE, 3); s.inventory.add(Item.CARVAO_VEGETAL, 1); s.inventory.add(Item.LOG_OAK, 3);
    expect(craft(s.inventory, r, null)).toEqual({ ok: false, reason: 'station' });
    expect(craft(s.inventory, r, 'workbench').ok).toBe(true); expect(s.inventory.total(Item.FOGUEIRA)).toBe(1);
  });

  it('no jogo: só em pé sobre chão firme; o emissor acende a luz; quebrar devolve a fogueira; sem o apoio ela cai como item', async () => {
    const s = await open(), v = s.volume, a = v.gen.arrival, x = Math.floor(a.x) + 5, z = Math.floor(a.z), y = a.y - 1;
    v.set(x, y, z, T.STONE); v.set(x, y + 1, z, T.AIR); v.set(x + 2, y, z, T.LEAVES_OAK); v.set(x + 2, y + 1, z, T.AIR);
    hold(s, Item.FOGUEIRA);
    expect(placeFromSlot(s, { ...top(x, y, z), ny: -1 }, s.selected).ok).toBe(false); // por baixo, não
    expect(placeFromSlot(s, top(x + 2, y, z), s.selected).ok).toBe(false); // sobre folhas, não
    expect(placeFromSlot(s, top(x, y, z), s.selected).ok).toBe(true);
    expect(v.get(x, y + 1, z)).toBe(T.CAMPFIRE); expect(v.light(x, y + 1, z)).toBe(15); expect(v.light(x + 3, y + 1, z)).toBeGreaterThan(0);
    // quebrar devolve a própria fogueira
    expect(breakOrCollect(s, { x, y: y + 1, z, nx: 0, ny: 1, nz: 0 }).ok).toBe(true); expect(v.get(x, y + 1, z)).toBe(T.AIR);
    // reposta e sem o apoio: ela cai como item solto
    hold(s, Item.FOGUEIRA); const drops0 = s.drops.size;
    expect(placeFromSlot(s, top(x, y, z), s.selected).ok).toBe(true); expect(v.get(x, y + 1, z)).toBe(T.CAMPFIRE);
    expect(breakOrCollect(s, top(x, y, z)).ok).toBe(true);
    expect(v.get(x, y + 1, z)).toBe(T.AIR); expect(s.drops.size).toBeGreaterThan(drops0);
  });
});
