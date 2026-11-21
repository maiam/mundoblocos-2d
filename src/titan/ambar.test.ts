import { describe, expect, it } from 'vitest';
import { amberYield, breakOrCollect } from './actions';
import { breakTotalMs } from './breaking';
import { FUEL_TIME_S, prepsLeft, newFurnace, tickFurnace } from './furnace';
import { TitanGenerator } from './generator';
import { blockOfItem, Item, itemOfBlock } from './items';
import { mulberry32 } from '../world/random';
import { veinCells } from './ores';
import { craft, recipeById } from './recipes';
import { MemoryTitanStorage } from './save';
import { openSession } from './session';
import { T, Y_MIN } from './voxel';
import { sweep } from './dropTestUtil';

const slotOf = (s: { inventory: { get(i: number): { item: number } | null } }, item: number): number => Array.from({ length: 9 }, (_, i) => i).find((i) => s.inventory.get(i)?.item === item)!;

describe('Brasa de Âmbar como combustível comum (ADR 0073, gerador v11)', () => {
  it('4 depósitos acessíveis a pé nos 4 × 4 chunks iniciais, afastados entre si e cada um com juncos por perto (em várias seeds); a v10 só tem 1', () => {
    for (const seed of [42, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]) {
      const g = new TitanGenerator(seed, 11);
      expect(g.emberSites.length).toBe(4);
      expect(g.emberSite).toEqual(g.emberSites[0]);
      for (const e of g.emberSites) {
        expect(Math.abs(e.x) <= 30 && Math.abs(e.z) <= 30).toBe(true);
        expect(g.blockAt(e.x, e.y, e.z)).toBe(T.EMBER);
        expect(g.reeds.some((r) => Math.hypot(r.x - e.x, r.z - e.z) <= 6)).toBe(true); // o junco de vidro ajuda a achar a brasa
        expect(g.reeds.every((r) => Math.abs(r.x - e.x) > 1 || Math.abs(r.z - e.z) > 1)).toBe(true); // a passagem em volta fica livre
      }
      for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) expect(Math.hypot(g.emberSites[i].x - g.emberSites[j].x, g.emberSites[i].z - g.emberSites[j].z)).toBeGreaterThanOrEqual(5);
    }
    expect(new TitanGenerator(42, 10).emberSites).toHaveLength(1); expect(new TitanGenerator(42, 3).emberSites).toHaveLength(0);
  });
  it('veios de âmbar têm de 3 a 8 blocos; existem enterrados na v11 e não na v10', () => {
    const sizes = new Set<number>();
    for (let i = 0; i < 400; i++) sizes.add(veinCells(mulberry32(i + 1), 0, 0, 0, { blockId: T.EMBER_VEIN, veinsPerChunk: 1, veinSize: 3, veinSizeMax: 8, minY: 0, maxY: 0, airDiscardChance: 0 }, () => true, () => false).length);
    expect(Math.min(...sizes)).toBe(3); expect(Math.max(...sizes)).toBe(8);
    const count = (v: number): number => { const g = new TitanGenerator(42, v); let n = 0; for (let x = -64; x < 64; x++) for (let z = -64; z < 64; z++) for (let y = Y_MIN + 1; y < g.column(x, z).top - 3; y++) if (g.blockAt(x, y, z) === T.EMBER_VEIN) n++; return n; };
    expect(count(11)).toBeGreaterThan(150); expect(count(10)).toBe(0);
  });
  it('há sempre um veio de âmbar garantido perto da chegada, sob a superfície e alcançável cavando', () => {
    for (const seed of [42, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]) {
      const g = new TitanGenerator(seed, 11), a = g.arrival;
      expect(g.amberGuaranteed.length).toBeGreaterThanOrEqual(4);
      for (const c of g.amberGuaranteed) {
        expect(g.blockAt(c.x, c.y, c.z)).toBe(T.EMBER_VEIN);
        expect(Math.hypot(c.x - a.x, c.z - a.z)).toBeLessThanOrEqual(22);
        expect(c.y).toBeLessThan(g.column(c.x, c.z).top - 3); expect(c.y).toBeGreaterThan(g.column(c.x, c.z).top - 22);
      }
    }
    expect(new TitanGenerator(42, 10).amberGuaranteed).toHaveLength(0);
  });
  it('o veio só cede à picareta e solta 1–2 brasas no chão (nunca o bloco); depósito rende 1', async () => {
    const s = await openSession(new MemoryTitanStorage(), 42, () => 1);
    const [x, y, z] = [10, 150, 10];
    s.volume.place(x, y, z, T.EMBER_VEIN);
    expect(breakTotalMs('block', T.EMBER_VEIN, false)).toBeNull(); expect(breakTotalMs('block', T.EMBER_VEIN, 'rock')).toBeGreaterThan(0);
    expect(breakOrCollect(s, { x, y, z, nx: 0, ny: 1, nz: 0 })).toMatchObject({ ok: false, msg: 'Só pó nos dedos. Falta uma picareta.' });
    expect(s.volume.get(x, y, z)).toBe(T.EMBER_VEIN);
    s.inventory.add(Item.STONE_PICK); s.selected = slotOf(s, Item.STONE_PICK);
    expect(breakOrCollect(s, { x, y, z, nx: 0, ny: 1, nz: 0 }).ok).toBe(true);
    const d = [...s.drops.values()].find((e) => e.item === Item.EMBER)!;
    expect(d.count ?? 1).toBe(amberYield(x, y, z)); expect(s.inventory.total(Item.EMBER_BLOCK)).toBe(0); expect(s.volume.get(x, y, z)).toBe(T.AIR);
    const counts = new Set(Array.from({ length: 60 }, (_, i) => amberYield(i, 7, 3)));
    expect([...counts].sort()).toEqual([1, 2]);
    s.volume.place(x + 2, y, z, T.EMBER);
    expect(breakOrCollect(s, { x: x + 2, y, z, nx: 0, ny: 1, nz: 0 }).ok).toBe(true);
    expect([...s.drops.values()].filter((e) => e.item === Item.EMBER && e.x === x + 2).map((e) => e.count ?? 1)).toEqual([1]);
  });
  it('Bloco de Âmbar Compactado: 9 brasas ↔ 1 bloco, colocável e combustível de 36 preparações', async () => {
    const s = await openSession(new MemoryTitanStorage(), 42, () => 1);
    s.inventory.add(Item.EMBER, 9);
    expect(craft(s.inventory, recipeById('ambar-compactado')!, 'workbench')).toEqual({ ok: true, reason: 'ok' });
    expect(s.inventory.total(Item.EMBER)).toBe(0); expect(s.inventory.total(Item.EMBER_BLOCK)).toBe(1);
    expect(blockOfItem(Item.EMBER_BLOCK)).toBe(T.EMBER_BLOCK); expect(itemOfBlock(T.EMBER_BLOCK)).toBe(Item.EMBER_BLOCK);
    const [x, y, z] = [12, 150, 12];
    s.volume.place(x, y, z, T.EMBER_BLOCK); s.inventory.consume(slotOf(s, Item.EMBER_BLOCK));
    expect(breakOrCollect(s, { x, y, z, nx: 0, ny: 1, nz: 0 }).ok).toBe(true); sweep(s); expect(s.inventory.total(Item.EMBER_BLOCK)).toBe(1); // desmontável de volta
    expect(craft(s.inventory, recipeById('ambar-desmontar')!, 'workbench').ok).toBe(true); expect(s.inventory.total(Item.EMBER)).toBe(9); expect(s.inventory.total(Item.EMBER_BLOCK)).toBe(0);
    expect(FUEL_TIME_S[Item.EMBER_BLOCK]).toBe(9 * FUEL_TIME_S[Item.EMBER]); // o mesmo rendimento das 9 unidades
    const f = newFurnace(); f.fuel = { item: Item.EMBER_BLOCK, count: 1 }; f.input = { item: Item.RAW_MEAT, count: 1 }; tickFurnace(f, 0.1);
    expect(prepsLeft(f)).toBe(36);
  });
});
