import { describe, expect, it } from 'vitest';
import { breakOrCollect, collectItem, placeFromSlot } from './actions';
import { BREAK_MS, breakTotalMs } from './breaking';
import { TitanGenerator } from './generator';
import { Inventory } from './inventory';
import { blockOfItem, Item, itemOfBlock } from './items';
import { craft, RECIPES } from './recipes';
import { MemoryTitanStorage } from './save';
import { flush, openSession, visibleItems } from './session';
import { isSolid, T, tileFor } from './voxel';

const SEEDS = [1, 2, 7, 42, 99, 150];

describe('gerador v8: abrigos com placa de carapaça (ADR 0066)', () => {
  it('2 abrigos por seed: dois pilares de rocha a ±2 blocos, a placa no chão do vão, longe da toca, do cobre e das plantas; a v7 não tem', () => {
    for (const seed of SEEDS) {
      const g = new TitanGenerator(seed);
      expect(g.shelterSites).toHaveLength(2); expect(g.plates).toHaveLength(2);
      expect(new Set(g.plates.map((p) => p.id)).size).toBe(2);
      for (const s of g.shelterSites) {
        const t = g.column(s.x, s.z).top;
        expect(g.column(s.x - 2, s.z).top).toBeGreaterThan(t + 1); expect(g.column(s.x + 2, s.z).top).toBeGreaterThan(t + 1); // os pilares sobem acima do vão
        expect(g.column(s.x - 2, s.z).surface).toBe(T.DARK_ROCK); expect(g.column(s.x + 2, s.z).surface).toBe(T.DARK_ROCK);
        expect(g.copperSites.every((c) => Math.hypot(c.x - s.x, c.z - s.z) >= 14)).toBe(true);
        if (g.den) expect(Math.hypot(g.den.x - s.x, g.den.z - s.z)).toBeGreaterThanOrEqual(24); // fora do território do Farejador
        expect(g.nutPlants.every((p) => Math.hypot(p.x - s.x, p.z - s.z) >= 6)).toBe(true);
        expect(g.inRegion(s.x - 2, s.z) && g.inRegion(s.x + 2, s.z)).toBe(true);
      }
      for (const p of g.plates) {
        expect(g.blockAt(p.x, p.y, p.z)).toBe(T.AIR); expect(isSolid(g.blockAt(p.x, p.y - 1, p.z))).toBe(true); expect(p.id).toBe(`plate:${p.x},${p.y},${p.z}`); expect(p.item).toBe(Item.PLATE);
      }
      expect(new TitanGenerator(seed).plates).toEqual(g.plates);
    }
    for (const v of [5, 6, 7]) { const old = new TitanGenerator(42, v); expect(old.plates).toHaveLength(0); expect(old.shelterSites).toHaveLength(0); }
  });
  it('revestimento: tile e item, rocha no tempo de quebra, receita 1 placa + 1 rocha escura → 2 (mesa)', () => {
    expect(isSolid(T.CARAPACE)).toBe(true); expect(tileFor(T.CARAPACE, 'top')).toBe(15); expect(tileFor(T.CARAPACE, 'side')).toBe(15);
    expect(blockOfItem(Item.CARAPACE)).toBe(T.CARAPACE); expect(itemOfBlock(T.CARAPACE)).toBe(Item.CARAPACE); expect(breakTotalMs('block', T.CARAPACE)).toBe(BREAK_MS.rock);
    const r = RECIPES.find((x) => x.id === 'revestimento')!;
    expect(r.station).toBe('workbench'); expect(r.group).toBe('construcao'); expect(r.result).toEqual({ item: Item.CARAPACE, count: 2 });
    expect(r.ingredients).toEqual([{ item: Item.PLATE, count: 1 }, { item: Item.DARK_ROCK, count: 1 }]);
    const inv = Inventory.starting(); inv.add(Item.PLATE); inv.add(Item.DARK_ROCK);
    expect(craft(inv, r, null).reason).toBe('station');
    expect(craft(inv, r, 'workbench').ok).toBe(true); expect(inv.total(Item.CARAPACE)).toBe(2); expect(inv.total(Item.PLATE)).toBe(0);
  });
  it('fluxo: colhe a placa (some do chão, persiste), fabrica, coloca o revestimento e o recolhe de volta', async () => {
    const st = new MemoryTitanStorage();
    const s = await openSession(st, 42, () => 1);
    const p = s.volume.gen.plates[0];
    expect(s.items.at(p.x, p.y, p.z)).toBe(p.id); expect(visibleItems(s).some((i) => i.id === p.id && i.item === Item.PLATE)).toBe(true);
    expect(collectItem(s, p.id).ok).toBe(true); expect(s.inventory.total(Item.PLATE)).toBe(1);
    expect(collectItem(s, p.id).ok).toBe(false); expect(s.items.at(p.x, p.y, p.z)).toBeNull();
    s.inventory.add(Item.CARAPACE, 2);
    const slot = Array.from({ length: 9 }, (_, i) => i).find((i) => s.inventory.get(i)?.item === Item.CARAPACE)!;
    expect(s.volume.place(20, 150, 20, T.DARK_ROCK)).toBe(true);
    expect(placeFromSlot(s, { x: 20, y: 150, z: 20, nx: 0, ny: 1, nz: 0 }, slot).ok).toBe(true);
    expect(s.volume.get(20, 151, 20)).toBe(T.CARAPACE); expect(s.inventory.total(Item.CARAPACE)).toBe(1);
    await flush(st, s);
    const r = await openSession(st, null, () => 1);
    expect(r.volume.get(20, 151, 20)).toBe(T.CARAPACE); expect(r.items.at(p.x, p.y, p.z)).toBeNull();
    expect(breakOrCollect(r, { x: 20, y: 151, z: 20, nx: 0, ny: 1, nz: 0 }).ok).toBe(true); expect(r.inventory.total(Item.CARAPACE)).toBe(2);
  });
});
